import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '#lib/platform/config/index.js';
import type { OrganizationHooks } from '../features/organization/plugin';

/** Host application policies. Every installation must make these choices explicitly. */
export interface AuthIntegrations {
  loadDeletionSubscriptions(userId: string): Promise<{ status: string; periodEnd: Date | string | null }[]>;
  assertNoRetainedMemberships(userId: string): Promise<void>;
  loadExportSubscriptions(userId: string, limit: number): Promise<Record<string, unknown>[]>;
  organizationHooks: OrganizationHooks;
  getDashboardSystemHealth(): Promise<import('../security/services/dashboard-types').SystemHealthStatus | null>;
  additionalPlugins(env: FullEnv): BetterAuthPlugin[];
}

let integrations: AuthIntegrations | undefined;

/** Called by the host before building auth; never defaults to permissive policies. */
export function configureAuthIntegrations(value: AuthIntegrations): void {
  integrations = value;
}

export function getAuthIntegrations(): AuthIntegrations {
  if (!integrations) throw new Error('Auth has not been initialized. Configure host integrations before serving requests.');
  return integrations;
}
