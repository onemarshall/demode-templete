/** Application composition connecting independent modules. */
import { assertNoRetainedMemberships } from '#lib/modules/tenancy/server/lifecycle.js';
import { CreemPlugin } from '#lib/modules/billing/server/creem/index.js';
import { getDashboardSystemHealth } from '#lib/modules/monitoring/server/infrastructure-health.js';
import type { AuthIntegrations } from '#lib/modules/auth/server/integrations.js';
import { appOrganizationHooks } from './organization-auth-policy.server';
import { billingAuthPolicies } from './billing-auth-policy.server';

export const appAuthIntegrations: AuthIntegrations = {
  ...billingAuthPolicies,
  assertNoRetainedMemberships,
  organizationHooks: appOrganizationHooks,
  getDashboardSystemHealth,
  additionalPlugins(env) {
    const creem = CreemPlugin(env);
    return creem ? [creem] : [];
  },
};
