// In-memory Redis client mock for tests.
// Implements the commands used across the codebase (storage adapters,
// rate limiting, dashboard metrics) so tests exercise the real call
// paths rather than silently degrading to no-ops.

interface ListEntry {
	values: string[];
}
interface SetEntry {
	members: Set<string>;
}
interface HashEntry {
	fields: Map<string, string>;
}
interface ZSetEntry {
	members: Map<string, number>;
}
type Value = string | ListEntry | SetEntry | HashEntry | ZSetEntry;

function createStore() {
	const store = new Map<string, Value>();
	const expirations = new Map<string, number>();

	const purgeIfExpired = (key: string) => {
		const exp = expirations.get(key);
		if (exp !== undefined && exp <= Date.now()) {
			store.delete(key);
			expirations.delete(key);
		}
	};

	const getString = (key: string): string | null => {
		purgeIfExpired(key);
		const v = store.get(key);
		return typeof v === 'string' ? v : null;
	};

	const getSet = (key: string, create = false): SetEntry | undefined => {
		purgeIfExpired(key);
		let v = store.get(key) as SetEntry | undefined;
		if (!v && create) {
			v = { members: new Set() };
			store.set(key, v);
		}
		return v && 'members' in v && v.members instanceof Set ? v : undefined;
	};

	const getHash = (key: string, create = false): HashEntry | undefined => {
		purgeIfExpired(key);
		let v = store.get(key) as HashEntry | undefined;
		if (!v && create) {
			v = { fields: new Map() };
			store.set(key, v);
		}
		return v && 'fields' in v ? v : undefined;
	};

	const getZSet = (key: string, create = false): ZSetEntry | undefined => {
		purgeIfExpired(key);
		let v = store.get(key) as ZSetEntry | undefined;
		if (!v && create) {
			v = { members: new Map() };
			store.set(key, v);
		}
		return v && 'members' in v && v.members instanceof Map ? v : undefined;
	};

	const getList = (key: string, create = false): ListEntry | undefined => {
		purgeIfExpired(key);
		let v = store.get(key) as ListEntry | undefined;
		if (!v && create) {
			v = { values: [] };
			store.set(key, v);
		}
		return v && 'values' in v ? v : undefined;
	};

	const setExpiryMs = (key: string, ms: number) => {
		if (store.has(key)) expirations.set(key, Date.now() + ms);
	};

	return {
		store,
		purgeIfExpired,
		getString,
		getSet,
		getHash,
		getZSet,
		getList,
		setExpiryMs,
		expirations
	};
}

export function createClient() {
	const s = createStore();

	return {
		isOpen: true,
		isReady: true,
		on: () => {},
		once: () => {},
		connect: async () => {},
		quit: async () => {},
		ping: async () => 'PONG',

		// Strings
		get: async (key: string) => s.getString(key),
		set: async (key: string, value: string) => {
			s.store.set(key, String(value));
			s.expirations.delete(key);
			return 'OK';
		},
		setEx: async (key: string, seconds: number, value: string) => {
			s.store.set(key, String(value));
			s.setExpiryMs(key, seconds * 1000);
			return 'OK';
		},
		del: async (...keys: string[]) => {
			let n = 0;
			for (const key of keys.flat()) {
				if (s.store.delete(key)) n++;
				s.expirations.delete(key);
			}
			return n;
		},
		exists: async (key: string) => {
			s.purgeIfExpired(key);
			return s.store.has(key) ? 1 : 0;
		},
		ttl: async (key: string) => {
			s.purgeIfExpired(key);
			if (!s.store.has(key)) return -2;
			const exp = s.expirations.get(key);
			if (exp === undefined) return -1;
			return Math.max(0, Math.ceil((exp - Date.now()) / 1000));
		},
		pExpire: async (key: string, ms: number) => {
			s.setExpiryMs(key, ms);
			return 1;
		},
		expire: async (key: string, seconds: number) => {
			s.setExpiryMs(key, seconds * 1000);
			return 1;
		},
		incr: async (key: string) => {
			const v = (parseInt(s.getString(key) ?? '0', 10) || 0) + 1;
			s.store.set(key, String(v));
			return v;
		},

		// Sets
		sAdd: async (key: string, member: string) => {
			const set = s.getSet(key, true)!;
			const before = set.members.size;
			set.members.add(String(member));
			return set.members.size - before;
		},
		sRem: async (key: string, member: string) => {
			const set = s.getSet(key);
			return set?.members.delete(String(member)) ? 1 : 0;
		},
		sIsMember: async (key: string, member: string) => {
			const set = s.getSet(key);
			return set?.members.has(String(member)) ? 1 : 0;
		},
		sMembers: async (key: string) => Array.from(s.getSet(key)?.members ?? []),

		// Hashes
		hSet: async (key: string, field: string, value: string) => {
			const h = s.getHash(key, true)!;
			const isNew = !h.fields.has(field);
			h.fields.set(field, String(value));
			return isNew ? 1 : 0;
		},
		hGet: async (key: string, field: string) => s.getHash(key)?.fields.get(field) ?? null,
		hGetAll: async (key: string) => {
			const h = s.getHash(key);
			return h ? Object.fromEntries(h.fields) : {};
		},
		hIncrBy: async (key: string, field: string, increment: number) => {
			const h = s.getHash(key, true)!;
			const v = (parseInt(h.fields.get(field) ?? '0', 10) || 0) + increment;
			h.fields.set(field, String(v));
			return v;
		},

		// Sorted sets
		zAdd: async (key: string, score: number, member: string) => {
			const z = s.getZSet(key, true)!;
			const isNew = !z.members.has(member);
			z.members.set(member, score);
			return isNew ? 1 : 0;
		},
		zCard: async (key: string) => s.getZSet(key)?.members.size ?? 0,
		zRange: async (key: string, start: number, stop: number, opts?: { WITHSCORES?: boolean }) => {
			const z = s.getZSet(key);
			if (!z) return [];
			const sorted = [...z.members.entries()].sort((a, b) => a[1] - b[1]);
			const end = stop === -1 ? sorted.length : stop + 1;
			const slice = sorted.slice(start, end);
			if (opts && typeof opts === 'object' && 'WITHSCORES' in opts) {
				return slice.flatMap(([member, score]) => [member, String(score)]);
			}
			return slice.map(([member]) => member);
		},
		zRemRangeByScore: async (key: string, min: number, max: number) => {
			const z = s.getZSet(key);
			if (!z) return 0;
			let n = 0;
			for (const [member, score] of z.members) {
				if (score >= min && score <= max) {
					z.members.delete(member);
					n++;
				}
			}
			return n;
		},

		// Lists
		lPush: async (key: string, ...values: string[]) => {
			const l = s.getList(key, true)!;
			l.values.unshift(...values.map(String));
			return l.values.length;
		},
		lRange: async (key: string, start: number, stop: number) => {
			const l = s.getList(key);
			if (!l) return [];
			const end = stop === -1 ? l.values.length : stop + 1;
			return l.values.slice(start, end);
		},
		lTrim: async (key: string, start: number, stop: number) => {
			const l = s.getList(key);
			if (!l) return 'OK';
			const end = stop === -1 ? l.values.length : stop + 1;
			l.values = l.values.slice(start, end);
			return 'OK';
		},

		// Scan
		scan: async (cursor: string | number, opts?: { MATCH?: string; COUNT?: number }) => {
			for (const key of s.store.keys()) s.purgeIfExpired(key);
			const pattern = opts?.MATCH;
			const regex = pattern
				? new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
				: null;
			const keys = [...s.store.keys()].filter((k) => !regex || regex.test(k));
			return { cursor: '0', keys };
		},

		// Scripts — emulate the sliding-window Lua script used by the
		// rate limiter. scriptLoad returns a fake SHA; evalSha performs
		// the same algorithm in JS.
		scriptLoad: async (_script: string) => 'mock-script-sha',
		evalSha: async (_sha: string, opts: { keys?: string[]; arguments?: string[] } = {}) => {
			const key = opts.keys?.[0];
			const [nowStr, windowMsStr, maxStr, requestId] = opts.arguments ?? [];
			if (!key || !nowStr || !windowMsStr || !maxStr || !requestId) return {};
			const now = Number(nowStr);
			const windowMs = Number(windowMsStr);
			const maxRequests = Number(maxStr);
			const windowStart = now - windowMs;

			const z = s.getZSet(key, true)!;
			for (const [member, score] of z.members) {
				if (score <= windowStart) z.members.delete(member);
			}
			if (z.members.size >= maxRequests) {
				const oldest = Math.min(...z.members.values());
				return [0, z.members.size, oldest];
			}
			z.members.set(requestId, now);
			s.setExpiryMs(key, windowMs + 1000);
			return [1, z.members.size, 0];
		},

		info: async (section?: string) => {
			if (section === 'memory') {
				return 'mem_fragmentation_ratio:1.10\r\n';
			}
			if (section === 'keyspace') {
				return 'db0:keys=1,expires=0,avg_ttl=0\r\n';
			}
			return 'redis_version:7.0.0\r\n';
		},
		configGet: async (key: string) => ({ [key]: key === 'protected-mode' ? 'yes' : '' }),
		// Used by scripts/redis/test-redis-production-readiness.ts
		sendCommand: async (args: string[]) => {
			const cmd = args.join(' ').toUpperCase();
			if (cmd === 'ACL LIST') {
				return ['user default on nopass ~* +@all'];
			}
			if (cmd.startsWith('CONFIG GET')) {
				return [
					'maxmemory',
					'104857600',
					'maxclients',
					'1000',
					'save',
					'900 1 300 10',
					'tcp-keepalive',
					'60'
				];
			}
			if (cmd === 'SLOWLOG LEN') {
				return 0;
			}
			return {};
		},
		multi() {
			return this;
		},
		exec: async () => ({})
	};
}

export default { createClient };
