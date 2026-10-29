/**
 * Entitlement resolution (decision D4, §11.2).
 *
 * Transitional rule: an organisation is entitled if and only if it is a
 * personal organisation whose owner holds a live subscription. Membership in
 * someone else's organisation never confers the purchaser's entitlement.
 * Resolution executes inside requireBrandAccess under §6.4's never-cache
 * design — no separately cached entitlement state.
 */

import type { DatabaseReader } from '#lib/platform/database/db.js';
import { queryUserSubscriptions, type SubscriptionRow } from '#lib/modules/billing/server/subscription.js';
import { getPersonalOrganisationOwner } from './better-auth-adapter.js';

/** Only an active subscription with a verifiably future paid-through date qualifies. */
function subscriptionIsLive(
	row: Pick<SubscriptionRow, 'status' | 'periodEnd'>,
	now = Date.now()
): boolean {
	if (row.status !== 'active') return false;
	const end = row.periodEnd === null ? NaN : new Date(row.periodEnd).getTime();
	return Number.isFinite(end) && end > now;
}

export async function isOrganisationEntitled(organisationId: string, options: { transaction?: DatabaseReader; lock?: boolean } = {}): Promise<boolean> {
	const ownerUserId = await getPersonalOrganisationOwner(organisationId, options.transaction, {lock:options.lock});
	if (!ownerUserId) return false; // org-owned billing is Phase 5

	// The personal organisation's owner holds the subscription.
	const rows = await queryUserSubscriptions(ownerUserId, {
		columns: ['status', 'periodEnd'], transaction:options.transaction, lock:options.lock
	});
	return rows.some((subscription) => subscriptionIsLive(subscription));
}
