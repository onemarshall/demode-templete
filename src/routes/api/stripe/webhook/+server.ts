import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';
import { PRODUCT_KEY_BY_PLAN } from '#lib/app/plans.js';
import { fulfilPurchase, revokePurchaseEntitlement } from '#lib/modules/products/server/fulfilment.js';

/**
 * Stripe webhook for one-time purchases.
 *
 * Subscriptions are not used by this catalogue. This handler records the sale,
 * grants what was bought, and withdraws it on refund.
 *
 * Idempotency: `purchase.stripe_session_unique` makes a replayed checkout a
 * no-op, and `fulfilPurchase` returns early when a purchase already produced an
 * entitlement. Stripe retries until it receives a 2xx, so every branch here must
 * be safe to run repeatedly.
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
			case 'charge.refunded':
				return await handleRefund(event.data.object as Stripe.Charge);
			default:
				return json({ received: true, ignored: event.type });
		}
	} catch (e: unknown) {
		// Return 500 so Stripe retries. A dropped sale or refund is worse than
		// a duplicate, which the constraints already prevent.
		logger.error('[stripe-webhook] handler failed', {
			type: event.type,
			error: e instanceof Error ? e.message : String(e)
		});
		return json({ error: 'Handler failed' }, { status: 500 });
	}
};

async function handlePaidCheckout(session: Stripe.Checkout.Session) {
	if (session.payment_status !== 'paid') {
		logger.info('[stripe-webhook] session not yet paid', {
			sessionId: session.id,
			paymentStatus: session.payment_status
		});
		return json({ received: true, ignored: 'unpaid' });
	}

	const planId = session.metadata?.plan;
	if (!planId) {
		logger.error('[stripe-webhook] paid session has no plan metadata', { sessionId: session.id });
		return json({ received: true, ignored: 'missing plan metadata' });
	}

	// `??` alone is not enough: metadata can carry an empty string, which is
	// not nullish and would violate the user foreign key instead of recording
	// an unattributed purchase.
	const rawUserId = session.client_reference_id ?? session.metadata?.referenceId ?? null;
	const userId = rawUserId && rawUserId.trim() ? rawUserId : null;

	// Consent is captured at checkout and carried here. Absent metadata means
	// the buyer did not waive the cancellation right, which is a legitimate
	// state and not an error.
	const consentAt = session.metadata?.cancellationConsentAt ?? null;

	const purchaseId = `pur_${session.id}`;
	const productKey = PRODUCT_KEY_BY_PLAN[planId] ?? null;

	const pool = await getDB();
	await pool.query(
		`INSERT INTO "purchase"
			("id", "user_id", "plan_id", "product_key", "stripe_session_id",
			 "stripe_payment_intent", "stripe_customer_id", "amount_minor",
			 "currency", "status", "livemode", "cancellation_consent_at")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'paid', $10, $11)
		 ON CONFLICT ("stripe_session_id") DO NOTHING`,
		[
			purchaseId,
			userId,
			planId,
			productKey,
			session.id,
			typeof session.payment_intent === 'string' ? session.payment_intent : null,
			typeof session.customer === 'string' ? session.customer : null,
			session.amount_total ?? 0,
			(session.currency ?? 'gbp').toUpperCase(),
			session.livemode,
			consentAt
		]
	);

	logger.info('[stripe-webhook] purchase recorded', {
		sessionId: session.id,
		planId,
		livemode: session.livemode
	});

	// Books have no `product` row, so there is nothing to entitle. Their
	// delivery needs a file, which is a separate task.
	if (!productKey || !userId) {
		return json({
			received: true,
			fulfilment: productKey ? 'no user to attribute' : 'no entitlement required'
		});
	}

	const email = session.customer_details?.email ?? null;
	const resolvedEmail = email ?? (await lookupEmail(userId));
	if (!resolvedEmail) {
		logger.error('[stripe-webhook] cannot fulfil without an email', { purchaseId });
		return json({ received: true, fulfilment: 'skipped: no email' });
	}

	const result = await fulfilPurchase({
		purchaseId,
		userId,
		email: resolvedEmail,
		productKey
	});

	return json({ received: true, fulfilment: result.entitlementId ? 'granted' : result.reason });
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
	const purchase = rows[0];

	if (!purchase) {
		logger.warn('[stripe-webhook] refund for unknown purchase', { paymentIntent });
		return json({ received: true, ignored: 'unknown purchase' });
	}

	// A partial refund is not a cancellation of access. Record it and stop.
	if (!charge.refunded) {
		logger.info('[stripe-webhook] partial refund noted', {
			purchaseId: purchase.id,
			amountRefunded: charge.amount_refunded,
			amount: charge.amount
		});
		return json({ received: true, ignored: 'partial refund' });
	}

	await pool.query(
		`UPDATE "purchase"
		 SET "status" = 'refunded', "refunded_at" = now(), "updated_at" = now()
		 WHERE "id" = $1`,
		[purchase.id]
	);

	await revokePurchaseEntitlement(purchase.id);

	logger.info('[stripe-webhook] purchase refunded and access withdrawn', {
		purchaseId: purchase.id
	});

	return json({ received: true, refunded: true });
}

async function lookupEmail(userId: string): Promise<string | null> {
	const pool = await getDB();
	const { rows } = await pool.query<{ email: string | null }>(
		'SELECT "email" FROM "user" WHERE "id" = $1 LIMIT 1',
		[userId]
	);
	return rows[0]?.email ?? null;
}
