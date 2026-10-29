/**
 * Fulfilment: turn a paid purchase into access.
 *
 * Entitlement is brand-scoped, and a buyer may not have a brand yet, so
 * fulfilment resolves (or creates) their personal organisation first. The
 * onboarding operation is idempotent, so a second purchase for the same buyer
 * converges on the same organisation and brand.
 */
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';
import { ensurePersonalOrganisation } from '#lib/modules/tenancy/server/onboarding.js';

export interface FulfilmentInput {
	purchaseId: string;
	userId: string;
	email: string;
	productKey: string;
}

export interface FulfilmentResult {
	entitlementId: string | null;
	reason?: string;
}

/**
 * Grant the entitlement a purchase paid for.
 *
 * Returns `entitlementId: null` with a reason when the purchase needs no
 * entitlement, rather than throwing. A book sale is complete without one, and
 * failing the webhook would make Stripe retry forever.
 */
export async function fulfilPurchase(input: FulfilmentInput): Promise<FulfilmentResult> {
	const db = await getDB();

	// Cheap idempotency: the webhook may be replayed, and a second entitlement
	// for the same product would be a duplicate grant.
	const existing = await db.query<{ entitlementId: string }>(
		`SELECT "entitlement_id" AS "entitlementId" FROM "purchase"
		 WHERE "id" = $1 AND "entitlement_id" IS NOT NULL LIMIT 1`,
		[input.purchaseId],
	);
	if (existing.rows[0]?.entitlementId) {
		return { entitlementId: existing.rows[0].entitlementId, reason: 'already fulfilled' };
	}

	const { organisationId, brandId } = await ensurePersonalOrganisation({
		userId: input.userId,
		name: null,
		email: input.email,
	});

	const entitlementId = `ent_${input.purchaseId}`;

	// The partial unique index allows one active entitlement per brand and
	// product. A repurchase must not create a second one.
	await db.query(
		`INSERT INTO "product_entitlement"
			("id", "organisation_id", "brand_id", "product_key", "source",
			 "status", "purchase_reference")
		 VALUES ($1, $2, $3, $4, 'purchase', 'active', $5)
		 ON CONFLICT DO NOTHING`,
		[entitlementId, organisationId, brandId, input.productKey, input.purchaseId],
	);

	const granted = await db.query<{ id: string }>(
		`SELECT "id" FROM "product_entitlement"
		 WHERE "brand_id" = $1 AND "organisation_id" = $2 AND "product_key" = $3
		   AND "status" = 'active' LIMIT 1`,
		[brandId, organisationId, input.productKey],
	);

	const resolvedId = granted.rows[0]?.id ?? null;
	if (!resolvedId) {
		logger.error('[fulfilment] entitlement missing after insert', {
			purchaseId: input.purchaseId,
			productKey: input.productKey,
		});
		return { entitlementId: null, reason: 'insert did not produce an active entitlement' };
	}

	await db.query('UPDATE "purchase" SET "entitlement_id" = $1, "updated_at" = now() WHERE "id" = $2', [
		resolvedId,
		input.purchaseId,
	]);

	logger.info('[fulfilment] entitlement granted', {
		purchaseId: input.purchaseId,
		productKey: input.productKey,
		entitlementId: resolvedId,
	});

	return { entitlementId: resolvedId };
}

/**
 * Withdraw access after a refund.
 *
 * The row is revoked rather than deleted so the purchase keeps a trace of what
 * it once granted, and a re-purchase can issue a fresh entitlement.
 */
export async function revokePurchaseEntitlement(purchaseId: string): Promise<void> {
	const db = await getDB();
	await db.query(
		`UPDATE "product_entitlement"
		 SET "status" = 'revoked', "effective_to" = now(), "updated_at" = now()
		 WHERE "purchase_reference" = $1 AND "status" = 'active'`,
		[purchaseId],
	);
}
