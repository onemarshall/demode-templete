/**
 * Stripe price configuration. The host owns product ids; the billing module does not.
 *
 * Products and prices are approved in the Langfell commercial authority
 * (01-Library/02-Business/03-Offers/01-Pricing-and-Outcomes): one-time, GBP.
 *
 * IMPLEMENTATION STATE — not released. The checkout command in
 * `#lib/modules/billing/remote/checkout.remote.js` still creates subscription
 * sessions and is owned by the separate payments task. Do not enable checkout
 * until that task is complete and VAT treatment is settled.
 */
import type { FullEnv } from '#lib/platform/config/index.js';
import type { StripePlanConfig } from '#lib/modules/billing/server/stripe/index.js';

const PAID_PLANS = [
	{ name: 'signal', price: 'STRIPE_PRICE_SIGNAL' },
	{ name: 'gap', price: 'STRIPE_PRICE_GAP' },
	{ name: 'direction', price: 'STRIPE_PRICE_DIRECTION' },
	{ name: 'full-diagnostic', price: 'STRIPE_PRICE_FULL_DIAGNOSTIC' },
	{ name: 'strategy', price: 'STRIPE_PRICE_STRATEGY' },
	{ name: '101-better-ways-to-think', price: 'STRIPE_PRICE_101_BETTER_WAYS' },
	{ name: 'everything-works-nothing-fits', price: 'STRIPE_PRICE_EVERYTHING_WORKS' },
	{ name: 'think-decide-act', price: 'STRIPE_PRICE_THINK_DECIDE_ACT' }
] as const;

export function getStripePlans(env: FullEnv): StripePlanConfig[] {
	return PAID_PLANS.map(({ name, price }) => ({
		name,
		priceId: env[price]
	}));
}

/** Resolve the Stripe price for a plan name. Unknown or free plans have none. */
export function priceIdForPlan(env: FullEnv, plan: string): string | undefined {
	return getStripePlans(env).find((candidate) => candidate.name === plan.toLowerCase())?.priceId;
}
