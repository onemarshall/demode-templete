import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';

/**
 * Column map for creem_subscription — a Better Auth plugin table owned by
 * @creem_io/better-auth, not a Directus collection. Single source of truth for
 * every billing read; update this map when the plugin's schema changes.
 */
const SUBSCRIPTION_COLUMNS = {
	id: 'id',
	productId: '"productId"',
	status: 'status',
	creemSubscriptionId: '"creemSubscriptionId"',
	periodStart: '"periodStart"',
	periodEnd: '"periodEnd"',
	cancelAtPeriodEnd: '"cancelAtPeriodEnd"'
} as const;

export interface CreemSubscriptionRow {
	id: string;
	productId: string;
	status: string;
	creemSubscriptionId: string | null;
	periodStart: Date | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean;
}

type SubscriptionColumn = keyof CreemSubscriptionRow;

interface SubscriptionQuery<K extends SubscriptionColumn> {
	/** Columns to select. Defaults to the full row — select only what you need. */
	columns?: readonly K[];
	/** periodStart: newest-starting first with id tiebreak. periodEnd: longest-paid first. */
	orderBy?: 'periodStart' | 'periodEnd';
	/** Bound as LIMIT $2 so the value stays parameterised. */
	limit?: number;
}

/**
 * Read subscription rows for a Better Auth referenceId (user id).
 * Throws on database errors — callers decide policy: tolerate a missing table
 * when billing is disabled, fail closed, or degrade to null.
 */
export async function queryUserSubscriptions<K extends SubscriptionColumn = SubscriptionColumn>(
	referenceId: string,
	{ columns, orderBy, limit }: SubscriptionQuery<K> = {}
): Promise<Pick<CreemSubscriptionRow, K>[]> {
	const select = (columns ?? (Object.keys(SUBSCRIPTION_COLUMNS) as K[]))
		.map((key) => SUBSCRIPTION_COLUMNS[key])
		.join(', ');
	const orderByClause =
		orderBy === 'periodStart'
			? ' ORDER BY "periodStart" DESC NULLS LAST, id DESC'
			: orderBy === 'periodEnd'
				? ' ORDER BY "periodEnd" DESC NULLS LAST'
				: '';

	const pool = await getDB();
	const result = limit
		? await pool.query<Pick<CreemSubscriptionRow, K>>(
				`SELECT ${select} FROM creem_subscription WHERE "referenceId" = $1${orderByClause} LIMIT $2`,
				[referenceId, limit]
			)
		: await pool.query<Pick<CreemSubscriptionRow, K>>(
				`SELECT ${select} FROM creem_subscription WHERE "referenceId" = $1${orderByClause}`,
				[referenceId]
			);
	return result.rows;
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
		const row = (
			await queryUserSubscriptions(userId, { orderBy: 'periodEnd', limit: 1 })
		)[0];
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
