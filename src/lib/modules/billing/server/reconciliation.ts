/**
 * Route C: external invoice / bank transfer reconciliation.
 *
 * An external payment is never activated because an invoice was issued or a
 * transfer was claimed. A named operator must record a verified reference; the
 * order then moves through the existing `paid` → `activated` lifecycle and the
 * existing fulfilment grants the entitlement.
 *
 * This is an administrative operation, not a customer action. It appends to
 * `purchase_event` through the existing order transitions.
 */

import { getDB } from '#lib/platform/database/db.js';
import { fulfilPurchase } from '#lib/modules/products/server/fulfilment.js';
import { transition } from './orders.js';

export interface ReconciliationInput {
	purchaseId: string;
	reference: string;
	reconciledBy: string;
	notes?: string;
}

export interface ReconciliationResult {
	status: 'activated' | 'already_activated';
	entitlementId?: string;
}

export async function reconcileExternalInvoice(
	input: ReconciliationInput
): Promise<ReconciliationResult> {
	const reference = input.reference.trim();
	if (!reference)
		throw new Error('A verified payment reference is required before activation.');
	if (!input.reconciledBy.trim())
		throw new Error('A named reconciler is required.');

	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		userId: string | null;
		email: string | null;
		productKey: string | null;
		status: string;
	}>(
		`SELECT p."id", p."user_id" AS "userId", u."email",
		        p."product_key" AS "productKey", p."status"
		 FROM "purchase" p
		 LEFT JOIN "user" u ON u."id" = p."user_id"
		 WHERE p."id" = $1
		 LIMIT 1`,
		[input.purchaseId]
	);
	const purchase = rows[0];
	if (!purchase) throw new Error('Purchase not found.');
	if (purchase.status === 'activated')
		return { status: 'already_activated' };
	if (!['awaiting_payment', 'paid', 'partially_paid', 'requires_review'].includes(purchase.status))
		throw new Error(`Cannot reconcile a purchase in ${purchase.status}.`);
	if (!purchase.productKey)
		throw new Error('This purchase has no product entitlement to grant.');
	if (!purchase.userId || !purchase.email)
		throw new Error('The purchase has no attributable user or email.');

	await db.query(
		`UPDATE "purchase"
		 SET "external_payment_reference" = $1, "reconciled_by" = $2,
		     "reconciled_at" = now(), "updated_at" = now()
		 WHERE "id" = $3`,
		[reference, input.reconciledBy, input.purchaseId]
	);

	if (purchase.status !== 'paid') {
		await transition(
			input.purchaseId,
			['awaiting_payment', 'partially_paid', 'requires_review'],
			'paid',
			'external_payment.confirmed',
			{
				reference,
				reconciledBy: input.reconciledBy,
				...(input.notes ? { notes: input.notes } : {})
			}
		);
	}

	const fulfilled = await fulfilPurchase({
		purchaseId: input.purchaseId,
		userId: purchase.userId,
		email: purchase.email,
		productKey: purchase.productKey
	});
	if (!fulfilled.entitlementId)
		throw new Error(fulfilled.reason ?? 'Entitlement could not be granted.');

	await transition(input.purchaseId, ['paid'], 'activated', 'entitlement.activated', {
		entitlementId: fulfilled.entitlementId
	});

	return { status: 'activated', entitlementId: fulfilled.entitlementId };
}
