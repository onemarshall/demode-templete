import { publicEnv } from '#lib/platform/config/index.js';
import { queryUserSubscriptions } from '#lib/modules/billing/server/subscription.js';
import type { AuthIntegrations } from '#lib/modules/auth/server/integrations.js';

function isMissingDisabledBilling(error: unknown): boolean {
  return !publicEnv.PUBLIC_CREEM_ENABLED && !!error && typeof error === 'object' && 'code' in error && error.code === '42P01';
}


export const billingAuthPolicies: Pick<AuthIntegrations, 'loadDeletionSubscriptions' | 'loadExportSubscriptions'> = {
  async loadDeletionSubscriptions(userId) {
    try {
      // Check every retained obligation even when the billing feature is disabled.
      return await queryUserSubscriptions(userId, { columns: ['status', 'periodEnd'] });
    } catch (error) {
      if (isMissingDisabledBilling(error)) return [];
      throw error;
    }
  },
  async loadExportSubscriptions(userId, limit) {
    try {
      return await queryUserSubscriptions(userId, {
        columns: ['productId', 'status', 'periodStart', 'periodEnd', 'cancelAtPeriodEnd'],
        orderBy: 'periodStart', limit,
      });
    } catch (error) {
      if (isMissingDisabledBilling(error)) return [];
      throw error;
    }
  },
};
