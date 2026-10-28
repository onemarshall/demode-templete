/**
 * Context-required product repositories (decision D2, specification §6.3).
 *
 * Every function takes the branded `OperationContext` as its first argument and
 * constrains both `brand_id` and `organisation_id`. A caller cannot query one
 * brand's work, outputs or entitlements with another brand's context.
 */

import { getDB } from '#lib/platform/database/db.js';
import {
	assertOperationContext,
	type OperationContext
} from '#lib/modules/tenancy/server/context.js';
import type { ProductFamily, OutputFormat, ProductKey } from '../shared/registry.js';
import { isProductKey } from '../shared/registry.js';
import type { EntitlementRecord, WorkItemView, WorkState } from '../shared/access.js';

export interface OutputRecord {
	id: string;
	productKey: ProductKey;
	workItemId: string | null;
	title: string;
	format: OutputFormat;
	shareSlug: string | null;
	canView: boolean;
	canShare: boolean;
	canDownload: boolean;
	createdAt: string;
}

export interface ApprovalRecord {
	id: string;
	workItemId: string;
	stepKey: string;
	state: 'requested' | 'approved' | 'rejected';
	requestedAt: string;
}

const iso = (value: Date | string | null): string | null =>
	value === null ? null : value instanceof Date ? value.toISOString() : value;

/** Live entitlements for the context brand. Revoked and expired rows are never returned. */
export async function listBrandEntitlements(ctx: OperationContext): Promise<EntitlementRecord[]> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		productKey: string;
		status: EntitlementRecord['status'];
		effectiveFrom: Date | string;
		effectiveTo: Date | string | null;
	}>(
		`SELECT "product_key" AS "productKey", "status",
		        "effective_from" AS "effectiveFrom", "effective_to" AS "effectiveTo"
		 FROM "product_entitlement"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2
		   AND "status" = 'active'
		   AND "effective_from" <= now()
		   AND ("effective_to" IS NULL OR "effective_to" > now())`,
		[ctx.brandId, ctx.organisationId],
	);
	return rows
		.filter((row) => isProductKey(row.productKey))
		.map((row) => ({
			productKey: row.productKey as ProductKey,
			status: row.status,
			effectiveFrom: iso(row.effectiveFrom) ?? '',
			effectiveTo: iso(row.effectiveTo)
		}));
}

/** Every work item in the context brand, most recently active first. */
export async function listBrandWorkItems(ctx: OperationContext): Promise<WorkItemView[]> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		productKey: string;
		title: string | null;
		state: WorkState;
		currentStepKey: string | null;
		currentStepLabel: string | null;
		stepsCompleted: number;
		stepsTotal: number | null;
		resumePath: string | null;
		startedAt: Date | string | null;
		lastActivityAt: Date | string | null;
		completedAt: Date | string | null;
	}>(
		`SELECT "id", "product_key" AS "productKey", "title", "state",
		        "current_step_key" AS "currentStepKey", "current_step_label" AS "currentStepLabel",
		        "steps_completed" AS "stepsCompleted", "steps_total" AS "stepsTotal",
		        "resume_path" AS "resumePath", "started_at" AS "startedAt",
		        "last_activity_at" AS "lastActivityAt", "completed_at" AS "completedAt"
		 FROM "work_item"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2
		 ORDER BY COALESCE("last_activity_at", "created_at") DESC`,
		[ctx.brandId, ctx.organisationId],
	);
	return rows
		.filter((row) => isProductKey(row.productKey))
		.map((row) => ({
			id: row.id,
			productKey: row.productKey as ProductKey,
			title: row.title,
			state: row.state,
			currentStepKey: row.currentStepKey,
			currentStepLabel: row.currentStepLabel,
			stepsCompleted: row.stepsCompleted,
			stepsTotal: row.stepsTotal,
			resumePath: row.resumePath,
			startedAt: iso(row.startedAt),
			lastActivityAt: iso(row.lastActivityAt),
			completedAt: iso(row.completedAt)
		}));
}

export interface OutputFilter {
	productKey?: ProductKey;
	family?: ProductFamily;
	search?: string;
	sort?: 'newest' | 'oldest' | 'title';
	limit?: number;
}

const OUTPUT_ORDER: Record<NonNullable<OutputFilter['sort']>, string> = {
	newest: 'o."created_at" DESC',
	oldest: 'o."created_at" ASC',
	title: 'o."title" ASC'
};

/**
 * Outputs for the context brand. Filtering happens in the query so the
 * Documents page never receives another brand's rows (§8 invariant 1).
 */
export async function listBrandOutputs(
	ctx: OperationContext,
	filter: OutputFilter = {},
): Promise<OutputRecord[]> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		productKey: string;
		workItemId: string | null;
		title: string;
		format: OutputFormat;
		shareSlug: string | null;
		canView: boolean;
		canShare: boolean;
		canDownload: boolean;
		createdAt: Date | string;
	}>(
		`SELECT o."id", o."product_key" AS "productKey", o."work_item_id" AS "workItemId",
		        o."title", o."format", o."share_slug" AS "shareSlug",
		        o."can_view" AS "canView", o."can_share" AS "canShare",
		        o."can_download" AS "canDownload", o."created_at" AS "createdAt"
		 FROM "output" o
		 JOIN "product" p ON p."key" = o."product_key"
		 WHERE o."brand_id" = $1 AND o."organisation_id" = $2
		   AND ($3::text IS NULL OR o."product_key" = $3)
		   AND ($4::text IS NULL OR p."family" = $4)
		   AND ($5::text IS NULL OR o."title" ILIKE '%' || $5 || '%')
		 ORDER BY ${OUTPUT_ORDER[filter.sort ?? 'newest']}
		 LIMIT $6`,
		[
			ctx.brandId,
			ctx.organisationId,
			filter.productKey ?? null,
			filter.family ?? null,
			filter.search?.trim() || null,
			Math.min(filter.limit ?? 50, 200)
		],
	);
	return rows
		.filter((row) => isProductKey(row.productKey))
		.map((row) => ({
			id: row.id,
			productKey: row.productKey as ProductKey,
			workItemId: row.workItemId,
			title: row.title,
			format: row.format,
			shareSlug: row.shareSlug,
			canView: row.canView,
			canShare: row.canShare,
			canDownload: row.canDownload,
			createdAt: iso(row.createdAt) ?? ''
		}));
}

/** Output counts per product family for the Documents category cards. */
export async function countBrandOutputs(
	ctx: OperationContext,
): Promise<Record<ProductFamily, number>> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{ family: ProductFamily; count: number }>(
		`SELECT p."family", count(*)::int AS "count"
		 FROM "output" o
		 JOIN "product" p ON p."key" = o."product_key"
		 WHERE o."brand_id" = $1 AND o."organisation_id" = $2
		 GROUP BY p."family"`,
		[ctx.brandId, ctx.organisationId],
	);
	const counts: Record<ProductFamily, number> = { diagnostic: 0, strategy: 0, tool: 0 };
	for (const row of rows) {
		if (row.family in counts) counts[row.family] = row.count;
	}
	return counts;
}

/** One output, scoped to the context brand. A mismatched brand is a miss, not a disclosure. */
export async function findBrandOutput(
	ctx: OperationContext,
	outputId: string,
): Promise<OutputRecord | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		productKey: string;
		workItemId: string | null;
		title: string;
		format: OutputFormat;
		shareSlug: string | null;
		canView: boolean;
		canShare: boolean;
		canDownload: boolean;
		createdAt: Date | string;
	}>(
		`SELECT "id", "product_key" AS "productKey", "work_item_id" AS "workItemId",
		        "title", "format", "share_slug" AS "shareSlug",
		        "can_view" AS "canView", "can_share" AS "canShare",
		        "can_download" AS "canDownload", "created_at" AS "createdAt"
		 FROM "output"
		 WHERE "id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		 LIMIT 1`,
		[outputId, ctx.brandId, ctx.organisationId],
	);
	const row = rows[0];
	if (!row || !isProductKey(row.productKey)) return null;
	return {
		id: row.id,
		productKey: row.productKey as ProductKey,
		workItemId: row.workItemId,
		title: row.title,
		format: row.format,
		shareSlug: row.shareSlug,
		canView: row.canView,
		canShare: row.canShare,
		canDownload: row.canDownload,
		createdAt: iso(row.createdAt) ?? ''
	};
}

/** Approvals still awaiting a decision in the context brand. */
export async function listPendingApprovals(ctx: OperationContext): Promise<ApprovalRecord[]> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		workItemId: string;
		stepKey: string;
		state: ApprovalRecord['state'];
		requestedAt: Date | string;
	}>(
		`SELECT "id", "work_item_id" AS "workItemId", "step_key" AS "stepKey",
		        "state", "requested_at" AS "requestedAt"
		 FROM "approval"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2 AND "state" = 'requested'
		 ORDER BY "requested_at" ASC`,
		[ctx.brandId, ctx.organisationId],
	);
	return rows.map((row) => ({
		id: row.id,
		workItemId: row.workItemId,
		stepKey: row.stepKey,
		state: row.state,
		requestedAt: iso(row.requestedAt) ?? ''
	}));
}

export interface SharedOutputRecord {
	title: string;
	productKey: ProductKey;
	format: OutputFormat;
	createdAt: string;
}

/**
 * Resolve a shared output by its slug.
 *
 * This is the one deliberate exception to the context-required rule: a shared
 * link is a capability the owner explicitly granted (`can_share` plus a
 * generated slug), not a brand-context operation. The query still refuses
 * anything the owner did not mark shareable, and returns only display metadata.
 */
export async function findSharedOutput(shareSlug: string): Promise<SharedOutputRecord | null> {
	const db = await getDB();
	const { rows } = await db.query<{
		title: string;
		productKey: string;
		format: OutputFormat;
		createdAt: Date | string;
	}>(
		`SELECT "title", "product_key" AS "productKey", "format", "created_at" AS "createdAt"
		 FROM "output"
		 WHERE "share_slug" = $1 AND "can_share" = true
		 LIMIT 1`,
		[shareSlug],
	);
	const row = rows[0];
	if (!row || !isProductKey(row.productKey)) return null;
	return {
		title: row.title,
		productKey: row.productKey as ProductKey,
		format: row.format,
		createdAt: iso(row.createdAt) ?? ''
	};
}
