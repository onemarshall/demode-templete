/**
 * Order lifecycle.
 *
 * `purchase` rows span draft -> awaiting_payment -> paid -> activated. Only
 * `activated` implies access; `paid` means money arrived and fulfilment has not
 * finished. Every transition is guarded by the current status so a replayed
 * webhook cannot move an order backwards or grant a second entitlement.
 *
 * All writes append to `purchase_event`, which is the audit trail for financial
 * and access-control changes.
 */
import { randomUUID } from 'crypto';
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';

export type OrderStatus =
	| 'draft'
	| 'awaiting_payment'
	| 'paid'
	| 'activated'
	| 'partially_paid'
	| 'requires_review'
	| 'failed'
	| 'cancelled'
	| 'expired'
	| 'refunded';

export type PaymentRail = 'checkout' | 'stripe_invoice' | 'external_invoice';

export interface BillingDetails {
	companyName?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	postalCode?: string;
	country?: string;
	email?: string;
	taxId?: string;
}

export interface CreateOrderInput {
	userId: string | null;
	planId: string;
	productKey: string | null;
	rail: PaymentRail;
	amountMinor: number;
	currency: string;
	livemode: boolean;
	consentAt: string | null;
	billing?: BillingDetails | null;
}

export async function createOrder(input: CreateOrderInput): Promise<string> {
	const db = await getDB();
	const orderId = `pur_${randomUUID()}`;

	await db.query(
		`INSERT INTO "purchase"
			("id", "user_id", "plan_id", "product_key", "amount_minor", "currency",
			 "status", "livemode", "cancellation_consent_at", "payment_rail",
			 "billing", "country", "tax_id")
		 VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment', $7, $8, $9, $10, $11, $12)`,
		[
			orderId,
			input.userId,
			input.planId,
			input.productKey,
			input.amountMinor,
			input.currency.toUpperCase(),
			input.livemode,
			input.consentAt,
			input.rail,
			input.billing ? JSON.stringify(input.billing) : null,
			input.billing?.country ?? null,
			input.billing?.taxId ?? null
		]
	);

	await recordEvent(orderId, 'order.created', {
		rail: input.rail,
		planId: input.planId,
		amountMinor: input.amountMinor
	});

	return orderId;
}

export async function attachCheckoutSession(orderId: string, sessionId: string): Promise<void> {
	const db = await getDB();
	await db.query(
		'UPDATE "purchase" SET "stripe_session_id" = $1, "updated_at" = now() WHERE "id" = $2',
		[sessionId, orderId]
	);
	await recordEvent(orderId, 'checkout.session_created', { sessionId });
}

export async function attachInvoice(
	orderId: string,
	invoice: {
		invoiceId: string;
		number: string | null;
		hostedInvoiceUrl: string | null;
		dueAt: string | null;
	}
): Promise<void> {
	const db = await getDB();
	await db.query(
		`UPDATE "purchase"
		 SET "stripe_invoice_id" = $1, "invoice_number" = $2,
		     "hosted_invoice_url" = $3, "due_at" = $4, "updated_at" = now()
		 WHERE "id" = $5`,
		[invoice.invoiceId, invoice.number, invoice.hostedInvoiceUrl, invoice.dueAt, orderId]
	);
	await recordEvent(orderId, 'invoice.issued', {
		invoiceId: invoice.invoiceId,
		number: invoice.number
	});
}

/**
 * Move an order between states.
 *
 * `from` is the set of statuses the move is valid from. A webhook that arrives
 * twice finds the order already past that point and the update matches nothing,
 * which is the idempotency mechanism.
 */
export async function transition(
	orderId: string,
	from: OrderStatus[],
	to: OrderStatus,
	eventType: string,
	detail?: Record<string, unknown>
): Promise<boolean> {
	const db = await getDB();
	const { rowCount } = await db.query(
		`UPDATE "purchase"
		 SET "status" = $1, "updated_at" = now(),
		     "activated_at" = CASE WHEN $1 = 'activated' THEN now() ELSE "activated_at" END
		 WHERE "id" = $2 AND "status" = ANY($3::text[])`,
		[to, orderId, from]
	);

	if (!rowCount) {
		logger.info('[orders] transition skipped', { orderId, to, from });
		return false;
	}

	await recordEvent(orderId, eventType, { to, ...detail });
	return true;
}

export async function recordPayment(orderId: string, amountPaidMinor: number): Promise<void> {
	const db = await getDB();
	await db.query(
		'UPDATE "purchase" SET "amount_paid_minor" = $1, "updated_at" = now() WHERE "id" = $2',
		[amountPaidMinor, orderId]
	);
}

export async function findBySessionId(sessionId: string): Promise<{ id: string } | null> {
	const db = await getDB();
	const { rows } = await db.query<{ id: string }>(
		'SELECT "id" FROM "purchase" WHERE "stripe_session_id" = $1 LIMIT 1',
		[sessionId]
	);
	return rows[0] ?? null;
}

export async function findByInvoiceId(invoiceId: string): Promise<{ id: string } | null> {
	const db = await getDB();
	const { rows } = await db.query<{ id: string }>(
		'SELECT "id" FROM "purchase" WHERE "stripe_invoice_id" = $1 LIMIT 1',
		[invoiceId]
	);
	return rows[0] ?? null;
}

export async function recordEvent(
	orderId: string,
	eventType: string,
	detail?: Record<string, unknown>
): Promise<void> {
	const db = await getDB();
	await db.query(
		'INSERT INTO "purchase_event" ("id", "purchase_id", "event_type", "detail") VALUES ($1, $2, $3, $4)',
		[`pev_${randomUUID()}`, orderId, eventType, detail ? JSON.stringify(detail) : null]
	);
}
