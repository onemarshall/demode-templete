/**
 * Cache Management for Security Services
 *
 * Provides cache statistics, clearing, and pruning functionality.
 */

import { logger, securityLogger } from '$lib/auth/shared/logger';
import { getRedis } from './redis';

// ============================================
// Types
// ============================================

export interface CacheStats {
	tracked: boolean;
	hitRate: number;
	totalHits: number;
	totalMisses: number;
	size: number;
	oldestEntry?: number;
	note?: string;
}

export interface CacheClearResult {
	cleared: boolean;
	entriesRemoved: number;
}

// ============================================
// Constants
// ============================================

const CACHE_PREFIXES = [
	'fraud_analysis:',
	'fraud_plugin:',
	'geo_intelligence:',
	'abuse_protection:',
	'security:'
];

// ============================================
// Cache Statistics
// ============================================

/**
 * Get cache statistics
 */
export async function getCacheStatistics(): Promise<CacheStats> {
	try {
		const redis = await getRedis();
		let size = 0;
		let oldestEntry: number | undefined;

		const countPromises = CACHE_PREFIXES.map(async (prefix) => {
			const keys = await redis.scanKeys(`${prefix}*`);

			if (keys.length > 0) {
				const data = await redis.get(keys[0]!);
				if (data) {
					try {
						const parsed = JSON.parse(data);
						if (parsed.timestamp && (!oldestEntry || parsed.timestamp < oldestEntry)) {
							oldestEntry = parsed.timestamp;
						}
					} catch {
						// Ignore parse errors
					}
				}
			}

			return keys.length;
		});

		const counts = await Promise.all(countPromises);
		size = counts.reduce((a, b) => a + b, 0);

		return {
			tracked: false,
			hitRate: 0,
			totalHits: 0,
			totalMisses: 0,
			size,
			oldestEntry,
			note: 'Hit/miss is not tracked for this cache'
		};
	} catch (error) {
		logger.error('[SecurityServices] Failed to get cache stats:', error);
		return {
			tracked: false,
			hitRate: 0,
			totalHits: 0,
			totalMisses: 0,
			size: 0,
			note: 'Hit/miss is not tracked for this cache'
		};
	}
}

/**
 * Clear analytics cache
 */
export async function clearAnalyticsCache(): Promise<CacheClearResult> {
	let entriesRemoved = 0;

	try {
		const redis = await getRedis();

		for (const prefix of CACHE_PREFIXES) {
			const keys = await redis.scanKeys(`${prefix}*`);

			if (keys.length > 0) {
				await Promise.all(keys.map((key) => redis.del(key)));
				entriesRemoved += keys.length;
			}
		}

		securityLogger.info('[SecurityServices] Cache cleared', { entriesRemoved });

		return {
			cleared: true,
			entriesRemoved
		};
	} catch (error) {
		logger.error('[SecurityServices] Failed to clear cache:', error);
		return {
			cleared: false,
			entriesRemoved
		};
	}
}

/**
 * Clear specific cache prefix
 */
export async function clearCachePrefix(prefix: string): Promise<number> {
	let entriesRemoved = 0;

	try {
		const redis = await getRedis();
		const keys = await redis.scanKeys(`${prefix}*`);

		if (keys.length > 0) {
			await Promise.all(keys.map((key) => redis.del(key)));
			entriesRemoved += keys.length;
		}

		return entriesRemoved;
	} catch {
		return entriesRemoved;
	}
}

/**
 * Get cache size for specific prefix
 */
export async function getCachePrefixSize(prefix: string): Promise<number> {
	try {
		const redis = await getRedis();
		const keys = await redis.scanKeys(`${prefix}*`);
		return keys.length;
	} catch {
		return 0;
	}
}

/**
 * Prune expired cache entries
 */
export async function pruneExpiredCache(): Promise<number> {
	let pruned = 0;

	try {
		const redis = await getRedis();

		for (const prefix of CACHE_PREFIXES) {
			const keys = await redis.scanKeys(`${prefix}*`);

			const checks = await Promise.all(
				keys.map(async (key) => {
					const ttl = await redis.ttl(key);
					if (ttl === 0 || (ttl < 0 && ttl !== -1)) {
						await redis.del(key);
						return true;
					}
					return false;
				})
			);

			pruned += checks.filter(Boolean).length;
		}

		if (pruned > 0) {
			logger.info('[SecurityServices] Pruned expired cache entries', { pruned });
		}

		return pruned;
	} catch {
		return pruned;
	}
}
