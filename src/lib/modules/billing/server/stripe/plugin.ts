/**
 * Stripe Plugin
 *
 * Better Auth plugin for Stripe customer management, subscription checkout,
 * billing portal and webhook processing. The plugin owns the `subscription`
 * table, which is the single source of truth for entitlement reads.
 * @see https://www.better-auth.com/docs/plugins/stripe
 */

import { stripe } from '@better-auth/stripe';
import type { BetterAuthPlugin } from 'better-auth';
import Stripe from 'stripe';
import { logger } from '#lib/platform/logger.js';

interface StripeEnv {
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	PUBLIC_STRIPE_ENABLED?: boolean;
}

export interface StripePlanConfig {
	name: string;
	priceId?: string;
	annualDiscountPriceId?: string;
}

interface StripePluginOptions {
	env: StripeEnv;
	/** Host-owned plan catalogue; the billing module does not know product prices. */
	plans: StripePlanConfig[];
}

/**
 * Build the Stripe plugin if enabled and the credentials it needs are present.
 * Returns null so billing degrades to "feature off" rather than half-configured.
 */
export function StripePlugin({ env, plans }: StripePluginOptions): BetterAuthPlugin | null {
	if (!env.PUBLIC_STRIPE_ENABLED) return null;

	const missing = [
		!env.STRIPE_SECRET_KEY && 'STRIPE_SECRET_KEY',
		!env.STRIPE_WEBHOOK_SECRET && 'STRIPE_WEBHOOK_SECRET',
		!plans.some((plan) => plan.priceId) && 'a STRIPE_PRICE_* price id'
	].filter(Boolean);

	if (missing.length > 0) {
		logger.error('Stripe billing is enabled but not configured', { missing });
		return null;
	}

	logger.debug('Stripe plugin enabled');

	try {
		const stripeClient = new Stripe(env.STRIPE_SECRET_KEY as string);

		return stripe({
			stripeClient,
			stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET as string,
			createCustomerOnSignUp: true,
			// Nothing in the catalogue recurs. The plugin is kept for customer
			// creation only; one-time purchases are recorded by our own webhook.
			subscription: { enabled: false }
		}) as BetterAuthPlugin;
	} catch (error) {
		logger.error('Failed to build Stripe plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
