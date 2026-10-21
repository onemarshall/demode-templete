import { getDB } from '#lib/auth/server/database/db.js';
import { logger } from '#lib/auth/shared/logger.js';

interface SubscriptionRow {
	id: string;
	productId: string;
	status: string;
	creemSubscriptionId: string | null;
	periodStart: Date | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean;
}

export interface UserSubscription {
	status: string;
	product: { id: string };
	periodStart: string | null;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	creemSubscriptionId: string | null;
}

export async function loadActiveSubscription(userId: string): Promise<UserSubscription | null> {
	try {
		const pool = await getDB();
		const result = await pool.query<SubscriptionRow>(
			`SELECT id, "productId", status, "creemSubscriptionId",
			        "periodStart", "periodEnd", "cancelAtPeriodEnd"
			 FROM creem_subscription
			 WHERE "referenceId" = $1
			 ORDER BY "periodEnd" DESC NULLS LAST
			 LIMIT 1`,
			[userId]
		);
		const row = result.rows[0];
		if (!row) return null;

		return {
			status: row.status,
			product: { id: row.productId },
			periodStart: row.periodStart?.toISOString() ?? null,
			periodEnd: row.periodEnd?.toISOString() ?? null,
			cancelAtPeriodEnd: row.cancelAtPeriodEnd,
			creemSubscriptionId: row.creemSubscriptionId
		};
	} catch (err) {
		logger.error('[subscription] failed to load', {
			userId,
			error: err instanceof Error ? err.message : String(err)
		});
		return null;
	}
}
