/**
 * Security Storage Adapter
 *
 * Abstracts key/value storage for security features (rate limiting, blocking,
 * captcha bypass, device trust). Three backends are supported:
 *
 *   1. Redis  — preferred for multi-instance / production
 *   2. In-memory Map — suitable for single-instance / dev / testing
 *   3. Postgres — uses a simple kv table; no extra infra needed
 *
 * Selection is automatic via `createStorageAdapter()`:
 *   - REDIS_URL set       → Redis
 *   - PG_KV_STORE=true    → Postgres
 *   - otherwise           → in-memory
 */

import { logger } from '$lib/auth/shared/logger';

// ============================================
// Core interface — keeps feature code clean
// ============================================

export interface StorageAdapter {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	del(key: string): Promise<void>;
	/** Returns remaining TTL in seconds, or -1 if key has no TTL, or -2 if missing */
	ttl(key: string): Promise<number>;
	/** Check membership in a set */
	sIsMember(setKey: string, member: string): Promise<boolean>;
	sAdd(setKey: string, member: string): Promise<void>;
	sRem(setKey: string, member: string): Promise<void>;
	sMembers(setKey: string): Promise<string[]>;
	/** List keys matching a glob pattern (e.g. 'blocked_ip:*'). Mirrors Redis SCAN semantics. */
	scanKeys(pattern: string): Promise<string[]>;
}

// ============================================
// In-memory backend (default / fallback)
// ============================================

interface MemEntry {
	value: string;
	expiresAt?: number;
}

interface MemSetEntry {
	members: Set<string>;
}

/** Convert a Redis-style glob pattern to a RegExp (supports * and ?) */
function globToRegExp(pattern: string): RegExp {
	let re = '';
	for (const ch of pattern) {
		if (ch === '*') re += '.*';
		else if (ch === '?') re += '.';
		else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	return new RegExp(`^${re}$`);
}

export function createMemoryAdapter(): StorageAdapter {
	const store = new Map<string, MemEntry>();
	const sets = new Map<string, MemSetEntry>();

	function isExpired(entry: MemEntry): boolean {
		return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
	}

	return {
		async get(key) {
			const entry = store.get(key);
			if (!entry || isExpired(entry)) {
				store.delete(key);
				return null;
			}
			return entry.value;
		},
		async set(key, value, ttlSeconds) {
			store.set(key, {
				value,
				expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined
			});
		},
		async del(key) {
			store.delete(key);
		},
		async ttl(key) {
			const entry = store.get(key);
			if (!entry || isExpired(entry)) return -2;
			if (entry.expiresAt === undefined) return -1;
			return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
		},
		async sIsMember(setKey, member) {
			return sets.get(setKey)?.members.has(member) ?? false;
		},
		async sAdd(setKey, member) {
			if (!sets.has(setKey)) sets.set(setKey, { members: new Set() });
			sets.get(setKey)!.members.add(member);
		},
		async sRem(setKey, member) {
			sets.get(setKey)?.members.delete(member);
		},
		async sMembers(setKey) {
			return Array.from(sets.get(setKey)?.members ?? []);
		},
		async scanKeys(pattern) {
			const regex = globToRegExp(pattern);
			return Array.from(store.keys()).filter((key) => regex.test(key));
		}
	};
}

// ============================================
// Redis backend
// ============================================

export async function createRedisAdapter(redisUrl: string): Promise<StorageAdapter> {
	const { getSharedRedisClient } = await import('$lib/auth/shared/redis');
	const redis = await getSharedRedisClient('SecurityStorage', { url: redisUrl });

	return {
		async get(key) {
			try {
				return await redis.get(key);
			} catch {
				return null;
			}
		},
		async set(key, value, ttlSeconds) {
			try {
				if (ttlSeconds !== undefined) {
					await redis.setEx(key, ttlSeconds, value);
				} else {
					await redis.set(key, value);
				}
			} catch (error) {
				logger.error('[Storage:Redis] set failed', { key, error });
			}
		},
		async del(key) {
			try {
				await redis.del(key);
			} catch (error) {
				logger.error('[Storage:Redis] del failed', { key, error });
			}
		},
		async ttl(key) {
			try {
				return await redis.ttl(key);
			} catch {
				return -2;
			}
		},
		async sIsMember(setKey, member) {
			try {
				return Boolean(await redis.sIsMember(setKey, member));
			} catch {
				return false;
			}
		},
		async sAdd(setKey, member) {
			try {
				await redis.sAdd(setKey, member);
			} catch (error) {
				logger.error('[Storage:Redis] sAdd failed', { setKey, error });
			}
		},
		async sRem(setKey, member) {
			try {
				await redis.sRem(setKey, member);
			} catch (error) {
				logger.error('[Storage:Redis] sRem failed', { setKey, error });
			}
		},
		async sMembers(setKey) {
			try {
				return await redis.sMembers(setKey);
			} catch {
				return [];
			}
		},
		async scanKeys(pattern) {
			try {
				const keys: string[] = [];
				let cursor = '0';
				do {
					const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
					cursor = result.cursor;
					keys.push(...result.keys);
				} while (cursor !== '0');
				return keys;
			} catch {
				return [];
			}
		}
	};
}

// ============================================
// Postgres backend
// ============================================

const PG_INIT_SQL = `
CREATE TABLE IF NOT EXISTS auth_security_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_security_sets (
  set_key TEXT NOT NULL,
  member TEXT NOT NULL,
  PRIMARY KEY (set_key, member)
);
`;

export async function createPostgresAdapter(): Promise<StorageAdapter> {
	const { getDB } = await import('$lib/auth/server/database/db');
	const pool = await getDB();

	await pool.query(PG_INIT_SQL);

	return {
		async get(key) {
			try {
				const res = await pool.query<{ value: string }>(
					`SELECT value FROM auth_security_kv
					 WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
					[key]
				);
				return res.rows[0]?.value ?? null;
			} catch {
				return null;
			}
		},
		async set(key, value, ttlSeconds) {
			try {
				const expiresAt =
					ttlSeconds !== undefined ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

				await pool.query(
					`INSERT INTO auth_security_kv (key, value, expires_at, updated_at)
					 VALUES ($1, $2, $3, NOW())
					 ON CONFLICT (key) DO UPDATE
					   SET value = EXCLUDED.value,
					       expires_at = EXCLUDED.expires_at,
					       updated_at = NOW()`,
					[key, value, expiresAt]
				);
			} catch (error) {
				logger.error('[Storage:PG] set failed', { key, error });
			}
		},
		async del(key) {
			try {
				await pool.query(`DELETE FROM auth_security_kv WHERE key = $1`, [key]);
			} catch (error) {
				logger.error('[Storage:PG] del failed', { key, error });
			}
		},
		async ttl(key) {
			try {
				const res = await pool.query<{ seconds: number | null }>(
					`SELECT EXTRACT(EPOCH FROM (expires_at - NOW()))::integer AS seconds
					 FROM auth_security_kv
					 WHERE key = $1`,
					[key]
				);
				if (!res.rows[0]) return -2;
				const seconds = res.rows[0].seconds;
				if (seconds === null) return -1;
				return Math.max(0, seconds);
			} catch {
				return -2;
			}
		},
		async sIsMember(setKey, member) {
			try {
				const res = await pool.query(
					`SELECT 1 FROM auth_security_sets WHERE set_key = $1 AND member = $2`,
					[setKey, member]
				);
				return res.rowCount !== null && res.rowCount > 0;
			} catch {
				return false;
			}
		},
		async sAdd(setKey, member) {
			try {
				await pool.query(
					`INSERT INTO auth_security_sets (set_key, member)
					 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					[setKey, member]
				);
			} catch (error) {
				logger.error('[Storage:PG] sAdd failed', { setKey, error });
			}
		},
		async sRem(setKey, member) {
			try {
				await pool.query(`DELETE FROM auth_security_sets WHERE set_key = $1 AND member = $2`, [
					setKey,
					member
				]);
			} catch (error) {
				logger.error('[Storage:PG] sRem failed', { setKey, error });
			}
		},
		async sMembers(setKey) {
			try {
				const res = await pool.query<{ member: string }>(
					`SELECT member FROM auth_security_sets WHERE set_key = $1`,
					[setKey]
				);
				return res.rows.map((r) => r.member);
			} catch {
				return [];
			}
		},
		async scanKeys(pattern) {
			try {
				// Translate glob (*, ?) to SQL LIKE, escaping literal % and _
				const sqlPattern = pattern
					.replace(/[\\%_]/g, (m) => `\\${m}`)
					.replace(/\*/g, '%')
					.replace(/\?/g, '_');
				const res = await pool.query<{ key: string }>(
					`SELECT key FROM auth_security_kv WHERE key LIKE $1`,
					[sqlPattern]
				);
				return res.rows.map((r) => r.key);
			} catch {
				return [];
			}
		}
	};
}

// ============================================
// Factory — auto-selects backend from env
// ============================================

let _adapter: StorageAdapter | null = null;

export async function createStorageAdapter(): Promise<StorageAdapter> {
	if (_adapter) return _adapter;

	const explicit = process.env.SECURITY_STORAGE?.trim() || undefined;

	// Explicit override always wins — checked before auto-selection
	if (explicit === 'memory') {
		_adapter = createMemoryAdapter();
		logger.info('[Security Storage] Using in-memory backend (SECURITY_STORAGE=memory)');
		return _adapter;
	}

	if (explicit === 'postgres' || process.env.PG_KV_STORE === 'true') {
		try {
			_adapter = await createPostgresAdapter();
			logger.info('[Security Storage] Using Postgres backend (SECURITY_STORAGE=postgres)');
			return _adapter;
		} catch (error) {
			logger.warn('[Security Storage] Postgres KV init failed, falling back to memory', { error });
			_adapter = createMemoryAdapter();
			return _adapter;
		}
	}

	if (explicit === 'redis' || (!explicit && process.env.REDIS_URL)) {
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) {
			logger.warn(
				'[Security Storage] SECURITY_STORAGE=redis but REDIS_URL is not set, falling back to memory'
			);
			_adapter = createMemoryAdapter();
			return _adapter;
		}
		try {
			_adapter = await createRedisAdapter(redisUrl);
			logger.info('[Security Storage] Using Redis backend');
			return _adapter;
		} catch (error) {
			logger.warn('[Security Storage] Redis connection failed, falling back to memory', { error });
		}
	}

	_adapter = createMemoryAdapter();
	logger.info('[Security Storage] Using in-memory backend (default)');
	return _adapter;
}

/** Reset the singleton (for testing) */
export function resetStorageAdapter(): void {
	_adapter = null;
}
