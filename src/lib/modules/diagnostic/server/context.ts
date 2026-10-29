/**
 * The engine run envelope (plan Workstream 4, app side).
 *
 * The engine must never receive a caller-supplied `output_path`, a model, a
 * provider or engine-internal ids. It receives three facts and resolves
 * everything else from its own records and the engagement:
 *
 *   { engineBrandRef, engagementRef, dataClassification }
 *
 * That is what makes the call safe to make from a tenant context: the envelope
 * names a brand and an engagement, not a filesystem path.
 *
 * Building it requires a `brand_engine_ref` row. Without one the brand has no
 * engine identity and the call is refused rather than guessed.
 */

import { getDB } from '#lib/platform/database/db.js';
import { assertOperationContext, type OperationContext } from '#lib/modules/tenancy/server/context.js';

export const DATA_CLASSIFICATIONS = ['public', 'client_confidential', 'internal'] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export interface EngineRunEnvelope {
	engineBrandRef: string;
	engagementRef: string;
	dataClassification: DataClassification;
}

export interface BrandEngineRef {
	engineBrandId: number;
	engineBrandSlug: string;
}

/** The engine identity for the context brand, or null when it has none. */
export async function findBrandEngineRef(ctx: OperationContext): Promise<BrandEngineRef | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{ engineBrandId: number; engineBrandSlug: string }>(
		`SELECT "engine_brand_id" AS "engineBrandId", "engine_brand_slug" AS "engineBrandSlug"
		 FROM "brand_engine_ref"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2
		 LIMIT 1`,
		[ctx.brandId, ctx.organisationId],
	);
	return rows[0] ?? null;
}

/**
 * Build the envelope for one engagement in the context brand.
 *
 * A missing engine identity, a missing engagement or another brand's engagement
 * all refuse. None of them can be silently downgraded to a default brand.
 */
export async function buildEngineEnvelope(
	ctx: OperationContext,
	engagementId: string,
): Promise<EngineRunEnvelope> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		engagementId: string;
		dataClassification: DataClassification;
		engineBrandSlug: string | null;
	}>(
		`SELECT e."id" AS "engagementId", e."data_classification" AS "dataClassification",
		        r."engine_brand_slug" AS "engineBrandSlug"
		 FROM "diagnostic_engagement" e
		 LEFT JOIN "brand_engine_ref" r
		        ON r."brand_id" = e."brand_id" AND r."organisation_id" = e."organisation_id"
		 WHERE e."id" = $1 AND e."brand_id" = $2 AND e."organisation_id" = $3
		 LIMIT 1`,
		[engagementId, ctx.brandId, ctx.organisationId],
	);
	const row = rows[0];
	if (!row) throw new Error('Engagement unavailable.');
	if (!row.engineBrandSlug)
		throw new Error(
			'This brand has no engine identity. Record its engine brand reference before dispatching a run.',
		);

	return {
		engineBrandRef: row.engineBrandSlug,
		engagementRef: row.engagementId,
		dataClassification: row.dataClassification
	};
}
