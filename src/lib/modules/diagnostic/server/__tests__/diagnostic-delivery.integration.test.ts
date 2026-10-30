/**
 * Diagnostic delivery — full lifecycle against a simulated engine.
 *
 * Runs only when a disposable database is supplied, so the default suite is
 * unaffected:
 *
 *   docker run -d --rm --name montsel-signal-verify \
 *     -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_signal_delivery_verify \
 *     -p 127.0.0.1:55442:5432 postgres:16
 *
 *   MONTSEL_SIGNAL_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55442/montsel_signal_delivery_verify \
 *     bunx vitest run src/lib/modules/diagnostic/server/__tests__/diagnostic-delivery.integration.test.ts --project server
 *
 * Proves, with no Stripe, no customer data and no production database:
 *   - an intermediate engine state does not settle the run
 *   - a publishing delay is survived and the report is imported once published
 *   - `delivered` is written only after quality passes and the hash matches
 *   - review_required settles without importing
 *   - a failed quality check parks the engagement and imports nothing
 *   - a hash mismatch leaves the engagement retryable, then recoverable
 *   - an approved run is published by the application, not by a consultant
 *   - a judgement state is refused rather than fabricated
 *   - a lost dispatch is recovered, and the buyer is notified exactly once
 *   - the scheduled sweep advances work nobody opened a page for
 *   - Gap and Direction carry their full field groups to the engine and deliver
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OperationContext } from '#lib/modules/tenancy/server/context.js';
import {
	closeDisposableDatabase,
	prepareDisposableDatabase,
	type DisposableDatabase
} from '../../../../../../scripts/diagnostic/disposable-db.ts';
import { sha256, startFakeEngine, type FakeEngine } from './fake-engine.js';

const databaseUrl = process.env.MONTSEL_SIGNAL_VERIFY_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('diagnostic delivery', () => {
	let engine: FakeEngine;
	let database: DisposableDatabase;
	let ctx: OperationContext;
	let modules: {
		startEngagement: typeof import('../engagement.js').startEngagement;
		getEngagement: typeof import('../engagement.js').getEngagement;
		startDiagnosticRun: typeof import('../orchestration.js').startDiagnosticRun;
		syncDiagnosticRun: typeof import('../orchestration.js').syncDiagnosticRun;
		pollUntilSettled: typeof import('../polling.js').pollUntilSettled;
		advanceEngagement: typeof import('../automation.js').advanceEngagement;
		reconcile: typeof import('../automation.js').reconcileSelfServiceEngagements;
	};

	beforeAll(async () => {
		engine = await startFakeEngine();
		process.env.DIAGNOSTIC_ENGINE_URL = engine.baseUrl;
		process.env.DIAGNOSTIC_ENGINE_TOKEN = 'verification-token-not-a-secret-0123456789';

		const { configureDatabase } = await import('#lib/platform/database/db.js');
		configureDatabase(databaseUrl!);

		database = await prepareDisposableDatabase(databaseUrl!, 21);

		const { requireBrandAccess } = await import('#lib/modules/tenancy/server/context.js');
		ctx = await requireBrandAccess(database.pilot.userId, database.pilot.brandId, 'brand:read');

		// Operator grants, not purchases: no Stripe, no customer, no payment row.
		for (const key of ['diagnostic.signal', 'diagnostic.gap', 'diagnostic.direction']) {
			await database.pool.query(
				`INSERT INTO "product_entitlement"
				   ("id", "organisation_id", "brand_id", "product_key", "source", "status")
				 VALUES ($1, $2, $3, $4, 'grant', 'active')`,
				[
					`ent_verify_${key.replace('diagnostic.', '')}`,
					database.pilot.organisationId,
					database.pilot.brandId,
					key
				]
			);
		}

		const engagement = await import('#lib/modules/diagnostic/server/engagement.js');
		const orchestration = await import('#lib/modules/diagnostic/server/orchestration.js');
		const polling = await import('#lib/modules/diagnostic/server/polling.js');
		const automation = await import('#lib/modules/diagnostic/server/automation.js');

		modules = {
			startEngagement: engagement.startEngagement,
			getEngagement: engagement.getEngagement,
			startDiagnosticRun: orchestration.startDiagnosticRun,
			syncDiagnosticRun: orchestration.syncDiagnosticRun,
			pollUntilSettled: polling.pollUntilSettled,
			advanceEngagement: automation.advanceEngagement,
			reconcile: automation.reconcileSelfServiceEngagements
		};
	}, 180_000);

	afterAll(async () => {
		if (database) await closeDisposableDatabase(database);
		if (engine) await engine.close();
	}, 30_000);

	const frame = {
		subjectUrl: 'https://example.test',
		decisionOwner: 'Managing director',
		intendedReader: 'Board',
		decisionTiming: 'Before the autumn planning round'
	};

	async function commission(productKey: string, decision: string, extra = {}) {
		const started = await modules.startEngagement(ctx, {
			productKey,
			intake: { ...frame, ...extra, commissionedDecision: decision }
		});
		expect(started.status).toBe('started');
		return started.engagement.id;
	}

	const outputCount = async (): Promise<number> =>
		Number(
			(await database.pool.query<{ n: string }>('SELECT count(*) AS n FROM "output"')).rows[0]!.n
		);

	describe('signal lifecycle', () => {
		it('does not settle on automation_ready, and imports once published', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the current public material reads as a credible engineering partner.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			engine.job(run.jobId).status = 'automation_ready';

			const before = await outputCount();
			const synced = await modules.syncDiagnosticRun(engagementId);
			const engagement = await modules.getEngagement(ctx, engagementId);

			expect(engagement?.status).toBe('in_delivery');
			expect(synced.status.engagement).not.toBe('delivered');
			expect(await outputCount()).toBe(before);

			engine.job(run.jobId).status = 'published';
			const published = await modules.syncDiagnosticRun(engagementId);
			const delivered = await modules.getEngagement(ctx, engagementId);

			expect(published.status.engagement).toBe('delivered');
			expect(published.outputId).toBeTruthy();
			expect(delivered?.status).toBe('delivered');
			expect(delivered?.deliveredAt).not.toBeNull();

			const hashes = (
				await database.pool.query<{ content_hash: string }>(
					'SELECT "content_hash" FROM "output_version"'
				)
			).rows.map((row) => row.content_hash);
			expect(hashes).toContain(sha256(engine.job(run.jobId).content));
		}, 30_000);

		it('survives a publishing delay through the poll loop', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the site supports a move into larger contracts.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const script = ['automation_ready', 'automation_ready', 'published'];
			let step = 0;
			engine.job(run.jobId).status = script[0]!;

			const outcome = await modules.pollUntilSettled(
				() => modules.syncDiagnosticRun(engagementId),
				{ engagementId, status: run.status, intake: null },
				{
					deadlineMs: 60_000,
					intervalMs: 0,
					sleep: async () => {
						step = Math.min(step + 1, script.length - 1);
						engine.job(run.jobId).status = script[step]!;
					}
				}
			);

			expect(outcome.timedOut).toBe(false);
			expect(outcome.last.status.engagement).toBe('delivered');
			expect(outcome.polls).toBeGreaterThanOrEqual(3);
		}, 30_000);

		it('settles on review_required without importing', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the tone matches the buyers we want.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			engine.job(run.jobId).status = 'review_required';

			const before = await outputCount();
			const outcome = await modules.pollUntilSettled(
				() => modules.syncDiagnosticRun(engagementId),
				{ engagementId, status: run.status, intake: null },
				{ deadlineMs: 60_000, intervalMs: 0, sleep: async () => {} }
			);
			const engagement = await modules.getEngagement(ctx, engagementId);

			expect(outcome.timedOut).toBe(false);
			expect(await outputCount()).toBe(before);
			expect(engagement?.status).toBe('ready');
			expect(engagement?.deliveredAt).toBeNull();
		}, 30_000);

		it('parks the engagement when a quality check fails', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the current material is worth rewriting.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const job = engine.job(run.jobId);
			job.status = 'published';
			job.checks = [
				{ key: 'source_bounded', passed: true, detail: 'ok' },
				{ key: 'claims_supported', passed: false, detail: 'Two claims lack a source.' }
			];

			const before = await outputCount();
			await modules.syncDiagnosticRun(engagementId);
			const engagement = await modules.getEngagement(ctx, engagementId);

			expect(engagement?.status).toBe('quality_hold');
			expect(engagement?.failureCode).toBe('quality_gate');
			expect(await outputCount()).toBe(before);
		}, 30_000);

		it('leaves a hash mismatch retryable, then recovers', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the current homepage should be replaced.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const job = engine.job(run.jobId);
			job.status = 'published';
			job.claimedHash = sha256('different bytes entirely');

			const before = await outputCount();
			await modules.syncDiagnosticRun(engagementId);
			const failed = await modules.getEngagement(ctx, engagementId);

			expect(failed?.status).toBe('retrying');
			expect(failed?.failureCode).toBe('hash_mismatch');
			expect(failed?.deliveredAt).toBeNull();
			expect(await outputCount()).toBe(before);

			job.claimedHash = sha256(job.content);
			const retried = await modules.syncDiagnosticRun(engagementId);
			const recovered = await modules.getEngagement(ctx, engagementId);

			expect(retried.status.engagement).toBe('delivered');
			expect(recovered?.status).toBe('delivered');
		}, 30_000);
	});

	describe('self-service automation', () => {
		it('publishes at the automated gate without a consultant', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the automated gate should release this reading.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			// The engine publishes a self-service run from `automation_ready`.
			engine.job(run.jobId).status = 'automation_ready';

			const sent: string[] = [];
			const result = await modules.advanceEngagement(engagementId, {
				deadlineMs: 5_000,
				intervalMs: 0,
				notify: async (_engagement, email) => {
					sent.push(email);
				}
			});

			expect(result.outcome).toBe('delivered');
			expect(engine.job(run.jobId).actions).toContain('publish_report');
			expect(sent).toHaveLength(1);
		}, 30_000);

		it('refuses to fabricate a judgement at review_required', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether a reviewer would approve this reading.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			engine.job(run.jobId).status = 'review_required';

			const sent: string[] = [];
			const result = await modules.advanceEngagement(engagementId, {
				deadlineMs: 5_000,
				intervalMs: 0,
				notify: async (_engagement, email) => {
					sent.push(email);
				}
			});

			expect(result.outcome).toBe('awaiting_human');
			expect(engine.job(run.jobId).actions).toEqual([]);
			expect(sent).toHaveLength(0);
		}, 30_000);

		it('recovers an engagement whose dispatch was lost, and notifies once', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether a lost dispatch can be recovered automatically.',
				{ declaredScope: ['homepage'] }
			);
			// No startDiagnosticRun: models the dispatch that never happened.
			engine.newJobStatus = 'published';

			const sent: string[] = [];
			const notify = async (_engagement: unknown, email: string): Promise<void> => {
				sent.push(email);
			};

			try {
				const result = await modules.advanceEngagement(engagementId, {
					deadlineMs: 5_000,
					intervalMs: 0,
					notify
				});

				expect(result.outcome).toBe('delivered');
				if (result.outcome !== 'delivered') return;
				expect(result.notified).toBe(true);
				expect(sent).toHaveLength(1);

				// A second advance must not send a second notice.
				const again = await modules.advanceEngagement(engagementId, {
					deadlineMs: 5_000,
					intervalMs: 0,
					notify
				});
				expect(again.outcome).toBe('delivered');
				expect(sent).toHaveLength(1);
			} finally {
				engine.newJobStatus = 'queued';
			}
		}, 30_000);

		it('advances a retrying engagement on the scheduled sweep', async () => {
			const engagementId = await commission(
				'diagnostic.signal',
				'Whether the sweep picks up work nobody opened.',
				{ declaredScope: ['homepage'] }
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const job = engine.job(run.jobId);
			job.status = 'published';
			job.claimedHash = sha256('stale bytes');

			await modules.syncDiagnosticRun(engagementId);
			expect((await modules.getEngagement(ctx, engagementId))?.status).toBe('retrying');

			job.claimedHash = sha256(job.content);
			const summary = await modules.reconcile({
				limit: 25,
				deadlineMs: 5_000,
				intervalMs: 0,
				notify: async () => {}
			});

			expect(summary.examined).toBeGreaterThan(0);
			expect((await modules.getEngagement(ctx, engagementId))?.status).toBe('delivered');
		}, 30_000);
	});

	describe('family coverage', () => {
		it('delivers Gap with its own field group', async () => {
			const engagementId = await commission(
				'diagnostic.gap',
				'Whether the evidence supports a move upmarket.',
				{
					sectorRef: 'manufacturing',
					geography: 'GB',
					buyerInput: 'Procurement-led engineering managers',
					organisationalIntent: 'Win larger contracts with longer cycles',
					availableProof: 'Two ISO certifications and three case studies',
					evidenceScope: 'Homepage and linked pages'
				}
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const sent = engine.job(run.jobId).intake ?? {};

			expect(sent.reportFamily).toBe('gap');
			expect(sent.sectorIntelligenceRef).toBe('manufacturing');
			expect(sent.buyerInput).toBe('Procurement-led engineering managers');
			expect(sent.availableProof).toContain('ISO');
			expect(sent.organisationalIntent).toContain('larger contracts');

			engine.job(run.jobId).status = 'published';
			const synced = await modules.syncDiagnosticRun(engagementId);
			expect(synced.status.engagement).toBe('delivered');
		}, 30_000);

		it('delivers Direction with its own field group', async () => {
			const engagementId = await commission(
				'diagnostic.direction',
				'Whether to approve the agency proposal as presented.',
				{
					sectorRef: 'manufacturing',
					buyerInput: 'Procurement-led engineering managers',
					decisionContext: 'Agency proposal for a rebrand and website',
					proposedDirection: 'Reposition as a premium engineering partner for larger contracts',
					proposalVersion: 'v3',
					constraints: 'Existing brand equity and a fixed launch window',
					claimSupport: 'Two reference customers and one sector award',
					expectedCommitment: '75000 GBP',
					currentEvidence: 'Current site and sales collateral',
					readinessEvidence: 'Internal capacity to support a larger pipeline',
					evidenceScope: 'Homepage and linked pages'
				}
			);
			const run = await modules.startDiagnosticRun(engagementId);
			const sent = engine.job(run.jobId).intake ?? {};

			expect(sent.reportFamily).toBe('direction');
			expect(sent.proposedDirection).toContain('premium engineering partner');
			expect(sent.proposalVersion).toBe('v3');
			expect(sent.expectedCommitment).toBe('75000 GBP');
			expect(sent.claimSupport).toContain('reference customers');
			expect(sent.sectorIntelligenceRef).toBe('manufacturing');

			engine.job(run.jobId).status = 'published';
			const synced = await modules.syncDiagnosticRun(engagementId);
			expect(synced.status.engagement).toBe('delivered');
		}, 30_000);
	});
});
