/**
 * Diagnostic orchestration.
 *
 * The app owns the engagement; the engine owns the run. This module is the
 * only bridge. It never inspects evidence or decides a finding: it starts an
 * intake, maps the engine's state onto the engagement, and imports the exact
 * published bytes after the engine's quality gates pass.
 *
 * It is callable from a SvelteKit server action and from the Trigger.dev Node
 * worker. The worker passes no tenant scope because it resolves the engagement
 * by id; every app caller passes the branded `OperationContext` fields.
 */

import { getDB } from '#lib/platform/database/db.js';
import { findBrandRow } from '#lib/modules/tenancy/server/context.js';
import { isProductKey, type ProductKey } from '#lib/modules/products/shared/registry.js';
import {
	createIntake,
	getIntake,
	getPublication,
	getQuality,
	type EngineIntakeView
} from './engine.js';
import { importPublishedBytes, type ImportedSection } from './import.js';
import {
	retryingStatus,
	statusForEngagement,
	statusFromIntake,
	type DeliveryStatus
} from './status.js';

export interface EngagementScope {
	organisationId: string;
	brandId: string;
	userId: string | null;
}

interface EngagementRow {
	id: string;
	organisationId: string;
	brandId: string;
	productKey: string;
	family: string;
	deliveryRoute: string;
	status: string;
	intake: Record<string, unknown>;
	engineJobId: string | null;
	engineRunRef: string | null;
	deliveredAt: Date | string | null;
}

async function loadEngagement(
	engagementId: string,
	scope?: EngagementScope
): Promise<EngagementRow | null> {
	const db = await getDB();
	const { rows } = scope
		? await db.query<EngagementRow>(
				`SELECT "id", "organisation_id" AS "organisationId", "brand_id" AS "brandId",
				        "product_key" AS "productKey", "family", "delivery_route" AS "deliveryRoute",
				        "status", "intake", "engine_job_id" AS "engineJobId",
				        "engine_run_ref" AS "engineRunRef", "delivered_at" AS "deliveredAt"
				 FROM "diagnostic_engagement"
				 WHERE "id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
				 LIMIT 1`,
				[engagementId, scope.brandId, scope.organisationId]
			)
		: await db.query<EngagementRow>(
				`SELECT "id", "organisation_id" AS "organisationId", "brand_id" AS "brandId",
				        "product_key" AS "productKey", "family", "delivery_route" AS "deliveryRoute",
				        "status", "intake", "engine_job_id" AS "engineJobId",
				        "engine_run_ref" AS "engineRunRef", "delivered_at" AS "deliveredAt"
				 FROM "diagnostic_engagement"
				 WHERE "id" = $1
				 LIMIT 1`,
				[engagementId]
			);
	return rows[0] ?? null;
}

async function brandIdentity(brandId: string, organisationId: string) {
	const brand = await findBrandRow(brandId);
	// The brand table belongs to the tenancy layer; a brand outside the
	// engagement's organisation is not this engagement's to name.
	if (!brand || brand.organisationId !== organisationId) {
		throw new Error('The engagement brand is unavailable.');
	}
	return { name: brand.name, slug: brand.slug };
}

function text(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function listText(value: unknown): string {
	if (Array.isArray(value))
		return value.filter((item): item is string => typeof item === 'string').join(', ');
	return text(value);
}

function buildEngineIntake(
	engagement: EngagementRow,
	brand: { name: string; slug: string }
): Record<string, unknown> {
	const intake = engagement.intake;
	const selfService = engagement.deliveryRoute === 'montsel_self_service';
	const base: Record<string, unknown> = {
		organisationName: brand.name,
		website: text(intake.subjectUrl, text(intake.website)),
		brandSlug: brand.slug,
		reportFamily: engagement.family,
		deliveryRoute: engagement.deliveryRoute,
		decision: text(intake.commissionedDecision, text(intake.decision)),
		decisionOwner: text(intake.decisionOwner),
		intendedReader: text(intake.intendedReader),
		decisionTiming: text(intake.decisionTiming),
		evidenceScope: listText(intake.declaredScope) || text(intake.evidenceScope, 'Homepage and linked pages'),
		maxPages: 10,
		maxReviewBatches: 10,
		maxModelCalls: 20,
		providerPermission: true,
		engagementKind: 'client_confirmed',
		provenanceClass: selfService ? 'buyer_supplied' : 'analyst_interpretation',
		dataClassification: 'client_confidential',
		engagementSource: selfService
			? 'Customer submitted this intake in the Montsel application.'
			: 'Consultant recorded this intake; buyer-supplied fields remain labelled individually.'
	};

	if (engagement.family === 'gap') {
		return {
			...base,
			buyerInput: text(intake.buyerInput),
			organisationalIntent: text(intake.organisationalIntent),
			availableProof: text(intake.availableProof),
			geography: text(intake.geography),
			sectorIntelligenceRef: text(intake.sectorIntelligenceRef, text(intake.sectorRef))
		};
	}
	if (engagement.family === 'direction') {
		return {
			...base,
			buyerInput: text(intake.buyerInput),
			decisionContext: text(intake.decisionContext),
			sectorIntelligenceRef: text(intake.sectorIntelligenceRef, text(intake.sectorRef)),
			proposedDirection: text(intake.proposedDirection),
			proposalVersion: text(intake.proposalVersion),
			constraints: text(intake.constraints),
			claimSupport: text(intake.claimSupport),
			expectedCommitment: text(intake.expectedCommitment),
			currentEvidence: text(intake.currentEvidence),
			readinessEvidence: text(intake.readinessEvidence)
		};
	}
	return base;
}

async function recordEvent(args: {
	engagementId: string;
	engineRunId: string | null;
	status: string;
	stage: string | null;
	message: string;
}) {
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

async function updateEngagement(args: {
	engagementId: string;
	status?: string;
	engineJobId?: string | null;
	engineRunRef?: string | null;
	failureCode?: string | null;
	failureDetail?: string | null;
	qualityReceipt?: unknown;
	deliveredAt?: Date | null;
}) {
	const db = await getDB();
	const sets: string[] = [];
	const values: unknown[] = [];
	const add = (sql: string, value: unknown) => {
		values.push(value);
		sets.push(`${sql} = $${values.length}`);
	};
	if (args.status !== undefined) add('"status"', args.status);
	if (args.engineJobId !== undefined) add('"engine_job_id"', args.engineJobId);
	if (args.engineRunRef !== undefined) add('"engine_run_ref"', args.engineRunRef);
	if (args.failureCode !== undefined) add('"failure_code"', args.failureCode);
	if (args.failureDetail !== undefined) add('"failure_detail"', args.failureDetail);
	if (args.qualityReceipt !== undefined)
		add('"quality_receipt"', JSON.stringify(args.qualityReceipt));
	if (args.deliveredAt !== undefined) add('"delivered_at"', args.deliveredAt);
	if (sets.length === 0) return;
	values.push(args.engagementId);
	await db.query(
		`UPDATE "diagnostic_engagement"
		 SET ${sets.join(', ')}, "updated_at" = now()
		 WHERE "id" = $${values.length}`,
		values
	);
}

export interface StartRunResult {
	engagementId: string;
	jobId: string;
	status: DeliveryStatus;
}

export async function startDiagnosticRun(
	engagementId: string,
	scope?: EngagementScope
): Promise<StartRunResult> {
	const engagement = await loadEngagement(engagementId, scope);
	if (!engagement) throw new Error('Engagement unavailable.');
	if (engagement.engineJobId) {
		return {
			engagementId,
			jobId: engagement.engineJobId,
			status: statusFromIntake('running')
		};
	}
	const brand = await brandIdentity(engagement.brandId, engagement.organisationId);
	const intake = buildEngineIntake(engagement, brand);
	const created = await createIntake(intake);
	await updateEngagement({
		engagementId,
		status: 'in_delivery',
		engineJobId: created.jobId,
		failureCode: null,
		failureDetail: null
	});
	await recordEvent({
		engagementId,
		engineRunId: null,
		status: created.status,
		stage: created.stage,
		message: created.message
	});
	return {
		engagementId,
		jobId: created.jobId,
		status: statusFromIntake(created.status)
	};
}

export interface SyncRunResult {
	engagementId: string;
	status: DeliveryStatus;
	intake: EngineIntakeView | null;
	outputId?: string;
}

export async function syncDiagnosticRun(
	engagementId: string,
	scope?: EngagementScope
): Promise<SyncRunResult> {
	const engagement = await loadEngagement(engagementId, scope);
	if (!engagement) throw new Error('Engagement unavailable.');
	if (!engagement.engineJobId)
		throw new Error('This engagement has no engine job yet.');
	if (engagement.deliveredAt)
		return {
			engagementId,
			status: statusFromIntake('published'),
			intake: null
		};

	const intake = await getIntake(engagement.engineJobId);
	const state = (intake.state ?? {}) as Record<string, unknown>;
	const runPublicId =
		typeof state.productionRunPublicId === 'string'
			? state.productionRunPublicId
			: engagement.engineRunRef;
	const mapped = statusFromIntake(intake.status);

	await updateEngagement({
		engagementId,
		status: mapped.engagement,
		...(runPublicId ? { engineRunRef: runPublicId } : {}),
		...(mapped.engagement === 'failed' || mapped.engagement === 'quality_hold'
			? {
					failureCode: intake.status,
					failureDetail: intake.message
				}
			: { failureCode: null, failureDetail: null })
	});
	await recordEvent({
		engagementId,
		engineRunId: runPublicId ?? null,
		status: intake.status,
		stage: intake.stage,
		message: intake.message
	});

	if (intake.status !== 'published' || !runPublicId)
		return { engagementId, status: mapped, intake };

	// The report is published. Import is the only step that may set `delivered`,
	// and it may still refuse. A refusal must be visible and retryable rather
	// than leaving the engagement looking finished.
	let outcome: ImportOutcome;
	try {
		outcome = await importDeliveredReport(engagement, runPublicId);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		const code = /hash/i.test(detail)
			? 'hash_mismatch'
			: /publication/i.test(detail)
				? 'missing_publication'
				: 'import_failed';
		await updateEngagement({
			engagementId,
			status: 'retrying',
			failureCode: code,
			failureDetail: detail
		});
		await recordEvent({
			engagementId,
			engineRunId: runPublicId,
			status: code,
			stage: 'import',
			message: detail
		});
		return { engagementId, status: retryingStatus(detail), intake };
	}

	if (outcome.status === 'quality_hold')
		return {
			engagementId,
			status: statusForEngagement('quality_hold', outcome.reason, 'attention'),
			intake
		};

	return {
		engagementId,
		status: statusForEngagement(
			'delivered',
			'The report was published, passed its quality checks and imported with a verified hash.',
			'success'
		),
		intake,
		outputId: outcome.outputId
	};
}

/**
 * The checks a quality receipt failed. Empty means the run may be imported.
 *
 * Pure, and exported, so the refusal rule can be tested without an engine.
 */
export function failedQualityChecks(receipt: {
	checks: Array<{ key: string; passed: boolean; detail: string }>;
}): Array<{ key: string; passed: boolean; detail: string }> {
	return receipt.checks.filter((check) => !check.passed);
}

/**
 * `delivered` is written only after the quality receipt passes and the bytes
 * hash-match. A quality refusal returns rather than throws, because it is a
 * settled outcome; an import fault throws, because it is retryable.
 */
type ImportOutcome =
	| { status: 'delivered'; outputId: string }
	| { status: 'quality_hold'; reason: string };

async function importDeliveredReport(
	engagement: EngagementRow,
	runPublicId: string
): Promise<ImportOutcome> {
	if (!isProductKey(engagement.productKey))
		throw new Error(`Unknown product key on the engagement: ${engagement.productKey}`);
	const quality = await getQuality(runPublicId);
	const failed = failedQualityChecks(quality);
	if (failed.length > 0) {
		await updateEngagement({
			engagementId: engagement.id,
			status: 'quality_hold',
			qualityReceipt: quality,
			failureCode: 'quality_gate',
			failureDetail: failed.map((check) => `${check.key}: ${check.detail}`).join(' ')
		});
		return {
			status: 'quality_hold',
			reason: failed.map((check) => `${check.key}: ${check.detail}`).join(' ')
		};
	}
	if (!quality.publication)
		throw new Error('The engine reports a published run with no publication record.');

	const publication = await getPublication(runPublicId);
	const bytes = Buffer.from(publication.contentBase64, 'base64');
	const sections: ImportedSection[] = publication.sections.map((section) => ({
		key: section.key,
		heading: section.heading,
		order: section.order
	}));
	const outputId = `out_${runPublicId}`;
	await importPublishedBytes({
		organisationId: engagement.organisationId,
		brandId: engagement.brandId,
		outputId,
		productKey: engagement.productKey as ProductKey,
		title: `${engagement.family} report`,
		content: bytes,
		expectedContentHash: publication.contentHash,
		enginePublicationRef: runPublicId,
		sections
	});
	await updateEngagement({
		engagementId: engagement.id,
		status: 'delivered',
		engineRunRef: runPublicId,
		qualityReceipt: quality,
		deliveredAt: new Date(),
		failureCode: null,
		failureDetail: null
	});
	await recordEvent({
		engagementId: engagement.id,
		engineRunId: runPublicId,
		status: 'delivered',
		stage: 'import',
		message: 'Published report imported and hash-verified.'
	});
	return { status: 'delivered', outputId };
}
