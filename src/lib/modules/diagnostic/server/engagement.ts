/**
 * Engagement lifecycle (plan Workstream 5).
 *
 * Every function takes the branded `OperationContext` and constrains both
 * `brand_id` and `organisation_id`. An engagement for another brand is a miss,
 * never a disclosure.
 *
 * Creation is idempotent on the work item: the work item id is derived from the
 * brand, the product and the exact intake, so re-submitting the same intake
 * resumes the existing engagement instead of commissioning a second one. A
 * genuinely different reading — a later date, a different question — hashes
 * differently and is a new engagement.
 */

import { createHash } from 'node:crypto';
import { getDB } from '#lib/platform/database/db.js';
import { assertOperationContext, type OperationContext } from '#lib/modules/tenancy/server/context.js';
import { getVariant, parseIntake, type SignalIntake } from '../shared/registry.js';
import { requireStartPayment } from './payments.js';

const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : value);

export type EngagementStatus =
	| 'enquired'
	| 'scoped'
	| 'quoted'
	| 'invoiced'
	| 'paid'
	| 'in_delivery'
	| 'delivered'
	| 'declined'
	| 'withdrawn'
	| 'awaiting_input'
	| 'quality_hold'
	| 'retrying'
	| 'failed'
	| 'ready';

export interface Engagement {
	id: string;
	workItemId: string;
	productKey: string;
	family: string;
	depth: string;
	deliveryRoute: string;
	status: EngagementStatus;
	/** The declared intake, as submitted. Shape is per variant. */
	intake: Record<string, unknown>;
	dataClassification: string;
	engineRunRef: string | null;
	commissionedDecision: string | null;
	decisionOwner: string | null;
	intendedReader: string | null;
	decisionTiming: string | null;
	currency: string | null;
	amountMinor: number | null;
	purchaseId: string | null;
	entitlementId: string | null;
	engineJobId: string | null;
	engineSessionId: number | null;
	engineDecisionRecordVersionId: number | null;
	sectorIntelligenceRef: string | null;
	sectorIntelligenceVersionId: number | null;
	qualityReceipt: Record<string, unknown> | null;
	retryCount: number;
	nextRetryAt: string | null;
	failureCode: string | null;
	failureDetail: string | null;
	deliveredAt: string | null;
	scopeApprovedAt: string | null;
	scopeApprovedBy: string | null;
	createdAt: string;
	updatedAt: string;
}

interface EngagementRow {
	id: string;
	workItemId: string;
	productKey: string;
	family: string;
	depth: string;
	deliveryRoute: string;
	status: EngagementStatus;
	intake: Record<string, unknown>;
	dataClassification: string;
	engineRunRef: string | null;
	commissionedDecision: string | null;
	decisionOwner: string | null;
	intendedReader: string | null;
	decisionTiming: string | null;
	currency: string | null;
	amountMinor: number | null;
	purchaseId: string | null;
	entitlementId: string | null;
	engineJobId: string | null;
	engineSessionId: number | null;
	engineDecisionRecordVersionId: number | null;
	sectorIntelligenceRef: string | null;
	sectorIntelligenceVersionId: number | null;
	qualityReceipt: Record<string, unknown> | null;
	retryCount: number;
	nextRetryAt: Date | string | null;
	failureCode: string | null;
	failureDetail: string | null;
	deliveredAt: Date | string | null;
	scopeApprovedAt: Date | string | null;
	scopeApprovedBy: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

const COLUMNS = `"id", "work_item_id" AS "workItemId", "product_key" AS "productKey",
	        "family", "depth", "delivery_route" AS "deliveryRoute",
	        "status", "intake", "data_classification" AS "dataClassification",
	        "engine_run_ref" AS "engineRunRef", "commissioned_decision" AS "commissionedDecision",
	        "decision_owner" AS "decisionOwner", "intended_reader" AS "intendedReader",
	        "decision_timing" AS "decisionTiming", "currency", "amount_minor" AS "amountMinor",
	        "purchase_id" AS "purchaseId", "entitlement_id" AS "entitlementId",
	        "engine_job_id" AS "engineJobId", "engine_session_id" AS "engineSessionId",
	        "engine_decision_record_version_id" AS "engineDecisionRecordVersionId",
	        "sector_intelligence_ref" AS "sectorIntelligenceRef",
	        "sector_intelligence_version_id" AS "sectorIntelligenceVersionId",
	        "quality_receipt" AS "qualityReceipt", "retry_count" AS "retryCount",
	        "next_retry_at" AS "nextRetryAt", "failure_code" AS "failureCode",
	        "failure_detail" AS "failureDetail", "delivered_at" AS "deliveredAt",
	        "scope_approved_at" AS "scopeApprovedAt", "scope_approved_by" AS "scopeApprovedBy",
	        "created_at" AS "createdAt", "updated_at" AS "updatedAt"`;

const toEngagement = (row: EngagementRow): Engagement => ({
	...row,
	nextRetryAt: row.nextRetryAt ? iso(row.nextRetryAt) : null,
	deliveredAt: row.deliveredAt ? iso(row.deliveredAt) : null,
	scopeApprovedAt: row.scopeApprovedAt ? iso(row.scopeApprovedAt) : null,
	createdAt: iso(row.createdAt),
	updatedAt: iso(row.updatedAt)
});

/** Order-insensitive so the same intake in a different key order resumes. */
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
		return `{${entries.join(',')}}`;
	}
	return JSON.stringify(value);
}

export function deriveWorkItemId(brandId: string, productKey: string, intake: unknown): string {
	return `wi_${createHash('sha256').update(`${brandId}|${productKey}|${canonical(intake)}`).digest('hex').slice(0, 32)}`;
}

export type StartEngagementResult =
	| { status: 'started'; engagement: Engagement }
	| { status: 'resumed'; engagement: Engagement };

/**
 * Start a Signal engagement from a submitted intake, or resume the one this
 * intake already produced.
 */
export async function startEngagement(
	ctx: OperationContext,
	payload: { productKey: string; intake: unknown },
): Promise<StartEngagementResult> {
	assertOperationContext(ctx);
	const variant = getVariant(payload.productKey);
	if (!variant) throw new Error(`Unknown diagnostic variant: ${payload.productKey}`);
	if (!variant.sellable) throw new Error(`${variant.name} has no intake yet.`);

	const intake = parseIntake(payload.productKey, payload.intake);
	if (!intake) throw new Error(`${variant.name} has no intake yet.`);

	// Self-service work starts only after a live entitlement, backed by an
	// activated purchase where the entitlement came from a purchase. An issued
	// invoice or an initiated payment does not satisfy this.
	const payment =
		variant.deliveryRoute === 'montsel_self_service'
			? await requireStartPayment(ctx, variant.key)
			: null;

	const workItemId = deriveWorkItemId(ctx.brandId, variant.key, intake);
	const db = await getDB();
	const client = await db.connect();
	try {
		await client.query('BEGIN');

		const existing = await client.query<EngagementRow>(
			`SELECT ${COLUMNS} FROM "diagnostic_engagement"
			 WHERE "work_item_id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
			 FOR UPDATE`,
			[workItemId, ctx.brandId, ctx.organisationId],
		);
		if (existing.rows[0]) {
			await client.query('COMMIT');
			return { status: 'resumed', engagement: toEngagement(existing.rows[0]) };
		}

		const engagementId = `eng_${workItemId.slice(3)}`;
		await client.query(
			`INSERT INTO "work_item" ("id", "organisation_id", "brand_id", "product_key",
			                          "created_by", "title", "state", "current_step_key",
			                          "current_step_label", "steps_completed", "steps_total",
			                          "resume_path", "started_at", "last_activity_at")
			 VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', 'intake', 'Intake', 1, 2, $7, now(), now())`,
			[
				workItemId,
				ctx.organisationId,
				ctx.brandId,
				variant.key,
				ctx.userId,
				`${variant.name} — ${new URL(intake.subjectUrl).hostname}`,
				`/app/workflow/${variant.key}`
			],
		);

		const inserted = await client.query<EngagementRow>(
			`INSERT INTO "diagnostic_engagement" ("id", "organisation_id", "brand_id", "work_item_id",
			                                      "product_key", "family", "depth", "delivery_route",
			                                      "status", "intake", "requested_by",
			                                      "commissioned_decision", "decision_owner",
			                                      "intended_reader", "decision_timing",
			                                      "purchase_id", "entitlement_id")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enquired', $9, $10, $11, $12, $13, $14, $15, $16)
			 RETURNING ${COLUMNS}`,
			[
				engagementId,
				ctx.organisationId,
				ctx.brandId,
				workItemId,
				variant.key,
				variant.family,
				variant.depth,
				variant.deliveryRoute,
				JSON.stringify(intake),
				ctx.userId,
				intake.commissionedDecision,
				intake.decisionOwner,
				intake.intendedReader,
				intake.decisionTiming,
				payment?.purchaseId ?? null,
				payment?.entitlementId ?? null
			],
		);
		await client.query('COMMIT');
		return { status: 'started', engagement: toEngagement(inserted.rows[0]!) };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/** One engagement in the context brand. Another brand's id is a miss. */
export async function getEngagement(
	ctx: OperationContext,
	engagementId: string,
): Promise<Engagement | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<EngagementRow>(
		`SELECT ${COLUMNS} FROM "diagnostic_engagement"
		 WHERE "id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		 LIMIT 1`,
		[engagementId, ctx.brandId, ctx.organisationId],
	);
	return rows[0] ? toEngagement(rows[0]) : null;
}

/** The current engagement for a variant in the context brand, newest first. */
export async function findCurrentEngagement(
	ctx: OperationContext,
	productKey: string,
): Promise<Engagement | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<EngagementRow>(
		`SELECT ${COLUMNS} FROM "diagnostic_engagement"
		 WHERE "product_key" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		   AND "status" NOT IN ('declined', 'withdrawn')
		 ORDER BY "created_at" DESC
		 LIMIT 1`,
		[productKey, ctx.brandId, ctx.organisationId],
	);
	return rows[0] ? toEngagement(rows[0]) : null;
}

export async function listEngagements(ctx: OperationContext, limit = 50): Promise<Engagement[]> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<EngagementRow>(
		`SELECT ${COLUMNS} FROM "diagnostic_engagement"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2
		 ORDER BY "created_at" DESC
		 LIMIT $3`,
		[ctx.brandId, ctx.organisationId, Math.min(limit, 200)],
	);
	return rows.map(toEngagement);
}

/**
 * Withdraw an engagement. Delivered work is not withdrawable: the client holds
 * the report, and the record has to keep matching what they hold.
 */
export async function cancelEngagement(
	ctx: OperationContext,
	engagementId: string,
): Promise<Engagement | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<EngagementRow>(
		`UPDATE "diagnostic_engagement"
		 SET "status" = 'withdrawn'
		 WHERE "id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		   AND "status" NOT IN ('delivered', 'in_delivery')
		 RETURNING ${COLUMNS}`,
		[engagementId, ctx.brandId, ctx.organisationId],
	);
	return rows[0] ? toEngagement(rows[0]) : null;
}
