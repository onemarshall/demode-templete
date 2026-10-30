import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';
import { fulfilPurchase, revokePurchaseEntitlement } from '#lib/modules/products/server/fulfilment.js';
import {
	findByInvoiceId,
	findBySessionId,
	recordEvent,
	recordPayment,
	transition
} from '#lib/modules/billing/server/orders.js';

/**
 * Stripe webhook for the Montsel order lifecycle.
 *
 *   Route A  checkout.session.completed        -> paid -> activated
 *   Route B  invoice.paid                      -> paid -> activated
 *   failure  checkout.session.expired, invoice.payment_failed,
 *            invoice.marked_uncollectible, invoice.voided
 *   refund   charge.refunded                   -> refunded, access withdrawn
 *
 * Access is granted here and nowhere else. A browser redirect is never treated
 * as evidence of payment.
 *
 * Idempotency: every move is a guarded transition, so a replay finds the order
 * already past that state and changes nothing.
 */
export const POST: RequestHandler = async ({ request }) => {
	const env = await getServerEnv();
	const secretKey = env.STRIPE_SECRET_KEY as string | undefined;
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET as string | undefined;

	if (!secretKey || !webhookSecret) {
		logger.error('[stripe-webhook] Stripe is not configured');
		return json({ error: 'Stripe is not configured' }, { status: 503 });
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ error: 'Missing stripe-signature header' }, { status: 400 });
	}

	const payload = await request.text();

	let event: Stripe.Event;
	try {
		const stripe = new Stripe(secretKey);
		event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
	} catch (e: unknown) {
		logger.warn('[stripe-webhook] signature verification failed', {
			error: e instanceof Error ? e.message : String(e)
		});
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed':
			case 'checkout.session.async_payment_succeeded':
				return await handlePaidCheckout(event.data.object as Stripe.Checkout.Session);
			case 'checkout.session.expired':
				return await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
			case 'invoice.paid':
				return await handlePaidInvoice(event.data.object as Stripe.Invoice);
			case 'invoice.payment_failed':
				return await handleInvoiceFailure(
					event.data.object as Stripe.Invoice,
					'requires_review',
					'invoice.payment_failed'
				);
			case 'invoice.marked_uncollectible':
				return await handleInvoiceFailure(
					event.data.object as Stripe.Invoice,
					'failed',
					'invoice.marked_uncollectible'
				);
			case 'invoice.voided':
				return await handleInvoiceFailure(
					event.data.object as Stripe.Invoice,
					'cancelled',
					'invoice.voided'
				);
			case 'charge.refunded':
				return await handleRefund(event.data.object as Stripe.Charge);
			default:
				return json({ received: true, ignored: event.type });
		}
	} catch (e: unknown) {
		logger.error('[stripe-webhook] handler failed', {
			type: event.type,
			error: e instanceof Error ? e.message : String(e)
		});
		return json({ error: 'Handler failed' }, { status: 500 });
	}
};

interface Settlement {
	orderId: string | null;
	reference: string;
	rail: 'checkout' | 'stripe_invoice';
	amountPaidMinor: number;
	email: string | null;
	livemode: boolean;
	paymentIntent?: string | null;
	customerId?: string | null;
}

/**
 * Confirm payment and grant access.
 *
 * The amount is compared rather than trusted: an underpayment is held for
 * review instead of activating a product that was not paid for.
 */
async function settle(input: Settlement): Promise<Record<string, unknown>> {
	const orderId =
		input.orderId ??
		(input.rail === 'checkout'
			? (await findBySessionId(input.reference))?.id
			: (await findByInvoiceId(input.reference))?.id) ??
		null;

	if (!orderId) {
		// A payment we cannot attribute is not ours to activate, but it must not
		// be silently dropped either.
		logger.error('[stripe-webhook] payment has no matching order', {
			reference: input.reference,
			rail: input.rail
		});
		return {  received: true, ignored: 'no matching order'  };
	}

	const pool = await getDB();
	const { rows } = await pool.query<{
		plan_id: string;
		product_key: string | null;
		user_id: string | null;
		amount_minor: number;
		status: string;
	}>(
		'SELECT "plan_id", "product_key", "user_id", "amount_minor", "status" FROM "purchase" WHERE "id" = $1',
		[orderId]
	);
	const order = rows[0];
	if (!order) return {  received: true, ignored: 'order missing'  };

	if (order.status === 'activated' || order.status === 'refunded') {
		return {  received: true, ignored: `already ${order.status}`  };
	}

	await recordPayment(orderId, input.amountPaidMinor);

	if (input.paymentIntent || input.customerId) {
		await pool.query(
			`UPDATE "purchase"
			 SET "stripe_payment_intent" = COALESCE($1, "stripe_payment_intent"),
			     "stripe_customer_id" = COALESCE($2, "stripe_customer_id")
			 WHERE "id" = $3`,
			[input.paymentIntent ?? null, input.customerId ?? null, orderId]
		);
	}

	// Underpayment and overpayment are decided by the amount, not by the event
	// name. Stripe says "paid"; only we know what was owed.
	if (input.amountPaidMinor < order.amount_minor) {
		await transition(
			orderId,
			['awaiting_payment', 'paid'],
			'partially_paid',
			'payment.underpaid',
			{ expected: order.amount_minor, received: input.amountPaidMinor }
		);
		return {  received: true, outcome: 'partially_paid'  };
	}

	if (input.amountPaidMinor > order.amount_minor) {
		await transition(
			orderId,
			['awaiting_payment', 'paid'],
			'requires_review',
			'payment.overpaid',
			{ expected: order.amount_minor, received: input.amountPaidMinor }
		);
		return {  received: true, outcome: 'requires_review'  };
	}

	const moved = await transition(orderId, ['awaiting_payment', 'partially_paid'], 'paid', 'payment.confirmed', {
		rail: input.rail,
		amount: input.amountPaidMinor
	});

	if (!moved) {
		// Already paid or activated by a concurrent delivery.
		return {  received: true, ignored: 'already settled'  };
	}

	// Books have no product row; the sale is complete without an entitlement.
	if (!order.product_key || !order.user_id) {
		await recordEvent(orderId, 'fulfilment.skipped', {
			reason: order.product_key ? 'no user to attribute' : 'no entitlement required'
		});
		return {  received: true, outcome: 'paid, no entitlement required'  };
	}

	const email = input.email ?? (await lookupEmail(order.user_id));
	if (!email) {
		await recordEvent(orderId, 'fulfilment.blocked', { reason: 'no email' });
		logger.error('[stripe-webhook] cannot fulfil without an email', { orderId });
		return {  received: true, outcome: 'paid, fulfilment blocked'  };
	}

	const result = await fulfilPurchase({
		purchaseId: orderId,
		userId: order.user_id,
		email,
		productKey: order.product_key
	});

	if (!result.entitlementId) {
		await recordEvent(orderId, 'fulfilment.failed', { reason: result.reason });
		return {  received: true, outcome: 'paid, fulfilment failed'  };
	}

	await transition(orderId, ['paid'], 'activated', 'access.granted', {
		entitlementId: result.entitlementId
	});

	return {  received: true, outcome: 'activated'  };
}

async function handlePaidCheckout(session: Stripe.Checkout.Session) {
	if (session.payment_status !== 'paid') {
		logger.info('[stripe-webhook] session not yet paid', {
			sessionId: session.id,
			paymentStatus: session.payment_status
		});
		return json({ received: true, ignored: 'unpaid' });
	}

	return json(
		await settle({
			orderId: session.metadata?.orderId ?? null,
			reference: session.id,
			rail: 'checkout',
			amountPaidMinor: session.amount_total ?? 0,
			email: session.customer_details?.email ?? null,
			livemode: session.livemode,
			paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
			customerId: typeof session.customer === 'string' ? session.customer : null
		})
	);
}

async function handlePaidInvoice(invoice: Stripe.Invoice) {
	if (invoice.status !== 'paid') {
		return json({ received: true, ignored: `invoice status ${invoice.status}` });
	}

	return json(
		await settle({
			orderId: invoice.metadata?.orderId ?? null,
			reference: invoice.id,
			rail: 'stripe_invoice',
			amountPaidMinor: invoice.amount_paid ?? 0,
			email: invoice.customer_email ?? null,
			livemode: invoice.livemode,
			customerId: typeof invoice.customer === 'string' ? invoice.customer : null
		})
	);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
	const orderId = session.metadata?.orderId ?? (await findBySessionId(session.id))?.id ?? null;
	if (!orderId) return json({ received: true, ignored: 'no matching order' });
	await transition(orderId, ['awaiting_payment'], 'expired', 'checkout.expired', {
		sessionId: session.id
	});
	return json({ received: true, outcome: 'expired' });
}

async function handleInvoiceFailure(
	invoice: Stripe.Invoice,
	to: 'failed' | 'cancelled' | 'requires_review',
	eventType: string
) {
	const orderId = invoice.metadata?.orderId ?? (await findByInvoiceId(invoice.id))?.id ?? null;
	if (!orderId) return json({ received: true, ignored: 'no matching order' });

	const moved = await transition(
		orderId,
		['awaiting_payment', 'partially_paid'],
		to,
		eventType,
		{ invoiceId: invoice.id, invoiceStatus: invoice.status }
	);
	return json({ received: true, outcome: moved ? to : 'no change' });
}

async function handleRefund(charge: Stripe.Charge) {
	const paymentIntent =
		typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

	if (!paymentIntent) {
		return json({ received: true, ignored: 'refund without payment intent' });
	}

	const pool = await getDB();
	const { rows } = await pool.query<{ id: string }>(
		'SELECT "id" FROM "purchase" WHERE "stripe_payment_intent" = $1 LIMIT 1',
		[paymentIntent]
	);
	const order = rows[0];

	if (!order) {
		logger.warn('[stripe-webhook] refund for unknown order', { paymentIntent });
		return json({ received: true, ignored: 'unknown order' });
	}

	// A partial refund is not a cancellation of access. Record it and stop.
	if (!charge.refunded) {
		await recordEvent(order.id, 'refund.partial', {
			amountRefunded: charge.amount_refunded,
			amount: charge.amount
		});
		return json({ received: true, ignored: 'partial refund' });
	}

	const moved = await transition(
		order.id,
		['paid', 'activated', 'requires_review', 'partially_paid'],
		'refunded',
		'refund.full',
		{ amountRefunded: charge.amount_refunded }
	);

	if (moved) {
		await revokePurchaseEntitlement(order.id);
		await recordEvent(order.id, 'access.revoked', { reason: 'refund' });
	}

	return json({ received: true, refunded: moved });
}

async function lookupEmail(userId: string): Promise<string | null> {
	const pool = await getDB();
	const { rows } = await pool.query<{ email: string | null }>(
		'SELECT "email" FROM "user" WHERE "id" = $1 LIMIT 1',
		[userId]
	);
	return rows[0]?.email ?? null;
}
