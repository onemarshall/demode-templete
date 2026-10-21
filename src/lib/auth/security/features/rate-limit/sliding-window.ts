/**
 * Sliding Window Rate Limiter with Atomic Lua Script
 *
 * CRITICAL FIX: Uses a Lua script for truly atomic check-and-increment.
 * The previous implementation had a race condition between ZCARD and ZADD.
 */

import type { RateLimitStatus } from './types';
import { createStorageAdapter, type StorageAdapter } from '../../core/storage';
import { logger } from '#lib/auth/shared/logger.js';

let storageAdapter: StorageAdapter | null = null;

// Redis-native client kept separately for Lua script path
let nativeRedis: Awaited<ReturnType<typeof import('#lib/auth/shared/redis')['getSharedRedisClient']>> | null = null;

async function getStorage(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

async function tryGetNativeRedis() {
	if (nativeRedis) return nativeRedis;
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) return null;
	try {
		const { getSharedRedisClient } = await import('#lib/auth/shared/redis/index.js');
		nativeRedis = await getSharedRedisClient('RateLimitFeature');
		return nativeRedis;
	} catch {
		return null;
	}
}

// Lua script for atomic sliding window rate limiting
// This ensures check + increment happens atomically without race conditions
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local request_id = ARGV[4]
local window_start = now - window_ms

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- Get current count
local count = redis.call('ZCARD', key)

-- Check if at limit
if count >= max_requests then
    -- Get oldest entry for reset calculation
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldest_time = oldest[2] or now
    return {0, count, oldest_time}  -- 0 = rejected
end

-- Add new request atomically
redis.call('ZADD', key, now, request_id)
redis.call('PEXPIRE', key, window_ms + 1000)

return {1, count + 1, 0}  -- 1 = accepted, new count, 0 = no reset needed
`;

// Script SHA cache for EVALSHA
let scriptSha: string | undefined;

/**
 * Load the Lua script and get its SHA
 */
async function ensureScriptLoaded(): Promise<string> {
	if (scriptSha) return scriptSha;

	try {
		const redis = await tryGetNativeRedis();
		if (!redis) throw new Error('No Redis client available for script loading');
		const sha = await redis.scriptLoad(SLIDING_WINDOW_SCRIPT);
		scriptSha = sha;
		return sha;
	} catch (error) {
		logger.error('[RateLimit] Failed to load Lua script:', error);
		throw error;
	}
}

/**
 * Execute the sliding window check.
 * Uses atomic Lua script when Redis is available; falls back to simple
 * counter-based check for memory/Postgres backends.
 */
export async function slidingWindowCheck(
	key: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitStatus> {
	const now = Date.now();
	const windowMs = windowSeconds * 1000;

	// Try Redis-native Lua path first
	const redis = await tryGetNativeRedis();
	if (redis) {
		const requestId = `${now}-${Math.random().toString(36).slice(2, 8)}`;
		try {
			const sha = await ensureScriptLoaded();
			const result = (await redis.evalSha(sha, {
				keys: [key],
				arguments: [now.toString(), windowMs.toString(), maxRequests.toString(), requestId]
			})) as [number, number, number];

			const [accepted, count, oldestTime] = result;

			if (accepted === 0) {
				const resetIn = Math.ceil((oldestTime + windowMs - now) / 1000);
				return {
					limited: true,
					current: count,
					limit: maxRequests,
					remaining: 0,
					resetIn: Math.max(0, resetIn),
					resetAt: now + Math.max(0, resetIn) * 1000,
					retryAfter: Math.max(1, resetIn),
					identifier: key
				};
			}

			return {
				limited: false,
				current: count,
				limit: maxRequests,
				remaining: Math.max(0, maxRequests - count),
				resetIn: windowSeconds,
				resetAt: now + windowMs,
				identifier: key
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('NOSCRIPT')) {
				scriptSha = undefined;
				try { return await slidingWindowCheck(key, maxRequests, windowSeconds); } catch { /* fall through */ }
			}
			logger.error('[RateLimit] Lua sliding window failed, falling back to adapter', error);
		}
	}

	// Adapter-based counter fallback (memory / Postgres)
	return adapterSlidingWindowCheck(key, maxRequests, windowSeconds, now, windowMs);
}

/**
 * Simple counter-based rate limit for non-Redis backends.
 * Not atomic across distributed instances but acceptable for single-server use.
 */
async function adapterSlidingWindowCheck(
	key: string,
	maxRequests: number,
	windowSeconds: number,
	now: number,
	windowMs: number
): Promise<RateLimitStatus> {
	try {
		const storage = await getStorage();
		const countKey = `rl:${key}`;
		const raw = await storage.get(countKey);
		const current = raw ? parseInt(raw, 10) : 0;

		if (current >= maxRequests) {
			const ttl = await storage.ttl(countKey);
			const resetIn = Math.max(1, ttl);
			return {
				limited: true,
				current,
				limit: maxRequests,
				remaining: 0,
				resetIn,
				resetAt: now + resetIn * 1000,
				retryAfter: resetIn,
				identifier: key
			};
		}

		const newCount = current + 1;
		// Reset TTL only on first request in window
		await storage.set(countKey, String(newCount), current === 0 ? windowSeconds : undefined);

		return {
			limited: false,
			current: newCount,
			limit: maxRequests,
			remaining: Math.max(0, maxRequests - newCount),
			resetIn: windowSeconds,
			resetAt: now + windowMs,
			identifier: key
		};
	} catch (error) {
		logger.error('[RateLimit] Adapter sliding window check failed:', error);
		return createFailOpenStatus(key, maxRequests, windowSeconds, now);
	}
}

/**
 * Alias kept for call-sites that reference the fallback explicitly.
 * Now delegates to the same adapter path.
 */
export async function slidingWindowCheckFallback(
	key: string,
	maxRequests: number,
	windowSeconds: number
): Promise<RateLimitStatus> {
	const now = Date.now();
	const windowMs = windowSeconds * 1000;
	return adapterSlidingWindowCheck(key, maxRequests, windowSeconds, now, windowMs);
}

/**
 * Create fail-open status (allows request on Redis error)
 */
function createFailOpenStatus(
	key: string,
	limit: number,
	windowSeconds: number,
	now: number
): RateLimitStatus {
	return {
		limited: false,
		current: 0,
		limit,
		remaining: limit,
		resetIn: windowSeconds,
		resetAt: now + windowSeconds * 1000,
		identifier: key
	};
}

/**
 * Clear script SHA cache (for testing)
 */
export function clearScriptCache(): void {
	scriptSha = undefined;
}

export function resetRedisClient(): void {
	storageAdapter = null;
	nativeRedis = null;
}
