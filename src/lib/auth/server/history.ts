import { getDB } from '#lib/auth/server/database/db.js';

export type HistoryCategory = 'security' | 'account' | 'admin';
export type HistoryOutcome = 'success' | 'failure';

export interface HistoryEntry {
	id: string;
	category: HistoryCategory;
	action: string;
	outcome: HistoryOutcome;
	actorId: string | null;
	targetId: string | null;
	createdAt: string;
	metadata: Record<string, string | number | boolean | null>;
	/** Exact database timestamp used only to continue pagination without losing microseconds. */
	cursorCreatedAt?: string;
}

export interface RecordHistoryInput {
	category: HistoryCategory;
	action: string;
	outcome: HistoryOutcome;
	actorId?: string | null;
	targetId?: string | null;
	metadata?: Record<string, unknown>;
}

const MAX_METADATA_KEYS = 12;
const MAX_VALUE_LENGTH = 160;
const RETENTION_DAYS = 90;
const PAGE_LIMIT = 50;
const HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS auth_history (
	id TEXT PRIMARY KEY,
	category TEXT NOT NULL CHECK (category IN ('security', 'account', 'admin')),
	action TEXT NOT NULL,
	outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
	actor_id TEXT,
	target_id TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS auth_history_actor_created_idx ON auth_history (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_history_target_created_idx ON auth_history (target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_history_category_created_idx ON auth_history (category, created_at DESC);
`;
let schemaPromise: Promise<void> | null = null;

function sanitizeMetadata(input: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
	const safe: Record<string, string | number | boolean | null> = {};
	if (!input) return safe;
	for (const [key, value] of Object.entries(input).slice(0, MAX_METADATA_KEYS)) {
		if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
		if (/(token|secret|password|credential|cookie|authorization|code|key)/i.test(key)) continue;
		if (typeof value === 'string') safe[key] = value.slice(0, MAX_VALUE_LENGTH);
		else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
		else if (typeof value === 'boolean' || value === null) safe[key] = value;
	}
	return safe;
}

async function ensureHistoryTable(): Promise<void> {
	if (!schemaPromise) {
		schemaPromise = (async () => {
			const db = await getDB();
			await db.query(HISTORY_TABLE_SQL);
		})();
	}
	try {
		await schemaPromise;
	} catch (err) {
		schemaPromise = null;
		throw err;
	}
}

export async function recordHistory(input: RecordHistoryInput): Promise<void> {
	if (!input.actorId && !input.targetId) return;
	await ensureHistoryTable();
	const db = await getDB();
	await db.query(
		`INSERT INTO auth_history (id, category, action, outcome, actor_id, target_id, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
		[
			crypto.randomUUID(),
			input.category,
			input.action.slice(0, 80),
			input.outcome,
			input.actorId ?? null,
			input.targetId ?? null,
			JSON.stringify(sanitizeMetadata(input.metadata))
		]
	);
	// Retain a fixed window so account history cannot grow without bound.
	await db.query(`DELETE FROM auth_history WHERE created_at < NOW() - ($1 * INTERVAL '1 day')`, [RETENTION_DAYS]);
}

export async function listOwnHistory(userId: string, before?: string, limit = PAGE_LIMIT): Promise<HistoryEntry[]> {
	return listHistory({ userId, before, limit });
}

export async function listAdminHistory(before?: string, limit = PAGE_LIMIT): Promise<HistoryEntry[]> {
	return listHistory({ before, limit, category: 'admin' });
}

async function listHistory(options: { userId?: string; before?: string; limit: number; category?: HistoryCategory }): Promise<HistoryEntry[]> {
	await ensureHistoryTable();
	const db = await getDB();
	const limit = Math.max(1, Math.min(PAGE_LIMIT, Math.trunc(options.limit)));
	const parsedBefore = parseCursor(options.before);
	if (options.before && !parsedBefore) return [];
	const result = await db.query(
		`SELECT id, category, action, outcome, actor_id, target_id, created_at,
		        created_at::text AS cursor_created_at, metadata
		 FROM auth_history
		 WHERE ($1::text IS NULL OR actor_id = $1 OR target_id = $1)
		   AND ($3::text IS NULL OR category = $3)
		   AND created_at >= NOW() - ($4 * INTERVAL '1 day')
		   AND ($2::timestamptz IS NULL OR (created_at, id) < ($2, $5::text))
		 ORDER BY created_at DESC, id DESC
		 LIMIT $6`,
		[options.userId ?? null, parsedBefore?.createdAt ?? null, options.category ?? null, RETENTION_DAYS, parsedBefore?.id ?? null, limit]
	);
	return result.rows.map((row) => ({
		id: row.id,
		category: row.category,
		action: row.action,
		outcome: row.outcome,
		actorId: row.actor_id,
		targetId: row.target_id,
		createdAt: new Date(row.created_at).toISOString(),
		metadata: sanitizeMetadata(row.metadata as Record<string, unknown>),
		cursorCreatedAt: String(row.cursor_created_at)
	}));
}

export const HISTORY_RETENTION_DAYS = RETENTION_DAYS;
export const HISTORY_PAGE_LIMIT = PAGE_LIMIT;

export function encodeHistoryCursor(entry: Pick<HistoryEntry, 'id' | 'createdAt' | 'cursorCreatedAt'>): string {
	return `${entry.cursorCreatedAt ?? entry.createdAt}|${entry.id}`;
}

function parseCursor(value?: string): { createdAt: string; id: string } | null {
	if (!value) return null;
	const separator = value.indexOf('|');
	if (separator < 1) return null;
	const createdAt = new Date(value.slice(0, separator));
	const id = value.slice(separator + 1);
	if (Number.isNaN(createdAt.getTime()) || !id || id.length > 128) return null;
	return { createdAt: value.slice(0, separator), id };
}
