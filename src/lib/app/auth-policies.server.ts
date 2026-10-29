/** Application composition connecting independent modules. */
import { assertNoRetainedMemberships } from '#lib/modules/tenancy/server/lifecycle.js';
import { StripePlugin } from '#lib/modules/billing/server/stripe/index.js';
import { getDashboardSystemHealth } from '#lib/modules/monitoring/server/infrastructure-health.js';
import type { AuthIntegrations } from '#lib/modules/auth/server/integrations.js';
import { appOrganizationHooks } from './organization-auth-policy.server';
import { billingAuthPolicies } from './billing-auth-policy.server';
import { getStripePlans } from './stripe-plans.server';

/**
 * The Stripe plugin is mounted with `subscription: { enabled: false }`.
 *
 * `@better-auth/stripe` 1.7.x models subscriptions only. Every product in the
 * catalogue is a one-time purchase, so subscription mode would either reject
 * the price ids or create a recurring plan the business does not sell. The
 * plugin is retained for customer creation; one-time payments are handled by
 * `createCheckout` and `/api/stripe/webhook`, which write the `purchase` table.
 *
 * The `subscription` table and the billing-policy reads stay in place so
 * existing data and account export/deletion continue to work.
 */
export const appAuthIntegrations: AuthIntegrations = {
  ...billingAuthPolicies,
  assertNoRetainedMemberships,
  organizationHooks: appOrganizationHooks,
  getDashboardSystemHealth,
  additionalPlugins(env) {
    const stripe = StripePlugin({ env, plans: getStripePlans(env) });
    return stripe ? [stripe] : [];
  },
};
