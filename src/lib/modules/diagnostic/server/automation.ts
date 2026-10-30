/**
 * Self-service automation.
 *
 * The application owns the engagement; the engine owns the run. This module
 * decides what the application does when a self-service run is sitting in a
 * state that will not advance on its own, and it notifies the buyer once the
 * report has been imported.
 *
 * It holds no prompt, rule or score. Every decision is a mapping from the
 * engine's own published state to one of four moves:
 *
 *   wait     — the engine is still working; polling is enough
 *   release  — the engine approved the report and is waiting to publish it;
 *              publication is mechanical, so the application requests it
 *   settled  — nothing further is required from the application
 *   refuse   — the engine wants a judgement the application must not invent
 *
 * The `refuse` branch is the boundary. Automating `accept_analysis`,
 * `review_report` or a decision-record approval would mean fabricating a human
 * judgement, which is exactly the consultant sign-off the self-service product
 * says it does not use. Those states are reported, never manufactured.
 */

import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';
import { runIntakeAction } from './engine.js';
import { startDiagnosticRun, syncDiagnosticRun } from './orchestration.js';
import { pollUntilSettled, DEFAULT_DEADLINE_MS, DEFAULT_INTERVAL_MS } from './polling.js';
import { isTerminalEngagement, isTerminalIntake, statusFromIntake } from './status.js';
import type { EngagementStatus } from './engagement.js';

export type SelfServiceAction = 'wait' | 'release' | 'settled' | 'refuse';

/**
 * What the application should do about a self-service run in this engine state.
 *
 * The engine publishes a self-service run from `automation_ready`, not from
 * `approved`. `review-publication/service.ts` computes
 * `expected = software ? "automation_ready" : "approved"` and refuses to
 * publish a self-service run in any other state. `approved` only arises for
 * consultancy runs, which have already passed a human review event.
 *
 * So `automation_ready` is the state the application must act on. Leaving it
 * unhandled is what made "no consultant sign-off" untrue: the run sat at the
 * automated gate until the poll timed out.
 *
 * `review_required` is refused rather than released. For a self-service run the
 * engine will not accept a human review event either
 * (`service.ts`: "Self-service uses automated checks, not a human review
 * event"), so that state means the automated gate failed and needs a human
 * decision the application must not invent.
 */
export function selfServiceAction(engineStatus: string): SelfServiceAction {
	switch (engineStatus) {
		case 'automation_ready':
			return 'release';
		case 'review_required':
		case 'needs_analysis_review':
		case 'needs_decision_record':
			return 'refuse';
		default:
			return isTerminalIntake(engineStatus) ? 'settled' : 'wait';
	}
}

export interface AdvanceOptions {
	/** Total time the whole advance may spend polling. */
	deadlineMs?: number;
	intervalMs?: number;
	/** How many `publish_report` requests may be issued before giving up. */
	maxReleases?: number;
	/** Test seam. Defaults to the transactional email provider. */
	notify?: (engagement: AutomationEngagement, email: string) => Promise<void>;
}

export type AdvanceResult =
	| { outcome: 'delivered'; engagement: AutomationEngagement; notified: boolean }
	| { outcome: 'terminal'; engagement: AutomationEngagement; reason: string }
	| { outcome: 'awaiting_human'; engagement: AutomationEngagement; reason: string }
	| { outcome: 'timed_out'; engagement: AutomationEngagement; polls: number }
	| { outcome: 'blocked'; engagement: AutomationEngagement; reason: string };

/**
 * The columns this module needs. Deliberately narrower than `Engagement`: the
 * supervisor never reads the intake, and selecting it would widen the blast
 * radius of a log line.
 */
export interface AutomationEngagement {
	id: string;
	productKey: string;
	family: string;
	deliveryRoute: string;
	status: EngagementStatus;
	engineJobId: string | null;
	engineRunRef: string | null;
	failureCode: string | null;
	deliveredAt: string | null;
	requestedBy: string | null;
}

const ENGAGEMENT_COLUMNS = `"id", "product_key" AS "productKey", "family",
	"delivery_route" AS "deliveryRoute", "status", "engine_job_id" AS "engineJobId",
	"engine_run_ref" AS "engineRunRef", "failure_code" AS "failureCode",
	"requested_by" AS "requestedBy", "delivered_at" AS "deliveredAt"`;

/** Unscoped by design: the worker and the reconciler act on an engagement id. */
async function loadEngagement(engagementId: string): Promise<AutomationEngagement | null> {
	const db = await getDB();
	const { rows } = await db.query<AutomationEngagement>(
		`SELECT ${ENGAGEMENT_COLUMNS} FROM "diagnostic_engagement" WHERE "id" = $1 LIMIT 1`,
		[engagementId]
	);
	return rows[0] ?? null;
}

async function recordEvent(args: {
	engagementId: string;
	engineRunId: string | null;
	status: string;
	stage: string;
	message: string;
}): Promise<void> {
	const db = await getDB();
	await db.query(
		`INSERT INTO "diagnostic_run_event"
		   ("id", "engagement_id", "engine_run_id", "status", "stage", "message")
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		[
			`evt_${crypto.randomUUID()}`,
			args.engagementId,
			args.engineRunId,
			args.status,
			args.stage,
			args.message
		]
	);
}

async function alreadyNotified(engagementId: string): Promise<boolean> {
	const db = await getDB();
	const { rows } = await db.query(
		`SELECT 1 FROM "diagnostic_run_event"
		 WHERE "engagement_id" = $1 AND "status" = 'delivered_notified' LIMIT 1`,
		[engagementId]
	);
	return rows.length > 0;
}

async function recipientEmail(engagement: AutomationEngagement): Promise<string | null> {
	if (!engagement.requestedBy) return null;
	const db = await getDB();
	const { rows } = await db.query<{ email: string | null }>(
		'SELECT "email" FROM "user" WHERE "id" = $1 LIMIT 1',
		[engagement.requestedBy]
	);
	return rows[0]?.email ?? null;
}

/** The default sender: a transactional notification pointing at the report. */
async function sendDeliveryEmail(engagement: AutomationEngagement, email: string): Promise<void> {
	const { sendTemplateEmail, isEmailInitialized } = await import(
		'#lib/modules/auth/server/email/index.js'
	);
	if (!isEmailInitialized()) {
		logger.warn('[diagnostic] delivery email skipped: provider not initialised', {
			engagementId: engagement.id
		});
		return;
	}
	await sendTemplateEmail('notification', {
		email,
		title: 'Your diagnostic report is ready',
		message:
			'The report you commissioned has been published and is ready to read. It is available in your Montsel account under Documents.',
		actionUrl: `/app/diagnostic/${engagement.id}`,
		actionText: 'Open the report'
	});
}

/**
 * Tell the buyer the report is ready, at most once.
 *
 * Idempotency is a `delivered_notified` run event rather than a column: the
 * event table is already append-only and already read by the engagement page.
 */
export async function notifyDelivery(
	engagement: AutomationEngagement,
	notify?: AdvanceOptions['notify']
): Promise<boolean> {
	if (await alreadyNotified(engagement.id)) return false;

	const email = await recipientEmail(engagement);
	if (!email) {
		logger.warn('[diagnostic] delivery email skipped: no requester address', {
			engagementId: engagement.id
		});
		return false;
	}

	await (notify ?? sendDeliveryEmail)(engagement, email);
	await recordEvent({
		engagementId: engagement.id,
		engineRunId: engagement.engineRunRef,
		status: 'delivered_notified',
		stage: 'notify',
		message: `Delivery notice sent to the requester.`
	});
	return true;
}

/**
 * Drive one engagement as far as the application legitimately can.
 *
 * Recovery is part of the job: an engagement whose dispatch was lost has no
 * engine job, and one whose import failed is `retrying`. Both are advanced here
 * rather than waiting for a consultant.
 */
export async function advanceEngagement(
	engagementId: string,
	options: AdvanceOptions = {}
): Promise<AdvanceResult> {
	const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
	const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
	const maxReleases = options.maxReleases ?? 2;

	let row = await loadEngagement(engagementId);
	if (!row) throw new Error(`Engagement unavailable: ${engagementId}`);

	if (row.status === 'delivered') {
		const notified = await notifyDelivery(row, options.notify);
		return { outcome: 'delivered', engagement: row, notified };
	}

	if (isTerminalEngagement(row.status))
		return {
			outcome: 'terminal',
			engagement: row,
			reason: row.failureCode ?? row.status
		};

	// Recovery: a paid engagement whose dispatch was lost never got a job.
	if (!row.engineJobId) {
		await startDiagnosticRun(engagementId);
		await recordEvent({
			engagementId,
			engineRunId: null,
			status: 'recovered',
			stage: 'dispatch',
			message: 'No engine job existed; the run was started by the automation supervisor.'
		});
		row = (await loadEngagement(engagementId)) ?? row;
	}

	let releases = 0;

	for (;;) {
		const polled = await pollUntilSettled(
			() => syncDiagnosticRun(engagementId),
			{ engagementId, status: statusFromIntake('queued'), intake: null },
			{
				deadlineMs,
				intervalMs,
				// `approved` needs a publication request, not more waiting.
				stopWhen: (sync) => selfServiceAction(sync.intake?.status ?? '') === 'release'
			}
		);

		row = (await loadEngagement(engagementId)) ?? row;

		if (row.status === 'delivered') {
			const notified = await notifyDelivery(row, options.notify);
			return { outcome: 'delivered', engagement: row, notified };
		}

		if (isTerminalEngagement(row.status))
			return {
				outcome: 'terminal',
				engagement: row,
				reason: row.failureCode ?? row.status
			};

		const engineStatus = polled.last.intake?.status ?? '';
		const action = selfServiceAction(engineStatus);

		if (action === 'release') {
			if (releases >= maxReleases)
				return {
					outcome: 'blocked',
					engagement: row,
					reason: `The engine remained at ${engineStatus} after ${releases} publication requests.`
				};
			if (!row.engineJobId)
				return {
					outcome: 'blocked',
					engagement: row,
					reason: 'The engine approved a report but no engine job is recorded.'
				};

			await runIntakeAction(row.engineJobId, 'publish_report');
			await recordEvent({
				engagementId,
				engineRunId: row.engineRunRef,
				status: 'publication_requested',
				stage: 'automation',
				message: `Requested publication for an approved self-service run (${engineStatus}).`
			});
			releases += 1;
			continue;
		}

		if (action === 'refuse')
			return {
				outcome: 'awaiting_human',
				engagement: row,
				reason: `The engine requires a judgement at ${engineStatus}; the application does not fabricate one.`
			};

		if (polled.timedOut)
			return { outcome: 'timed_out', engagement: row, polls: polled.polls };

		return {
			outcome: 'blocked',
			engagement: row,
			reason: `The run did not settle; the engine last reported ${engineStatus || 'no status'}.`
		};
	}
}

export interface ReconcileSummary {
	examined: number;
	delivered: number;
	awaitingHuman: number;
	timedOut: number;
	terminal: number;
	blocked: number;
}

/**
 * Engagements that still owe the buyer something. Terminal states are excluded
 * so a sweep never reopens finished work.
 */
export async function listEngagementsNeedingAttention(limit = 25): Promise<string[]> {
	const db = await getDB();
	const { rows } = await db.query<{ id: string }>(
		`SELECT "id" FROM "diagnostic_engagement"
		 WHERE "delivery_route" = 'montsel_self_service'
		   AND "status" IN ('enquired', 'in_delivery', 'ready', 'retrying')
		 ORDER BY "updated_at" ASC
		 LIMIT $1`,
		[Math.min(limit, 100)]
	);
	return rows.map((row) => row.id);
}

/**
 * One sweep of the self-service queue. Called by the scheduled task and safe to
 * run repeatedly: every step is idempotent and every terminal state is skipped.
 */
export async function reconcileSelfServiceEngagements(
	options: AdvanceOptions & { limit?: number } = {}
): Promise<ReconcileSummary> {
	const summary: ReconcileSummary = {
		examined: 0,
		delivered: 0,
		awaitingHuman: 0,
		timedOut: 0,
		terminal: 0,
		blocked: 0
	};

	for (const engagementId of await listEngagementsNeedingAttention(options.limit)) {
		summary.examined += 1;
		try {
			const result = await advanceEngagement(engagementId, options);
			if (result.outcome === 'delivered') summary.delivered += 1;
			else if (result.outcome === 'awaiting_human') summary.awaitingHuman += 1;
			else if (result.outcome === 'timed_out') summary.timedOut += 1;
			else if (result.outcome === 'terminal') summary.terminal += 1;
			else summary.blocked += 1;
		} catch (error) {
			summary.blocked += 1;
			logger.error('[diagnostic] reconciliation failed for one engagement', {
				engagementId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	return summary;
}
