import type { PageServerLoad } from './$types';
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';

/**
 * Confirmation for a one-time purchase.
 *
 * The webhook is the record of truth; Stripe redirects the buyer here possibly
 * before the event is delivered. So a missing row is "not yet recorded", not
 * "not paid", and the page must not claim a failed payment.
 */
export const load: PageServerLoad = async ({ url }) => {
	const sessionId = url.searchParams.get('session_id');
	if (!sessionId) {
		return { state: 'missing' as const, planId: null, amountMinor: null };
	}

	try {
		const pool = await getDB();
		const { rows } = await pool.query<{ plan_id: string; amount_minor: number; currency: string }>(
			'SELECT "plan_id", "amount_minor", "currency" FROM "purchase" WHERE "stripe_session_id" = $1 LIMIT 1',
			[sessionId],
		);

		const purchase = rows[0];
		if (!purchase) {
			return { state: 'processing' as const, planId: null, amountMinor: null };
		}

		return {
			state: 'confirmed' as const,
			planId: purchase.plan_id,
			amountMinor: purchase.amount_minor,
		};
	} catch (error) {
		logger.error('[purchase-success] failed to read purchase', {
			sessionId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { state: 'processing' as const, planId: null, amountMinor: null };
	}
};
