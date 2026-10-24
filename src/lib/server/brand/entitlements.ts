/**
 * Entitlement resolution (decision D4, §11.2).
 *
 * Transitional rule: an organisation is entitled if and only if it is a
 * personal organisation whose owner holds a live subscription. Membership in
 * someone else's organisation never confers the purchaser's entitlement.
 * Resolution executes inside requireBrandAccess under §6.4's never-cache
 * design — no separately cached entitlement state.
 */

import { getDB } from '#lib/auth/server/database/db.js';
import { getPersonalOrganisationOwner } from './better-auth-adapter.js';

interface SubscriptionStatusRow {
	status: string;
	periodEnd: Date | string | null;
}

/** Only an active subscription with a verifiably future paid-through date qualifies. */
function subscriptionIsLive(row: SubscriptionStatusRow, now = Date.now()): boolean {
	if (row.status !== 'active') return false;
	const end = row.periodEnd === null ? NaN : new Date(row.periodEnd).getTime();
	return Number.isFinite(end) && end > now;
}

export async function isOrganisationEntitled(organisationId: string): Promise<boolean> {
	const ownerUserId = await getPersonalOrganisationOwner(organisationId);
	if (!ownerUserId) return false; // org-owned billing is Phase 5

	// The personal organisation's owner holds the subscription.
	const db = await getDB();
	const { rows } = await db.query<SubscriptionStatusRow>(
		`SELECT status, "periodEnd" FROM creem_subscription
		 WHERE "referenceId" = $1`,
		[ownerUserId]
	);
	return rows.some((subscription) => subscriptionIsLive(subscription));
}
