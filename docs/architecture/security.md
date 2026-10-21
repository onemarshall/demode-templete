# Unified Security Plugin Architecture

## Overview

The unified `securityPlugin` consolidates rate limiting, blocking, geo intelligence, CAPTCHA,device fingerprinting, behavior analysis, and analytics into a single Better Auth plugin withshared per-request context and one unified risk score.

### Goals

1. **Single plugin** — One import, one configuration object
2. **Unified risk assessment** — One risk score per request, not five
3. **Shared context** — Features share data instead of duplicating work
4. **Integrated analytics** — Every security event feeds the dashboard
5. **Feature flags** — Enable/disable individual features without separate plugins

---

## Directory Structure

```text
src/lib/auth/security/
├── index.ts                    # Main export: securityPlugin()
├── types.ts                    # All TypeScript types
├── config.ts                   # Configuration schema + defaults
├── plugin.ts                   # Plugin factory
│
├── core/
│   ├── context.ts              # SecurityContext - shared per-request state
│   ├── risk-engine.ts          # Unified risk scoring
│   ├── cache.ts                # Unified in-memory cache manager
│   └── helpers.ts              # Shared utilities (IP, hashing, etc.)
│
├── storage/
│   ├── index.ts                # Storage factory + interface
│   ├── adapter.ts              # StorageAdapter interface
│   ├── postgres.ts             # PostgreSQL adapter (default)
│   ├── redis.ts                # Redis adapter (optional, high-perf)
│   └── memory.ts               # In-memory adapter (dev/testing)
│
├── features/
│   ├── index.ts                # Feature registry
│   ├── captcha/
│   │   ├── index.ts            # CAPTCHA feature
│   │   ├── providers/          # hCaptcha, reCAPTCHA, Turnstile, Cap.js
│   │   └── bypass.ts           # Bypass token management
│   ├── rate-limit/
│   │   ├── index.ts            # Rate limiting feature
│   │   ├── sliding-window.ts   # Sliding window algorithm
│   │   └── rules.ts            # Rule matching
│   ├── geo/
│   │   ├── index.ts            # Geolocation feature
│   │   ├── bigdatacloud.ts     # BigDataCloud API client
│   │   ├── reputation.ts       # IP reputation checks
│   │   └── velocity.ts         # Impossible travel detection
│   ├── device/
│   │   ├── index.ts            # Device fingerprinting feature
│   │   ├── fingerprint.ts      # Fingerprint extraction
│   │   └── trust.ts            # Device trust management
│   ├── behavior/
│   │   ├── index.ts            # Behavior analysis feature
│   │   ├── patterns.ts         # Pattern detection
│   │   └── bot-detection.ts    # Bot/automation detection
│   └── blocking/
│       ├── index.ts            # Blocking feature
│       ├── temp-block.ts       # Temporary blocks
│       └── ip-block.ts         # Permanent IP blocks
│
├── analytics/
│   ├── index.ts                # Analytics module
│   ├── collector.ts            # Event collection
│   ├── metrics.ts              # Metrics aggregation
│   ├── alerts.ts               # Alert generation + thresholds
│   └── dashboard.ts            # Dashboard data endpoints
│
├── hooks/
│   ├── index.ts                # Hook exports
│   ├── before.ts               # Single coordinated before hook
│   └── after.ts                # Single coordinated after hook
│
├── endpoints/
│   ├── index.ts                # All endpoint definitions
│   ├── status.ts               # GET /security/status
│   ├── captcha.ts              # POST /security/verify-captcha
│   ├── admin.ts                # Admin-only endpoints
│   └── dashboard.ts            # Dashboard data endpoints
│
└── client/
    ├── index.ts                # Client plugin export
    ├── plugin.ts               # Better Auth client plugin
    ├── standalone.ts           # Standalone client (no plugin)
    ├── store.ts                # Svelte store (SSR-safe)
    └── utils.ts                # Client utilities
```

---

## Core Concepts

### 1. SecurityContext

A per-request object that accumulates security data as features run:

```typescript
interface SecurityContext {
	// Request identification
	readonly requestId: string;
	readonly ip: string;
	readonly userAgent: string;
	readonly path: string;
	readonly method: string;
	readonly timestamp: number;

	// User info (if authenticated)
	userId?: string;
	sessionId?: string;
	userRoles?: string[];

	// Accumulated by features
	geo?: GeoData;
	device?: DeviceFingerprint;
	behavior?: BehaviorAnalysis;
	reputation?: IPReputation;

	// Risk assessment (built incrementally)
	riskFactors: RiskFactor[];
	riskScore: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';

	// Decisions
	blocked: boolean;
	blockReason?: string;
	captchaRequired: boolean;
	captchaPassed: boolean;
	rateLimited: boolean;
	rateLimitInfo?: RateLimitInfo;

	// Event emitter for analytics (decoupled from direct analytics calls)
	emit(event: SecurityEventType, data?: Record<string, unknown>): void;

	// Collected events (populated by emit calls)
	readonly events: SecurityEvent[];
}

type SecurityEventType =
	| 'blocked'
	| 'captcha_required'
	| 'captcha_passed'
	| 'captcha_failed'
	| 'rate_limited'
	| 'feature_warning'
	| 'feature_error'
	| 'risk_elevated'
	| 'request_complete';

interface RiskFactor {
	source: string; // e.g., 'geo', 'device', 'behavior'
	factor: string; // e.g., 'vpn_detected', 'new_device'
	score: number; // Contribution to risk score
	details?: unknown;
}
```

### 2. Feature Interface

Each feature implements a standard interface:

```typescript
interface SecurityFeature {
	readonly id: string;
	readonly name: string;

	/** Execution priority (lower runs first). Use FEATURE_PRIORITY constants. */
	readonly priority: number;

	/** Config key for this feature (e.g., 'geo', 'rateLimit') */
	readonly configKey: keyof SecurityConfig['features'];

	// Called during plugin init
	init?(config: SecurityConfig): Promise<void>;

	// Called in before hook - can modify context
	// Return null to skip (e.g., feature disabled or N/A for this request)
	check?(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null>;

	// Called in after hook - for recording/cleanup
	record?(ctx: SecurityContext, config: SecurityConfig): Promise<void>;

	// For cache management
	clearCache?(): void;
	getCacheStats?(): CacheStats;
}

interface FeatureResult {
	// Should this feature block the request?
	block?: boolean;
	blockReason?: string;
	blockResponse?: Response;

	// Risk contribution
	riskFactors?: RiskFactor[];

	// Feature-specific data to add to context
	data?: Record<string, unknown>;

	// Partial failure info (feature ran but encountered non-fatal errors)
	warnings?: string[];
}
```

### Feature Priority Constants

Features are sorted by priority before execution. Lower values run first:

```typescript
// core/feature.ts
export const FEATURE_PRIORITY = {
	BLOCKING: 0, // Check blocks first (fastest rejection)
	RATE_LIMIT: 10, // Then rate limits
	CAPTCHA: 20, // Then CAPTCHA bypass check
	GEO: 30, // Then geo/reputation (may call external API)
	DEVICE: 40, // Then device analysis
	BEHAVIOR: 50 // Then behavior (most expensive)
} as const;

export type FeaturePriority = (typeof FEATURE_PRIORITY)[keyof typeof FEATURE_PRIORITY];
```

### Unified Cache Manager

Consolidates the 6+ duplicate LRU cache implementations across plugins:

```typescript
// core/cache.ts
export class CacheManager<K, V> {
	private cache = new Map<K, { value: V; expiresAt: number }>();
	private hits = 0;
	private misses = 0;

	constructor(
		private readonly name: string,
		private readonly maxSize: number,
		private readonly defaultTtlMs: number
	) {}

	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			this.misses++;
			return undefined;
		}
		if (entry.expiresAt < Date.now()) {
			this.cache.delete(key);
			this.misses++;
			return undefined;
		}
		this.hits++;
		return entry.value;
	}

	set(key: K, value: V, ttlMs?: number): void {
		this.evictIfNeeded();
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs)
		});
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	getStats(): { name: string; size: number; maxSize: number; hitRate: number } {
		const total = this.hits + this.misses;
		return {
			name: this.name,
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: total > 0 ? this.hits / total : 0
		};
	}

	private evictIfNeeded(): void {
		if (this.cache.size < this.maxSize) return;

		const now = Date.now();
		const deleteCount = Math.ceil(this.maxSize * 0.2);
		let deleted = 0;

		// First pass: remove expired
		for (const [key, entry] of this.cache) {
			if (entry.expiresAt < now) {
				this.cache.delete(key);
				deleted++;
			}
			if (deleted >= deleteCount) return;
		}

		// Second pass: LRU (oldest first since Map maintains insertion order)
		for (const key of this.cache.keys()) {
			if (deleted >= deleteCount) return;
			this.cache.delete(key);
			deleted++;
		}
	}
}

// Singleton caches (replaces 6+ individual Map caches across plugins)
export const caches = {
	geo: new CacheManager<string, GeoData>('geo', 500, 30_000),
	deviceTrust: new CacheManager<string, boolean>('deviceTrust', 500, 60_000),
	pathMatch: new CacheManager<string, boolean>('pathMatch', 500, 300_000),
	ipReputation: new CacheManager<string, IPReputationData>('ipReputation', 1000, 300_000),
	analysis: new CacheManager<string, FraudAnalysis>('analysis', 200, 30_000),
	bypass: new CacheManager<string, BypassData>('bypass', 200, 3600_000)
};

// Aggregate stats for monitoring
export function getAllCacheStats() {
	return Object.values(caches).map((c) => c.getStats());
}

export function clearAllCaches() {
	Object.values(caches).forEach((c) => c.clear());
}
```

### 3. Risk Engine

Centralized risk calculation:

```typescript
// risk-engine.ts
export function calculateRiskScore(factors: RiskFactor[]): number {
	let score = 0;
	for (const factor of factors) {
		score += factor.score;
	}
	return Math.min(100, Math.max(0, score));
}

export function getRiskLevel(score: number): RiskLevel {
	if (score >= 80) return 'critical';
	if (score >= 60) return 'high';
	if (score >= 40) return 'medium';
	return 'low';
}

export function shouldBlock(score: number, config: SecurityConfig): boolean {
	return score >= config.blockThreshold;
}

export function shouldRequireCaptcha(score: number, config: SecurityConfig): boolean {
	return score >= config.captchaThreshold && score < config.blockThreshold;
}
```

### 4. Unified Hooks

Single before hook that orchestrates all features with priority sorting and partial failure handling:

```typescript
// hooks/before.ts
export function createBeforeHook(config: SecurityConfig, features: SecurityFeature[]) {
	// Sort features by priority once at creation time
	const sortedFeatures = [...features].sort((a, b) => a.priority - b.priority);

	return createAuthMiddleware(async (ctx) => {
		// 1. Create SecurityContext
		const securityCtx = createSecurityContext(ctx.request);

		// 2. Run features in priority order (with partial failure handling)
		for (const feature of sortedFeatures) {
			if (!isFeatureEnabled(feature.configKey, config)) continue;

			try {
				const result = await feature.check?.(securityCtx, config);

				// Feature returned null = skip (disabled or N/A)
				if (!result) continue;

				// Accumulate risk factors
				if (result.riskFactors) {
					securityCtx.riskFactors.push(...result.riskFactors);
				}

				// Merge feature-specific data into context
				if (result.data) {
					Object.assign(securityCtx, result.data);
				}

				// Log partial failures (feature ran but had issues)
				if (result.warnings?.length) {
					securityCtx.emit('feature_warning', {
						feature: feature.id,
						warnings: result.warnings
					});
				}

				// Immediate block (e.g., country blocked, IP blocklisted)
				if (result.block) {
					securityCtx.emit('blocked', { reason: result.blockReason, feature: feature.id });
					return { context: ctx, response: result.blockResponse };
				}
			} catch (error) {
				// Partial failure: log and continue (fail-open by default)
				securityCtx.emit('feature_error', {
					feature: feature.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				});

				// In fail-closed mode, add risk for failed feature
				if (config.resilience?.failMode === 'closed') {
					securityCtx.riskFactors.push({
						source: feature.id,
						factor: 'feature_unavailable',
						score: 10,
						details: { error: error instanceof Error ? error.message : 'Unknown' }
					});
				}
			}
		}

		// 3. Calculate final risk score
		securityCtx.riskScore = calculateRiskScore(securityCtx.riskFactors);
		securityCtx.riskLevel = getRiskLevel(securityCtx.riskScore);

		// 4. Make decisions based on risk
		if (shouldBlock(securityCtx.riskScore, config)) {
			securityCtx.blocked = true;
			securityCtx.emit('blocked', { reason: 'high_risk', riskScore: securityCtx.riskScore });
			return { context: ctx, response: createBlockedResponse(securityCtx) };
		}

		if (shouldRequireCaptcha(securityCtx.riskScore, config)) {
			if (!securityCtx.captchaPassed) {
				securityCtx.captchaRequired = true;
				securityCtx.emit('captcha_required', { riskScore: securityCtx.riskScore });
				return { context: ctx, response: createCaptchaResponse(securityCtx) };
			}
		}

		// 5. Attach context for after hook
		(ctx.context as any).securityContext = securityCtx;

		return { context: ctx };
	});
}
```

---

## Storage Architecture

The security plugin uses a **pluggable storage adapter pattern**, mirroring
Better Auth's database adapter approach. This allows you to start with PostgreSQL
(reusing your existing database) and optionally add Redis for high-performance scenarios.

### Storage Adapter Interface

```typescript
// storage/adapter.ts
export interface StorageAdapter {
	// Rate limiting
	incrementCounter(key: string, ttlSeconds: number): Promise<number>;
	getCounter(key: string): Promise<number>;

	// Blocking
	setBlock(key: string, data: BlockData, ttlSeconds: number): Promise<void>;
	getBlock(key: string): Promise<BlockData | null>;
	deleteBlock(key: string): Promise<void>;

	// CAPTCHA bypass
	setBypass(token: string, data: BypassData, ttlSeconds: number): Promise<void>;
	getBypass(token: string): Promise<BypassData | null>;
	deleteBypass(token: string): Promise<void>;

	// Velocity/location history
	pushLocation(userId: string, location: LocationEntry): Promise<void>;
	getRecentLocations(userId: string, limit: number): Promise<LocationEntry[]>;

	// Device trust (permanent storage)
	upsertDevice(fingerprint: string, data: DeviceData): Promise<void>;
	getDevice(fingerprint: string): Promise<DeviceData | null>;

	// Analytics events
	recordEvent(event: SecurityEvent): Promise<void>;
	getMetrics(timeRange: TimeRange): Promise<SecurityMetrics>;

	// Cleanup
	cleanup(): Promise<void>;
}
```

### PostgreSQL Adapter (Default)

Reuses Better Auth's database connection via Kysely:

```typescript
// storage/postgres.ts
import type { Kysely } from 'kysely';
import type { StorageAdapter } from './adapter';

export function createPostgresAdapter(db: Kysely<any>): StorageAdapter {
	return {
		async incrementCounter(key: string, ttlSeconds: number): Promise<number> {
			const windowStart = new Date(Date.now() - ttlSeconds * 1000);

			// Upsert with atomic increment
			const result = await db
				.insertInto('security_rate_limits')
				.values({
					identifier: key,
					window_start: new Date(),
					count: 1
				})
				.onConflict((oc) =>
					oc.columns(['identifier']).doUpdateSet((eb) => ({
						count: eb('security_rate_limits.count', '+', 1),
						window_start: new Date()
					}))
				)
				.returning('count')
				.executeTakeFirst();

			return result?.count ?? 1;
		},

		async setBlock(key: string, data: BlockData, ttlSeconds: number): Promise<void> {
			await db
				.insertInto('security_blocks')
				.values({
					identifier: key,
					blocked_until: new Date(Date.now() + ttlSeconds * 1000),
					reason: data.reason,
					attempt_count: data.attemptCount
				})
				.onConflict((oc) =>
					oc.columns(['identifier']).doUpdateSet({
						blocked_until: new Date(Date.now() + ttlSeconds * 1000),
						reason: data.reason,
						attempt_count: data.attemptCount
					})
				)
				.execute();
		},

		async getBlock(key: string): Promise<BlockData | null> {
			const row = await db
				.selectFrom('security_blocks')
				.selectAll()
				.where('identifier', '=', key)
				.where('blocked_until', '>', new Date())
				.executeTakeFirst();

			return row ? { reason: row.reason, attemptCount: row.attempt_count } : null;
		}

		// ... other methods
	};
}
```

### Redis Adapter (Optional, High-Performance)

For high-traffic scenarios:

```typescript
// storage/redis.ts
import type { Redis } from 'ioredis';
import type { StorageAdapter } from './adapter';

export function createRedisAdapter(redis: Redis): StorageAdapter {
	const PREFIX = 'security:';

	return {
		async incrementCounter(key: string, ttlSeconds: number): Promise<number> {
			const fullKey = `${PREFIX}rate:${key}`;
			const count = await redis.incr(fullKey);
			if (count === 1) {
				await redis.expire(fullKey, ttlSeconds);
			}
			return count;
		},

		async setBlock(key: string, data: BlockData, ttlSeconds: number): Promise<void> {
			await redis.setex(`${PREFIX}block:${key}`, ttlSeconds, JSON.stringify(data));
		},

		async getBlock(key: string): Promise<BlockData | null> {
			const data = await redis.get(`${PREFIX}block:${key}`);
			return data ? JSON.parse(data) : null;
		}

		// ... other methods (faster for counters, TTL, sliding windows)
	};
}
```

### Hybrid Adapter (Best of Both)

Use Redis for hot data, PostgreSQL for cold/permanent data:

```typescript
// storage/hybrid.ts
export function createHybridAdapter(
	postgres: StorageAdapter,
	redis: StorageAdapter
): StorageAdapter {
	return {
		// Hot data → Redis (fast, TTL-based)
		incrementCounter: redis.incrementCounter,
		getCounter: redis.getCounter,
		setBlock: redis.setBlock,
		getBlock: redis.getBlock,
		deleteBlock: redis.deleteBlock,
		setBypass: redis.setBypass,
		getBypass: redis.getBypass,
		deleteBypass: redis.deleteBypass,

		// Cold data → PostgreSQL (durable, queryable)
		upsertDevice: postgres.upsertDevice,
		getDevice: postgres.getDevice,
		recordEvent: postgres.recordEvent,
		getMetrics: postgres.getMetrics,

		// Location history → PostgreSQL (needs queries)
		pushLocation: postgres.pushLocation,
		getRecentLocations: postgres.getRecentLocations,

		cleanup: async () => {
			await Promise.all([postgres.cleanup(), redis.cleanup()]);
		}
	};
}
```

### Flexible Storage Configuration

The storage system is designed for **maximum flexibility** — choose storage per component:

```typescript
type StorageBackend = 'postgres' | 'redis' | 'memory';

interface StorageOptions {
	/**
	 * Database connections
	 */
	connections?: {
		/** PostgreSQL - defaults to Better Auth's database */
		postgres?: Pool | Kysely<any> | { connectionString: string };

		/** Redis - optional, for high-performance scenarios */
		redis?: Redis | { url: string };

		/** Separate security database (isolates from CMS) */
		securityDatabase?: Pool | { connectionString: string };
	};

	/**
	 * Default storage backend for all components
	 * @default 'postgres'
	 */
	defaultBackend?: StorageBackend;

	/**
	 * Per-component storage overrides
	 * Choose which backend each component uses
	 */
	components?: {
		/** Rate limiting counters (high frequency reads/writes) */
		rateLimits?: StorageBackend;

		/** Temporary blocks (medium frequency, TTL-based) */
		blocks?: StorageBackend;

		/** CAPTCHA bypass tokens (medium frequency, TTL-based) */
		bypass?: StorageBackend;

		/** IP/geo cache (high reads, low writes) */
		geoCache?: StorageBackend;

		/** Device trust records (permanent, queryable) */
		devices?: StorageBackend;

		/** Location history for velocity (queryable) */
		locations?: StorageBackend;

		/** Security events/analytics (append-only, queryable) */
		events?: StorageBackend;

		/** Permanent IP blocklist (admin-managed) */
		blocklist?: StorageBackend;
	};

	/**
	 * Data retention settings (prevents unbounded growth)
	 */
	retention?: {
		/** Rate limit window in seconds (default: 3600) */
		rateLimitTtlSeconds?: number;

		/** Block data TTL in seconds (default: 86400) */
		blockTtlSeconds?: number;

		/** Keep events for N days (default: 7) */
		eventRetentionDays?: number;

		/** Max events to keep (oldest deleted first, default: 1000000) */
		maxEvents?: number;

		/** Location history retention days (default: 7) */
		locationRetentionDays?: number;

		/** Cleanup interval in minutes (default: 15) */
		cleanupIntervalMinutes?: number;
	};

	/**
	 * Performance tuning
	 */
	performance?: {
		/** Sample rate for events during high traffic (0.0-1.0, default: 1.0) */
		eventSamplingRate?: number;

		/** Batch event writes (default: true) */
		batchEventWrites?: boolean;

		/** Batch size for event writes (default: 100) */
		eventBatchSize?: number;

		/** Batch flush interval in ms (default: 5000) */
		eventBatchIntervalMs?: number;

		/** Max PostgreSQL connections for security (default: 5) */
		maxPostgresConnections?: number;

		/** Enable in-memory LRU cache layer (default: true) */
		enableMemoryCache?: boolean;

		/** Memory cache size (default: 10000 entries) */
		memoryCacheSize?: number;
	};
}
```

### Storage Backend Selection Guide

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Storage Backend Decision Matrix                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Component        │ Frequency   │ TTL?  │ Queries? │ Recommended Backend    │
│  ─────────────────┼─────────────┼───────┼──────────┼────────────────────────│
│  rateLimits       │ Very High   │ Yes   │ No       │ Redis > Memory > PG    │
│  blocks           │ High        │ Yes   │ No       │ Redis > Memory > PG    │
│  bypass           │ Medium      │ Yes   │ No       │ Redis > Memory > PG    │
│  geoCache         │ High read   │ Yes   │ No       │ Redis > Memory > PG    │
│  devices          │ Medium      │ No    │ Yes      │ PostgreSQL only        │
│  locations        │ Low         │ Yes   │ Yes      │ PostgreSQL only        │
│  events           │ High write  │ Yes   │ Yes      │ PostgreSQL (sampled)   │
│  blocklist        │ Low         │ No    │ Yes      │ PostgreSQL only        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Usage Examples

### Level 1: Simple Start (PostgreSQL Only)

```typescript
// Uses Better Auth's existing database - zero config
export const auth = betterAuth({
	database: new Pool({ connectionString: DATABASE_URL }),
	plugins: [
		securityPlugin({
			// Defaults: PostgreSQL for everything
		})
	]
});
```

### Level 2: Add Memory Cache (Single Server, No Redis)

```typescript
securityPlugin({
	storage: {
		defaultBackend: 'postgres',
		components: {
			rateLimits: 'memory', // Fast, but single-instance only
			blocks: 'memory',
			bypass: 'memory',
			geoCache: 'memory'
		},
		performance: {
			enableMemoryCache: true,
			memoryCacheSize: 50000
		}
	}
});
```

### Level 3: Add Redis for Hot Data

```typescript
import Redis from 'ioredis';

securityPlugin({
	storage: {
		connections: {
			redis: new Redis(REDIS_URL)
		},
		defaultBackend: 'postgres',
		components: {
			// Hot path → Redis
			rateLimits: 'redis',
			blocks: 'redis',
			bypass: 'redis',
			geoCache: 'redis',
			// Cold/queryable → PostgreSQL
			devices: 'postgres',
			locations: 'postgres',
			events: 'postgres',
			blocklist: 'postgres'
		}
	}
});
```

### Level 4: Isolate from CMS (Separate Security DB)

```typescript
securityPlugin({
	storage: {
		connections: {
			// Directus/CMS database (read-only for security)
			postgres: new Pool({ connectionString: DIRECTUS_DATABASE_URL }),
			// Dedicated security database
			securityDatabase: new Pool({
				connectionString: SECURITY_DATABASE_URL,
				max: 10
			})
		},
		// All security data goes to isolated database
		defaultBackend: 'postgres' // Uses securityDatabase when provided
	}
});
```

### Level 5: Full Production Setup (Redis + Isolated DB + Tuning)

```typescript
securityPlugin({
	storage: {
		connections: {
			securityDatabase: new Pool({
				connectionString: SECURITY_DATABASE_URL,
				max: 10
			}),
			redis: new Redis(REDIS_URL)
		},
		defaultBackend: 'postgres',
		components: {
			rateLimits: 'redis',
			blocks: 'redis',
			bypass: 'redis',
			geoCache: 'redis',
			devices: 'postgres',
			locations: 'postgres',
			events: 'postgres',
			blocklist: 'postgres'
		},
		retention: {
			eventRetentionDays: 14,
			maxEvents: 500000,
			locationRetentionDays: 7,
			cleanupIntervalMinutes: 10
		},
		performance: {
			eventSamplingRate: 0.5, // Store 50% of events
			batchEventWrites: true,
			eventBatchSize: 200,
			enableMemoryCache: true, // L1 cache even with Redis
			memoryCacheSize: 10000
		}
	}
});
```

### Level 6: Redis Only (Maximum Performance, Ephemeral)

```typescript
securityPlugin({
	storage: {
		connections: {
			redis: new Redis(REDIS_URL)
		},
		defaultBackend: 'redis',
		// Everything in Redis - fast but data loss on restart
		// Note: devices/blocklist should still use postgres for durability
		components: {
			devices: 'postgres', // Keep permanent data in DB
			blocklist: 'postgres'
		}
	}
});
```

### Storage Factory Implementation

```typescript
// storage/index.ts
export function createStorageManager(
	options: StorageOptions,
	betterAuthDb: Kysely<any>
): StorageManager {
	// Resolve connections
	const postgres =
		options.connections?.securityDatabase ?? options.connections?.postgres ?? betterAuthDb;

	const redis = options.connections?.redis
		? typeof options.connections.redis === 'object' && 'url' in options.connections.redis
			? new Redis(options.connections.redis.url)
			: options.connections.redis
		: null;

	// Create adapters
	const adapters: Record<StorageBackend, StorageAdapter | null> = {
		postgres: createPostgresAdapter(postgres),
		redis: redis ? createRedisAdapter(redis) : null,
		memory: createMemoryAdapter(options.performance?.memoryCacheSize ?? 10000)
	};

	// Default backend
	const defaultBackend = options.defaultBackend ?? 'postgres';

	// Resolve backend for each component
	function getAdapter(component: keyof StorageOptions['components']): StorageAdapter {
		const backend = options.components?.[component] ?? defaultBackend;
		const adapter = adapters[backend];

		if (!adapter) {
			if (backend === 'redis') {
				throw new Error(
					`Redis connection required for ${component}. Provide storage.connections.redis`
				);
			}
			// Fallback to postgres
			return adapters.postgres!;
		}

		return adapter;
	}

	return {
		rateLimits: getAdapter('rateLimits'),
		blocks: getAdapter('blocks'),
		bypass: getAdapter('bypass'),
		geoCache: getAdapter('geoCache'),
		devices: getAdapter('devices'),
		locations: getAdapter('locations'),
		events: getAdapter('events'),
		blocklist: getAdapter('blocklist'),

		// Cleanup all backends
		async cleanup() {
			await Promise.all([
				adapters.postgres?.cleanup(),
				adapters.redis?.cleanup(),
				adapters.memory?.cleanup()
			]);
		}
	};
}
```

### Scaling Path

```bash
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Progressive Scaling Path                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Day 1: PostgreSQL Only                                                       │
│  └─→ securityPlugin({})                                                       │
│                                                                               │
│  Week 2: Notice latency, add memory cache                                     │
│  └─→ storage: { components: { rateLimits: 'memory' } }                        │
│                                                                               │
│  Month 2: Multiple servers, need shared state                                 │
│  └─→ storage: { connections: { redis }, components: { rateLimits: 'redis' } } │
│                                                                               │
│  Month 4: CMS performance impacted                                            │
│  └─→ storage: { connections: { securityDatabase } }                           │
│                                                                               │
│  Month 6: Full production                                                     │
│  └─→ Redis for hot + Isolated DB + Sampling + Retention                       │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### PostgreSQL Schema

The security plugin adds these tables (generated via Better Auth CLI):

```sql
-- Rate limiting with sliding window
CREATE TABLE security_rate_limits (
  identifier TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temporary blocks
CREATE TABLE security_blocks (
  identifier TEXT PRIMARY KEY,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPTCHA bypass tokens
CREATE TABLE security_captcha_bypass (
  token TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device trust (permanent)
CREATE TABLE security_devices (
  fingerprint TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  trust_score INTEGER DEFAULT 50,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Location history for velocity checks
CREATE TABLE security_locations (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country_code TEXT,
  ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_locations_user_time ON security_locations (user_id, created_at DESC);

-- Security events/analytics
CREATE TABLE security_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  identifier TEXT,
  ip INET,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  risk_score INTEGER,
  risk_level TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_type_time ON security_events (event_type, created_at DESC);
CREATE INDEX idx_events_user ON security_events (user_id) WHERE user_id IS NOT NULL;

-- Permanent IP blocklist (admin-managed)
CREATE TABLE security_ip_blocklist (
  ip INET PRIMARY KEY,
  reason TEXT,
  blocked_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleanup function (run periodically)
CREATE OR REPLACE FUNCTION security_cleanup() RETURNS void AS $$
BEGIN
  DELETE FROM security_rate_limits WHERE updated_at < NOW() - INTERVAL '1 hour';
  DELETE FROM security_blocks WHERE blocked_until < NOW();
  DELETE FROM security_captcha_bypass WHERE expires_at < NOW();
  DELETE FROM security_locations WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### Performance Comparison

| Operation        | PostgreSQL | Redis  | When to use Redis        |
| ---------------- | ---------- | ------ | ------------------------ |
| Rate limit check | ~2-5ms     | ~0.2ms | >1000 req/min            |
| Block lookup     | ~1-3ms     | ~0.1ms | >500 blocks active       |
| Bypass token     | ~1-2ms     | ~0.1ms | >100 concurrent sessions |
| Event recording  | ~2-5ms     | ~0.3ms | >10K events/hour         |

**Recommendation:** Start with PostgreSQL. Monitor response times. Add Redis when:

- Rate limit checks add >5ms latency
- You see connection pool exhaustion
- You're processing >1000 requests/minute

---

## Resilience & Error Handling

The security plugin must handle failures gracefully to avoid blocking legitimate users.

### Resilience Options

```typescript
interface ResilienceOptions {
	/**
	 * Fail open (allow request) or fail closed (block request) on errors
	 * @default 'open' - Security should not block users due to infrastructure issues
	 */
	failMode?: 'open' | 'closed';

	/**
	 * Circuit breaker for external APIs (BigDataCloud)
	 */
	circuitBreaker?: {
		enabled?: boolean; // Default: true
		failureThreshold?: number; // Failures before opening (default: 5)
		resetTimeoutMs?: number; // Time before half-open (default: 30000)
	};

	/**
	 * Fallback when storage unavailable
	 * @default 'memory' - Use in-memory cache as fallback
	 */
	storageFallback?: 'memory' | 'skip';

	/**
	 * Timeout for external calls
	 */
	timeouts?: {
		bigDataCloudMs?: number; // Default: 3000
		storageOperationMs?: number; // Default: 1000
	};

	/**
	 * Retry configuration
	 */
	retry?: {
		maxAttempts?: number; // Default: 2
		backoffMs?: number; // Default: 100
	};
}
```

### Circuit Breaker Implementation

```typescript
// core/circuit-breaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
	private failures = 0;
	private lastFailure = 0;
	private state: CircuitState = 'closed';

	constructor(
		private readonly name: string,
		private readonly threshold: number = 5,
		private readonly resetTimeout: number = 30000
	) {}

	async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T | null> {
		if (this.state === 'open') {
			if (Date.now() - this.lastFailure > this.resetTimeout) {
				this.state = 'half-open';
				logSecurityEvent({
					level: 'info',
					event: 'circuit_half_open',
					requestId: '',
					metadata: { name: this.name }
				});
			} else {
				// Circuit open - return fallback or null
				return fallback ?? null;
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error);
			return fallback ?? null;
		}
	}

	private onSuccess(): void {
		if (this.state === 'half-open') {
			logSecurityEvent({
				level: 'info',
				event: 'circuit_closed',
				requestId: '',
				metadata: { name: this.name }
			});
		}
		this.failures = 0;
		this.state = 'closed';
	}

	private onFailure(error: unknown): void {
		this.failures++;
		this.lastFailure = Date.now();

		if (this.failures >= this.threshold && this.state !== 'open') {
			this.state = 'open';
			logSecurityEvent({
				level: 'warn',
				event: 'circuit_opened',
				requestId: '',
				error: { message: error instanceof Error ? error.message : 'Unknown error' },
				metadata: { name: this.name, failures: this.failures }
			});
		}
	}

	getState(): CircuitState {
		return this.state;
	}
}

// Usage in geo feature
const bigDataCloudCircuit = new CircuitBreaker('bigdatacloud', 5, 30000);

async function fetchGeoData(ip: string): Promise<GeoData | null> {
	return bigDataCloudCircuit.execute(
		() => callBigDataCloudAPI(ip),
		getCachedGeoData(ip) // Fallback to cached data
	);
}
```

### Graceful Degradation

```typescript
// features/geo/index.ts
export const geoFeature: SecurityFeature = {
	id: 'geo',
	name: 'Geolocation & IP Intelligence',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult> {
		const geoConfig = config.features?.geo;
		if (!geoConfig) return { riskFactors: [] };

		try {
			// Try to get geo data with circuit breaker
			const geoData = await fetchGeoData(ctx.ip);

			if (!geoData) {
				// API unavailable - use fallback strategy
				logSecurityEvent({
					level: 'warn',
					event: 'geo_fallback',
					requestId: ctx.requestId,
					ip: ctx.ip
				});

				if (config.resilience?.failMode === 'closed') {
					// Fail closed: add risk for unknown
					return {
						riskFactors: [{ source: 'geo', factor: 'unknown_location', score: 10 }]
					};
				}

				// Fail open: allow with no geo risk
				return { riskFactors: [] };
			}

			// Normal processing with geo data
			return processGeoData(geoData, ctx, geoConfig);
		} catch (error) {
			logSecurityEvent({
				level: 'error',
				event: 'geo_error',
				requestId: ctx.requestId,
				ip: ctx.ip,
				error: { message: error instanceof Error ? error.message : 'Unknown' }
			});

			// Always fail open on unexpected errors
			return { riskFactors: [] };
		}
	}
};
```

---

## Structured Logging

All security events use a consistent JSON format for log aggregation.

### Log Event Interface

```typescript
// core/logger.ts
interface SecurityLogEvent {
	level: 'debug' | 'info' | 'warn' | 'error';
	event: string;
	requestId: string;
	ip?: string;
	userId?: string;
	sessionId?: string;
	path?: string;
	riskScore?: number;
	riskLevel?: string;
	duration?: number;
	error?: { message: string; stack?: string; code?: string };
	metadata?: Record<string, unknown>;
}

export function logSecurityEvent(event: SecurityLogEvent): void {
	const log = {
		timestamp: new Date().toISOString(),
		service: 'security',
		...event
	};

	// JSON format for log aggregation (ELK, Datadog, etc.)
	switch (event.level) {
		case 'error':
			console.error(JSON.stringify(log));
			break;
		case 'warn':
			console.warn(JSON.stringify(log));
			break;
		case 'debug':
			if (process.env.NODE_ENV === 'development') {
				console.debug(JSON.stringify(log));
			}
			break;
		default:
			console.log(JSON.stringify(log));
	}
}

// Convenience wrappers
export const securityLogger = {
	debug: (event: string, ctx: SecurityContext, metadata?: Record<string, unknown>) =>
		logSecurityEvent({ level: 'debug', event, requestId: ctx.requestId, ip: ctx.ip, metadata }),

	info: (event: string, ctx: SecurityContext, metadata?: Record<string, unknown>) =>
		logSecurityEvent({ level: 'info', event, requestId: ctx.requestId, ip: ctx.ip, metadata }),

	warn: (event: string, ctx: SecurityContext, metadata?: Record<string, unknown>) =>
		logSecurityEvent({ level: 'warn', event, requestId: ctx.requestId, ip: ctx.ip, metadata }),

	error: (event: string, ctx: SecurityContext, error: Error, metadata?: Record<string, unknown>) =>
		logSecurityEvent({
			level: 'error',
			event,
			requestId: ctx.requestId,
			ip: ctx.ip,
			error: { message: error.message, stack: error.stack },
			metadata
		})
};
```

### Log Events Reference

| Event                     | Level | When                              |
| ------------------------- | ----- | --------------------------------- |
| `request_start`           | debug | Security check begins             |
| `request_complete`        | info  | Security check completes          |
| `risk_elevated`           | info  | Risk score >= medium threshold    |
| `captcha_required`        | info  | CAPTCHA challenge triggered       |
| `captcha_passed`          | info  | CAPTCHA verified successfully     |
| `captcha_failed`          | warn  | CAPTCHA verification failed       |
| `rate_limited`            | warn  | Request rate limited              |
| `blocked`                 | warn  | Request blocked                   |
| `geo_fallback`            | warn  | Geo API unavailable, using cached |
| `circuit_opened`          | warn  | Circuit breaker opened            |
| `circuit_closed`          | info  | Circuit breaker recovered         |
| `storage_error`           | error | Storage operation failed          |
| `feature_error`           | error | Feature check threw exception     |
| `config_validation_error` | error | Invalid configuration             |

---

## Config Validation with Zod

All configuration is validated at plugin initialization using Zod.

```typescript
// config.ts
import { z } from 'zod';

const StorageBackendSchema = z.enum(['postgres', 'redis', 'memory']);

const StorageComponentsSchema = z
	.object({
		rateLimits: StorageBackendSchema.optional(),
		blocks: StorageBackendSchema.optional(),
		bypass: StorageBackendSchema.optional(),
		geoCache: StorageBackendSchema.optional(),
		devices: StorageBackendSchema.optional(),
		locations: StorageBackendSchema.optional(),
		events: StorageBackendSchema.optional(),
		blocklist: StorageBackendSchema.optional()
	})
	.optional();

const RetentionSchema = z
	.object({
		rateLimitTtlSeconds: z.number().min(60).max(86400).default(3600),
		blockTtlSeconds: z.number().min(60).max(604800).default(86400),
		eventRetentionDays: z.number().min(1).max(365).default(7),
		maxEvents: z.number().min(1000).max(10000000).default(1000000),
		locationRetentionDays: z.number().min(1).max(30).default(7),
		cleanupIntervalMinutes: z.number().min(1).max(60).default(15)
	})
	.optional();

const ResilienceSchema = z
	.object({
		failMode: z.enum(['open', 'closed']).default('open'),
		circuitBreaker: z
			.object({
				enabled: z.boolean().default(true),
				failureThreshold: z.number().min(1).max(20).default(5),
				resetTimeoutMs: z.number().min(1000).max(300000).default(30000)
			})
			.optional(),
		storageFallback: z.enum(['memory', 'skip']).default('memory'),
		timeouts: z
			.object({
				bigDataCloudMs: z.number().min(500).max(10000).default(3000),
				storageOperationMs: z.number().min(100).max(5000).default(1000)
			})
			.optional()
	})
	.optional();

const GeoOptionsSchema = z
	.object({
		apiKey: z.string().optional(),
		enableGeolocation: z.boolean().default(true),
		enableReputation: z.boolean().default(true),
		enableVelocityCheck: z.boolean().default(true),
		cacheTtlSeconds: z.number().min(60).max(86400).default(3600),
		blockedCountries: z.array(z.string().length(2)).default([]),
		allowedCountries: z.array(z.string().length(2)).optional(),
		highRiskCountries: z.array(z.string().length(2)).default([]),
		riskThresholds: z
			.object({
				vpnPenalty: z.number().min(0).max(100).default(20),
				torPenalty: z.number().min(0).max(100).default(35),
				proxyPenalty: z.number().min(0).max(100).default(15),
				datacenterPenalty: z.number().min(0).max(100).default(15),
				maliciousPenalty: z.number().min(0).max(100).default(50),
				highRiskCountryPenalty: z.number().min(0).max(100).default(15),
				hostingHighPenalty: z.number().min(0).max(100).default(30),
				hostingMediumPenalty: z.number().min(0).max(100).default(15)
			})
			.optional()
	})
	.optional();

export const SecurityConfigSchema = z.object({
	enabled: z.boolean().default(true),
	skipInDevelopment: z.boolean().default(false),
	captchaThreshold: z.number().min(0).max(100).default(40),
	blockThreshold: z.number().min(0).max(100).default(80),
	storage: z
		.object({
			defaultBackend: StorageBackendSchema.default('postgres'),
			components: StorageComponentsSchema,
			retention: RetentionSchema
		})
		.optional(),
	resilience: ResilienceSchema,
	features: z
		.object({
			captcha: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
			rateLimit: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
			geo: z.union([z.boolean(), GeoOptionsSchema]).optional(),
			device: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
			behavior: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
			blocking: z.union([z.boolean(), z.object({}).passthrough()]).optional()
		})
		.optional()
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export function validateConfig(options: unknown): SecurityConfig {
	const result = SecurityConfigSchema.safeParse(options);

	if (!result.success) {
		const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
		logSecurityEvent({
			level: 'error',
			event: 'config_validation_error',
			requestId: 'init',
			metadata: { errors }
		});
		throw new Error(`Security plugin configuration invalid:\n${errors.join('\n')}`);
	}

	return result.data;
}

export function mergeConfig(options: unknown): SecurityConfig {
	return validateConfig(options);
}
```

---

## Health Check Endpoint

Monitor storage connections and external API status.

```typescript
// endpoints/health.ts
import type { StorageManager } from '../storage';

interface HealthCheck {
	healthy: boolean;
	latencyMs?: number;
	error?: string;
}

interface HealthStatus {
	healthy: boolean;
	timestamp: string;
	checks: {
		postgres: HealthCheck | null;
		redis: HealthCheck | null;
		bigDataCloud: HealthCheck | null;
		memory: HealthCheck;
	};
	circuitBreakers: Record<string, 'closed' | 'open' | 'half-open'>;
}

export async function handleHealth(
	storage: StorageManager,
	circuits: Record<string, CircuitBreaker>
): Promise<Response> {
	const checks: HealthStatus['checks'] = {
		postgres: null,
		redis: null,
		bigDataCloud: null,
		memory: { healthy: true }
	};

	// Check PostgreSQL
	if (storage.postgres) {
		const start = performance.now();
		try {
			await storage.postgres.getCounter('health:check');
			checks.postgres = { healthy: true, latencyMs: performance.now() - start };
		} catch (error) {
			checks.postgres = {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	// Check Redis
	if (storage.redis) {
		const start = performance.now();
		try {
			await storage.redis.getCounter('health:check');
			checks.redis = { healthy: true, latencyMs: performance.now() - start };
		} catch (error) {
			checks.redis = {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	// Check BigDataCloud circuit state (don't make actual call)
	const bigDataCloudCircuit = circuits['bigdatacloud'];
	if (bigDataCloudCircuit) {
		checks.bigDataCloud = {
			healthy: bigDataCloudCircuit.getState() !== 'open'
		};
	}

	// Aggregate circuit breaker states
	const circuitBreakers: Record<string, 'closed' | 'open' | 'half-open'> = {};
	for (const [name, circuit] of Object.entries(circuits)) {
		circuitBreakers[name] = circuit.getState();
	}

	const status: HealthStatus = {
		healthy: Object.values(checks).every((c) => c === null || c.healthy),
		timestamp: new Date().toISOString(),
		checks,
		circuitBreakers
	};

	return new Response(JSON.stringify(status), {
		status: status.healthy ? 200 : 503,
		headers: { 'Content-Type': 'application/json' }
	});
}
```

Add to endpoints table:

| Method | Path               | Auth     | Description              |
| ------ | ------------------ | -------- | ------------------------ |
| GET    | `/security/health` | Optional | Health check for storage |

---

## Configuration

Single configuration object with feature flags:

```typescript
interface SecurityPluginOptions {
	enabled?: boolean;
	skipInDevelopment?: boolean;

	// Global thresholds
	captchaThreshold?: number; // Default: 40
	blockThreshold?: number; // Default: 80

	// Feature toggles (false to disable, true for defaults, or options object)
	features?: {
		captcha?: CaptchaOptions | boolean;
		rateLimit?: RateLimitOptions | boolean;
		geo?: GeoOptions | boolean;
		device?: DeviceOptions | boolean;
		behavior?: BehaviorOptions | boolean;
		blocking?: BlockingOptions | boolean;
	};
}

/**
 * Geo feature options (BigDataCloud API)
 * https://www.bigdatacloud.com/ip-geolocation#apilist
 */
interface GeoOptions {
	// API configuration
	apiKey?: string; // BigDataCloud API key

	// Feature toggles
	enableGeolocation?: boolean; // Enable location lookups (default: true)
	enableReputation?: boolean; // Enable IP reputation/hazard data (default: true)
	enableVelocityCheck?: boolean; // Enable impossible travel detection (default: true)

	// Caching & rate limiting
	cacheTtlSeconds?: number; // Cache duration (default: 3600)
	apiRateLimitPerMinute?: number; // Max API calls/minute (default: 100)

	// Country policies
	blockedCountries?: string[]; // ISO codes to block entirely
	allowedCountries?: string[]; // If set, ONLY these countries allowed
	highRiskCountries?: string[]; // Countries with extra scrutiny

	// Risk score penalties (added to base risk score)
	riskThresholds?: {
		vpnPenalty?: number; // VPN detected (default: 20)
		torPenalty?: number; // Tor exit node (default: 35)
		proxyPenalty?: number; // Proxy detected (default: 15)
		datacenterPenalty?: number; // Hosting/datacenter IP (default: 15)
		maliciousPenalty?: number; // Known malicious IP (default: 50)
		highRiskCountryPenalty?: number; // High-risk country (default: 15)
		hostingHighPenalty?: number; // hostingLikelihood 7-10 (default: 30)
		hostingMediumPenalty?: number; // hostingLikelihood 4-6 (default: 15)
		mediumThreshold?: number; // Score for medium risk (default: 30)
		highThreshold?: number; // Score for high risk (default: 60)
		criticalThreshold?: number; // Score for critical risk (default: 80)
	};

	// Velocity/impossible travel
	maxTravelSpeedKmh?: number; // Max speed before flagging (default: 1000)

	// Path filtering (overrides global)
	includePaths?: string[];
	excludePaths?: string[];
}

// Additional options (extend SecurityPluginOptions above)
interface SecurityPluginOptionsExtended extends SecurityPluginOptions {
	// Analytics (always on, but configurable)
	analytics?: {
		collectMetrics?: boolean;
		alertThresholds?: AlertThresholds;
		retentionDays?: number;
	};

	// Path filtering
	includePaths?: string[];
	excludePaths?: string[];

	// Authorization for admin endpoints
	isAdmin?: (userId: string) => Promise<boolean>;

	// Resilience options (see Resilience section)
	resilience?: ResilienceOptions;
}
```

**Usage:**

```typescript
import { securityPlugin } from '#lib/auth/security/index.js';

export const auth = betterAuth({
	plugins: [
		securityPlugin({
			captchaThreshold: 40,
			blockThreshold: 80,

			features: {
				captcha: {
					provider: 'capjs',
					siteKey: env.CAPTCHA_SITE_KEY,
					secretKey: env.CAPTCHA_SECRET_KEY
				},
				rateLimit: {
					defaultLimit: 100,
					windowSeconds: 60
				},
				geo: {
					// BigDataCloud API (https://www.bigdatacloud.com/ip-geolocation)
					apiKey: env.BIGDATACLOUD_API_KEY,

					// Feature toggles
					enableGeolocation: true,
					enableReputation: true,
					enableVelocityCheck: true,

					// Caching & rate limiting
					cacheTtlSeconds: 3600,
					apiRateLimitPerMinute: 100,

					// Country policies
					blockedCountries: ['KP', 'IR'], // Block entirely
					allowedCountries: [], // If set, only these allowed
					highRiskCountries: ['NG', 'GH', 'PK'], // Extra scrutiny

					// Risk score penalties (added to base score)
					riskThresholds: {
						vpnPenalty: 20,
						torPenalty: 35,
						proxyPenalty: 15,
						datacenterPenalty: 15,
						maliciousPenalty: 50,
						highRiskCountryPenalty: 15,
						mediumThreshold: 30,
						highThreshold: 60,
						criticalThreshold: 80
					},

					// Impossible travel detection
					maxTravelSpeedKmh: 1000 // ~airplane speed
				},
				device: true, // Use defaults
				behavior: true, // Use defaults
				blocking: {
					maxAttempts: 5,
					baseDuration: 60
				}
			},

			analytics: {
				collectMetrics: true,
				alertThresholds: {
					highRiskPerHour: 100,
					blockedPerHour: 50
				}
			},

			isAdmin: async (userId) => {
				const user = await db.user.findUnique({ where: { id: userId } });
				return user?.role === 'admin';
			}
		})
	]
});
```

---

## Analytics Integration

Analytics is built into the core and uses the **storage abstraction** (not Redis directly):

```typescript
// analytics/collector.ts
import type { StorageManager } from '../storage';
import { securityLogger } from '../core/logger';

export class AnalyticsCollector {
	private eventBuffer: SecurityEvent[] = [];
	private flushTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private readonly storage: StorageManager,
		private readonly config: {
			batchSize: number;
			flushIntervalMs: number;
			samplingRate: number;
		}
	) {}

	async recordEvent(
		ctx: SecurityContext,
		type: SecurityEventType,
		details?: unknown
	): Promise<void> {
		// Apply sampling rate during high traffic
		if (this.config.samplingRate < 1 && Math.random() > this.config.samplingRate) {
			return;
		}

		const event: SecurityEvent = {
			id: generateId(),
			timestamp: Date.now(),
			type,
			ip: ctx.ip,
			userId: ctx.userId,
			path: ctx.path,
			riskScore: ctx.riskScore,
			riskLevel: ctx.riskLevel,
			riskFactors: ctx.riskFactors,
			details
		};

		// Add to context for response
		ctx.events.push(event);

		// Buffer for batch writes
		this.eventBuffer.push(event);

		if (this.eventBuffer.length >= this.config.batchSize) {
			await this.flush();
		} else if (!this.flushTimer) {
			this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
		}

		// Check alert thresholds (async, non-blocking)
		this.checkAlerts(event).catch((err) =>
			securityLogger.error('alert_check_failed', ctx, err as Error)
		);
	}

	private async flush(): Promise<void> {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}

		if (this.eventBuffer.length === 0) return;

		const events = this.eventBuffer.splice(0);

		try {
			// Use storage abstraction - writes to configured backend (postgres/redis)
			await Promise.all(events.map((e) => this.storage.events.recordEvent(e)));
		} catch (error) {
			// Re-add events to buffer for retry (with limit)
			if (this.eventBuffer.length < this.config.batchSize * 3) {
				this.eventBuffer.unshift(...events);
			}
			throw error;
		}
	}

	async getDashboardMetrics(timeRange: TimeRange): Promise<DashboardMetrics> {
		// Uses storage abstraction
		return this.storage.events.getMetrics(timeRange);
	}

	async getRecentAlerts(limit: number): Promise<SecurityAlert[]> {
		// Uses storage abstraction
		return this.storage.events.getAlerts(limit);
	}

	private async checkAlerts(event: SecurityEvent): Promise<void> {
		// Alert threshold checking logic
	}
}

// Factory function - receives storage from plugin init
export function createAnalyticsCollector(
	storage: StorageManager,
	config: SecurityConfig
): AnalyticsCollector {
	return new AnalyticsCollector(storage, {
		batchSize: config.storage?.performance?.eventBatchSize ?? 100,
		flushIntervalMs: config.storage?.performance?.eventBatchIntervalMs ?? 5000,
		samplingRate: config.storage?.performance?.eventSamplingRate ?? 1.0
	});
}
```

---

## Client Architecture

SSR-safe client with Svelte 5 runes:

```typescript
// client/store.ts
import { browser } from '$app/env';

interface SecurityClientState {
	isReady: boolean;
	riskLevel: RiskLevel | null;
	captchaRequired: boolean;
	rateLimited: boolean;
	retryAfter: number | null;
	error: string | null;
}

// SSR-safe: only create store in browser
function createSecurityStore() {
	if (!browser) {
		// Return readonly default for SSR
		return {
			subscribe: (fn: (state: SecurityClientState) => void) => {
				fn(defaultState);
				return () => {};
			},
			// No-op methods for SSR
			checkStatus: async () => defaultState,
			verifyCaptcha: async () => ({ success: false })
		};
	}

	// Real implementation for browser
	let state = $state<SecurityClientState>(defaultState);

	return {
		get current() {
			return state;
		},
		subscribe(fn: (state: SecurityClientState) => void) {
			// Svelte 5 reactive subscription
			$effect(() => fn(state));
			return () => {};
		},
		async checkStatus() {
			/* ... */
		},
		async verifyCaptcha(token: string) {
			/* ... */
		}
	};
}

export const securityStore = createSecurityStore();
```

### Client Plugin Consolidation

The current implementation has 5 separate client plugins that need to be consolidated:

| Current Plugin                 | Files                                            | Consolidation Target           |
| ------------------------------ | ------------------------------------------------ | ------------------------------ |
| `abuse-protection/client.ts`   | client.ts, client-utils.ts, client-standalone.ts | `client/features/abuse.ts`     |
| `fraud-detection/client.ts`    | client.ts, client-utils.ts, client-standalone.ts | `client/features/fraud.ts`     |
| `geo-intelligence/client.ts`   | client.ts, client-utils.ts, client-standalone.ts | `client/features/geo.ts`       |
| `rate-limiting/client.ts`      | client.ts, client-utils.ts                       | `client/features/rate.ts`      |
| `security-analytics/client.ts` | client.ts, client-utils.ts, client-standalone.ts | `client/features/analytics.ts` |

#### Unified Client Plugin

```typescript
// client/plugin.ts
import type { BetterAuthClientPlugin } from 'better-auth/client';

export const securityClientPlugin = () => {
	return {
		id: 'security',

		// Unified state and methods from all 5 plugins
		$InferServerPlugin: {} as typeof securityPlugin,

		getActions: ($fetch) => ({
			// From abuse-protection
			checkProtectionStatus: async () => $fetch('/security/status'),
			verifyCaptcha: async (token: string) =>
				$fetch('/security/verify-captcha', { method: 'POST', body: { token } }),

			// From fraud-detection
			reportDeviceFingerprint: async (fingerprint: DeviceFingerprint) =>
				$fetch('/security/report-device', { method: 'POST', body: fingerprint }),

			// From geo-intelligence
			getGeoStatus: async () => $fetch('/security/geo-status'),

			// From rate-limiting
			getRateLimitStatus: async () => $fetch('/security/rate-limit-status'),

			// From security-analytics (admin)
			getDashboardMetrics: async (timeRange?: TimeRange) =>
				$fetch('/security/dashboard/metrics', { query: timeRange }),
			getFlaggedSessions: async (query?: FlaggedSessionsQuery) =>
				$fetch('/security/dashboard/sessions', { query })
		}),

		atomListeners: [
			// Merged listeners from all plugins
		]
	} satisfies BetterAuthClientPlugin;
};
```

#### Standalone Client (No Plugin)

For use outside Better Auth client context:

```typescript
// client/standalone.ts
export function createSecurityClient(options: { baseUrl: string; fetch?: typeof fetch }) {
	const fetcher = options.fetch ?? fetch;
	const baseUrl = options.baseUrl.replace(/\/$/, '');

	return {
		// Unified API from all standalone clients
		async checkStatus() {
			/* ... */
		},
		async verifyCaptcha(token: string) {
			/* ... */
		},
		async reportBehavior(data: BehaviorData) {
			/* ... */
		},

		// Device fingerprinting (from fraud-detection)
		fingerprint: {
			async collect(): Promise<DeviceFingerprint> {
				/* ... */
			},
			async report(fp: DeviceFingerprint) {
				/* ... */
			}
		},

		// Behavior tracking (from fraud-detection)
		behavior: {
			startTracking() {
				/* ... */
			},
			stopTracking() {
				/* ... */
			},
			getData(): BehaviorData {
				/* ... */
			}
		},

		// Admin methods (from security-analytics)
		admin: {
			async getMetrics(timeRange?: TimeRange) {
				/* ... */
			},
			async getFlaggedSessions(query?: FlaggedSessionsQuery) {
				/* ... */
			},
			async blockIp(ip: string, reason: string) {
				/* ... */
			}
		}
	};
}
```

#### Client Utilities Consolidation

Merge duplicate utilities from all client-utils.ts files:

```typescript
// client/utils.ts
export {
	// Fingerprinting (from fraud-detection/client-utils.ts)
	collectDeviceFingerprint,
	getCanvasFingerprint,
	getWebGLFingerprint,

	// Behavior tracking (from fraud-detection/client-utils.ts)
	createBehaviorTracker,
	detectBotBehavior,

	// CAPTCHA helpers (from abuse-protection/client-utils.ts)
	loadCaptchaScript,
	renderCaptcha,
	getCaptchaResponse,

	// Rate limit helpers (from rate-limiting/client-utils.ts)
	formatRetryAfter,
	isRateLimitError,

	// Shared utilities
	hashString,
	generateRequestId
};
```

---

## API Endpoints

All endpoints under `/api/auth/security/`:

| Method | Path                           | Auth     | Description                 |
| ------ | ------------------------------ | -------- | --------------------------- |
| GET    | `/security/status`             | Optional | Get current security status |
| POST   | `/security/verify-captcha`     | No       | Verify CAPTCHA token        |
| POST   | `/security/report-behavior`    | No       | Report client behavior data |
| GET    | `/security/dashboard/metrics`  | Admin    | Dashboard metrics           |
| GET    | `/security/dashboard/alerts`   | Admin    | Recent alerts               |
| GET    | `/security/dashboard/sessions` | Admin    | Flagged sessions            |
| POST   | `/security/admin/block-ip`     | Admin    | Block an IP                 |
| POST   | `/security/admin/unblock-ip`   | Admin    | Unblock an IP               |
| POST   | `/security/admin/clear-cache`  | Admin    | Clear security caches       |

---

## Feature Priority Order

Features run in this order (can be configured):

1. **Rate Limit** — Cheapest check, fail fast
2. **Blocking** — Check if already blocked
3. **Geo** — Country blocks, IP reputation
4. **Device** — Fingerprint analysis
5. **Behavior** — Bot detection, patterns
6. **Captcha** — Check bypass token

Each feature adds to `riskFactors`. Final decision made after all features run.

---

## BigDataCloud Hazard Report Fields

The geo feature uses BigDataCloud's IP Geolocation with Confidence Area and Hazard Report API.
Full documentation: <https://www.bigdatacloud.com/ip-geolocation/ip-address-geolocation-with-confidence-area-and-hazard-report-api>

### Hazard Report Fields (from `data.hazardReport`)

**Reactive signals** (blocklist/abuse databases):

| Field                 | Type    | Description                 |
| --------------------- | ------- | --------------------------- |
| `isKnownAsVpn`        | boolean | Known VPN exit node         |
| `isKnownAsTorServer`  | boolean | Known Tor exit node         |
| `isKnownAsProxy`      | boolean | Known proxy server          |
| `isSpamhausDrop`      | boolean | On Spamhaus DROP blocklist  |
| `isSpamhausEdrop`     | boolean | On Spamhaus EDROP blocklist |
| `isBogon`             | boolean | Bogon/unroutable address    |
| `isSearchEngineRobot` | boolean | Known search engine crawler |

**Proactive indicators** (predictive risk):

| Field               | Type    | Description                                         |
| ------------------- | ------- | --------------------------------------------------- |
| `hostingLikelihood` | 0-10    | **KEY FIELD** - Probability IP is hosting/non-human |
| `isHostingAsn`      | boolean | AS associated with hosting provider                 |
| `isCloudProvider`   | boolean | Known cloud provider IP                             |

**Aggregate scores**:

| Field         | Type   | Description          |
| ------------- | ------ | -------------------- |
| `threatLevel` | number | Overall threat level |

### Location Fields (from `data.location`, `data.country`, `data.network`)

| Field            | Path                             | Description                  |
| ---------------- | -------------------------------- | ---------------------------- |
| `country`        | `country.name`                   | Country name                 |
| `countryCode`    | `country.isoAlpha2`              | ISO 3166-1 alpha-2 code      |
| `region`         | `location.principalSubdivision`  | State/province               |
| `city`           | `location.city`                  | City name                    |
| `latitude`       | `location.latitude`              | Latitude coordinate          |
| `longitude`      | `location.longitude`             | Longitude coordinate         |
| `timezone`       | `location.timeZone.ianaTimeId`   | IANA timezone                |
| `isp`            | `network.organisation`           | ISP name                     |
| `asn`            | `network.autonomousSystemNumber` | AS number                    |
| `carriers`       | `network.carriers`               | Mobile carriers (if any)     |
| `confidenceArea` | `confidenceArea`                 | Geolocation accuracy polygon |

## Risk Score Contributions

Default risk score contributions (configurable):

| Factor                      | Score | Source   |
| --------------------------- | ----- | -------- |
| VPN detected                | +20   | geo      |
| Tor exit node               | +35   | geo      |
| Proxy detected              | +15   | geo      |
| Datacenter IP               | +15   | geo      |
| Malicious IP (blocklist)    | +50   | geo      |
| High-risk country           | +20   | geo      |
| **Hosting likelihood 7-10** | +30   | geo      |
| **Hosting likelihood 4-6**  | +15   | geo      |
| New device                  | +20   | device   |
| Headless browser            | +40   | device   |
| Automation detected         | +50   | device   |
| Bot behavior                | +40   | behavior |
| Rapid requests              | +20   | behavior |
| Failed attempts (3+)        | +25   | blocking |
| CAPTCHA failures (2+)       | +20   | captcha  |
| Trusted user                | -30   | device   |
| Verified CAPTCHA            | -10   | captcha  |

---

## Service Implementations

Each feature folder contains its concrete service:

| Folder                         | Responsibility                             |
| ------------------------------ | ------------------------------------------ |
| `features/geo/bigdatacloud.ts` | BigDataCloud geo + reputation client       |
| `features/captcha/`            | CAPTCHA provider adapters + bypass tokens  |
| `features/rate-limit/`         | Sliding-window limiter + rule matching     |
| `features/blocking/`           | Temporary and permanent IP/user blocks     |
| `features/device/`             | Fingerprint extraction + trust management  |
| `features/behavior/`           | Pattern detection + bot/automation signals |
| `analytics/`                   | Event collection, aggregation, alerting    |
| `core/helpers.ts`              | Shared utilities (IP extraction, hashing)  |
