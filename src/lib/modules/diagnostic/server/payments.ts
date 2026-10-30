/**
 * Payment and entitlement gate.
 *
 * An engagement is created only when the brand holds a live entitlement. For a
 * purchased product, that entitlement must be linked to an `activated` order.
 * An issued invoice, an initiated payment or a client-side return to a success
 * page never reaches `activated`, so none of them can start work.
 *
 * A grant or migration entitlement is an explicit administrative access path
 * and does not require a purchase. A self-service product purchased normally
 * always does.
 */

import { getDB } from '#lib/platform/database/db.js';
import {
	assertOperationContext,
	type OperationContext
} from '#lib/modules/tenancy/server/context.js';

export class PaymentRequiredError extends Error {
	constructor(message = 'This diagnostic has not been paid for and activated.') {
		super(message);
		this.name = 'PaymentRequiredError';
	}
}

export interface StartPayment {
	entitlementId: string;
	purchaseId: string | null;
}

/**
 * The live entitlement for the context brand and product, with the activated
 * purchase that produced it where the entitlement came from a purchase.
 */
export async function findStartPayment(
	ctx: OperationContext,
	productKey: string
): Promise<StartPayment | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		entitlementId: string;
		purchaseId: string | null;
		source: string;
	}>(
		`SELECT e."id" AS "entitlementId", p."id" AS "purchaseId", e."source"
		 FROM "product_entitlement" e
		 LEFT JOIN "purchase" p
		        ON p."entitlement_id" = e."id" AND p."status" = 'activated'
		 WHERE e."brand_id" = $1 AND e."organisation_id" = $2
		   AND e."product_key" = $3
		   AND e."status" = 'active'
		   AND e."effective_from" <= now()
		   AND (e."effective_to" IS NULL OR e."effective_to" > now())
		 ORDER BY e."created_at" DESC
		 LIMIT 1`,
		[ctx.brandId, ctx.organisationId, productKey]
	);
	const row = rows[0];
	if (!row) return null;
	// A purchase-sourced entitlement is only live once an activated order names it.
	if (row.source === 'purchase' && !row.purchaseId) return null;
	return { entitlementId: row.entitlementId, purchaseId: row.purchaseId };
}

export async function requireStartPayment(
	ctx: OperationContext,
	productKey: string
): Promise<StartPayment> {
	const payment = await findStartPayment(ctx, productKey);
	if (!payment) throw new PaymentRequiredError();
	return payment;
}
