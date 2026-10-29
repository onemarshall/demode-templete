import { getDB, type DatabaseReader } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';

/**
 * Column map for `subscription` — a Better Auth plugin table owned by
 * @better-auth/stripe, not a Directus collection. Single source of truth for
 * every billing read; update this map when the plugin's schema changes.
 */
const SUBSCRIPTION_COLUMNS = {
	id: 'id',
	plan: 'plan',
	status: 'status',
	stripeSubscriptionId: '"stripeSubscriptionId"',
	periodStart: '"periodStart"',
	periodEnd: '"periodEnd"',
	cancelAtPeriodEnd: '"cancelAtPeriodEnd"'
} as const;

export interface SubscriptionRow {
	id: string;
	plan: string;
	status: string;
	stripeSubscriptionId: string | null;
	periodStart: Date | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean;
}

type SubscriptionColumn = keyof SubscriptionRow;

interface SubscriptionQuery<K extends SubscriptionColumn> {
	transaction?: DatabaseReader;
	lock?: boolean;
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
	{ columns, orderBy, limit, transaction, lock }: SubscriptionQuery<K> = {}
): Promise<Pick<SubscriptionRow, K>[]> {
	const select = (columns ?? (Object.keys(SUBSCRIPTION_COLUMNS) as K[]))
		.map((key) => SUBSCRIPTION_COLUMNS[key])
		.join(', ');
	const orderByClause =
		orderBy === 'periodStart'
			? ' ORDER BY "periodStart" DESC NULLS LAST, id DESC'
			: orderBy === 'periodEnd'
				? ' ORDER BY "periodEnd" DESC NULLS LAST'
				: '';

	if(lock && !transaction) throw new Error("Entitlement locks require a transaction");
	const pool = transaction ?? await getDB();
	const lockClause=lock?" FOR SHARE":"";
	const result = limit
		? await pool.query(
				`SELECT ${select} FROM subscription WHERE "referenceId" = $1${orderByClause} LIMIT $2${lockClause}`,
				[referenceId, limit]
			)
		: await pool.query(
				`SELECT ${select} FROM subscription WHERE "referenceId" = $1${orderByClause}${lockClause}`,
				[referenceId]
			);
	return (result as { rows: Pick<SubscriptionRow,K>[] }).rows;
}

export interface UserSubscription {
	status: string;
	product: { id: string };
	periodStart: string | null;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	subscriptionId: string;
}

export async function loadActiveSubscription(userId: string): Promise<UserSubscription | null> {
	try {
		const row = (
			await queryUserSubscriptions(userId, { orderBy: 'periodEnd', limit: 1 })
		)[0];
		if (!row) return null;

		return {
			status: row.status,
			product: { id: row.plan },
			periodStart: row.periodStart?.toISOString() ?? null,
			periodEnd: row.periodEnd?.toISOString() ?? null,
			cancelAtPeriodEnd: row.cancelAtPeriodEnd,
			subscriptionId: row.id
		};
	} catch (err) {
		logger.error('[subscription] failed to load', {
			userId,
			error: err instanceof Error ? err.message : String(err)
		});
		return null;
	}
}
