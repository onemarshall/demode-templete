/**
 * Unified Cache Manager for Security Plugin
 *
 * Consolidates 6+ duplicate LRU cache implementations across plugins
 * into a single, reusable cache manager with TTL support and statistics.
 */

// ============================================
// Cache Manager Class
// ============================================

export interface CacheStats {
	name: string;
	size: number;
	maxSize: number;
	hitRate: number;
	hits: number;
	misses: number;
}

export class CacheManager<K, V> {
	private cache = new Map<K, { value: V; expiresAt: number }>();
	private hits = 0;
	private misses = 0;

	constructor(
		private readonly name: string,
		private readonly maxSize: number,
		private readonly defaultTtlMs: number
	) {}

	/**
	 * Get a value from the cache
	 */
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

		// Promote to most-recently-used by re-inserting at end of Map order
		this.cache.delete(key);
		this.cache.set(key, entry);

		this.hits++;
		return entry.value;
	}

	/**
	 * Set a value in the cache
	 */
	set(key: K, value: V, ttlMs?: number): void {
		this.evictIfNeeded();
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs)
		});
	}

	/**
	 * Check if key exists and is not expired
	 */
	has(key: K): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;
		if (entry.expiresAt < Date.now()) {
			this.cache.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * Delete a key from the cache
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const total = this.hits + this.misses;
		return {
			name: this.name,
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: total > 0 ? this.hits / total : 0,
			hits: this.hits,
			misses: this.misses
		};
	}

	/**
	 * Get current size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Prune expired entries
	 */
	prune(): number {
		const now = Date.now();
		let pruned = 0;

		for (const [key, entry] of this.cache) {
			if (entry.expiresAt < now) {
				this.cache.delete(key);
				pruned++;
			}
		}

		return pruned;
	}

	/**
	 * Evict entries if cache exceeds max size
	 */
	private evictIfNeeded(): void {
		if (this.cache.size < this.maxSize) return;

		const now = Date.now();
		const deleteCount = Math.ceil(this.maxSize * 0.2);
		let deleted = 0;

		// First pass: remove expired entries
		for (const [key, entry] of this.cache) {
			if (entry.expiresAt < now) {
				this.cache.delete(key);
				deleted++;
			}
			if (deleted >= deleteCount) return;
		}

		// Second pass: LRU eviction (oldest first, Map maintains insertion order)
		for (const key of this.cache.keys()) {
			if (deleted >= deleteCount) return;
			this.cache.delete(key);
			deleted++;
		}
	}
}

// ============================================
// Request-scoped Cache (WeakMap-based)
// ============================================

/**
 * Create a request-scoped cache that automatically cleans up
 * when the request object is garbage collected
 */
export function createRequestCache<V>(): WeakMap<Request, V> {
	return new WeakMap<Request, V>();
}

// ============================================
// Pending Request Deduplication
// ============================================

/**
 * Manages pending async operations to prevent duplicate work
 * (request coalescing pattern)
 */
export class PendingRequests<K, V> {
	private pending = new Map<K, Promise<V>>();

	/**
	 * Get or create a pending request
	 * If a request for the same key is already in flight, return that promise
	 */
	async getOrCreate(key: K, factory: () => Promise<V>): Promise<V> {
		const existing = this.pending.get(key);
		if (existing) {
			return existing;
		}

		const promise = factory();
		this.pending.set(key, promise);

		try {
			return await promise;
		} finally {
			this.pending.delete(key);
		}
	}

	/**
	 * Check if a request is pending
	 */
	has(key: K): boolean {
		return this.pending.has(key);
	}

	/**
	 * Get count of pending requests
	 */
	get size(): number {
		return this.pending.size;
	}

	/**
	 * Clear all pending requests
	 */
	clear(): void {
		this.pending.clear();
	}
}

// ============================================
// Global Cache Registry
// ============================================

const cacheRegistry = new Map<string, CacheManager<unknown, unknown>>();

/**
 * Register a cache for global management
 */
export function registerCache<K, V>(cache: CacheManager<K, V>): void {
	cacheRegistry.set(cache.getStats().name, cache as CacheManager<unknown, unknown>);
}

/**
 * Get all registered cache statistics
 */
export function getAllCacheStats(): CacheStats[] {
	return Array.from(cacheRegistry.values()).map((cache) => cache.getStats());
}

/**
 * Clear all registered caches
 */
export function clearAllCaches(): void {
	for (const cache of cacheRegistry.values()) {
		cache.clear();
	}
}

/**
 * Prune expired entries from all registered caches
 */
export function pruneAllCaches(): number {
	let totalPruned = 0;
	for (const cache of cacheRegistry.values()) {
		totalPruned += cache.prune();
	}
	return totalPruned;
}

// ============================================
// Pre-configured Caches (Singleton Instances)
// ============================================

export const geoCache = new CacheManager<string, unknown>('geo', 500, 30_000);
export const deviceTrustCache = new CacheManager<string, boolean>('deviceTrust', 500, 60_000);
export const pathMatchCache = new CacheManager<string, boolean>('pathMatch', 500, 300_000);
export const ipReputationCache = new CacheManager<string, unknown>('ipReputation', 1000, 300_000);
export const analysisCache = new CacheManager<string, unknown>('analysis', 200, 30_000);
export const bypassTokenCache = new CacheManager<string, unknown>('bypass', 200, 3600_000);

// Register all caches
registerCache(geoCache);
registerCache(deviceTrustCache);
registerCache(pathMatchCache);
registerCache(ipReputationCache);
registerCache(analysisCache);
registerCache(bypassTokenCache);
