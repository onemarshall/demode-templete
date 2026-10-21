/**
 * IP Blocking Management for Security Services
 *
 * Provides IP blocking, unblocking, and query functionality.
 */

import { z } from 'zod';
import { logger, securityLogger } from '#lib/auth/shared/logger.js';
import { getRedis } from './redis';
import { isValidIP, validatePagination, createSortComparator } from './helpers';

const blockedIpDataSchema = z.object({
	reason: z.string().default('Unknown'),
	blockedAt: z.number().default(0),
	blockedBy: z.string().optional(),
	hitCount: z.number().default(0),
	lastHit: z.number().optional()
});

// ============================================
// Types
// ============================================

export interface BlockedIP {
	ip: string;
	reason: string;
	blockedAt: number;
	blockedBy?: string;
	expiresAt?: number;
	isExpired: boolean;
	hitCount: number;
	lastHit?: number;
}

export interface BlockedIPsQuery {
	ipPrefix?: string;
	showExpired?: boolean;
	sortBy?: 'blockedAt' | 'hitCount' | 'lastHit';
	sortOrder?: 'asc' | 'desc';
	page?: number;
	limit?: number;
}

export interface BlockedIPsResponse {
	ips: BlockedIP[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

// ============================================
// Constants
// ============================================

const MAX_PERMANENT_BLOCK_SECONDS = 86400 * 30; // 30 days
const KEY_PREFIX = 'blocked_ip:';

// SECURITY: Must stay in sync with features/blocking/ip-block.ts
// The blocking feature checks this SET for fast permanent-block lookups.
const FEATURE_BLOCKLIST_KEY = 'block:ip:list';
const FEATURE_KEY_PREFIX = 'block:ip:';

// ============================================
// Query Functions
// ============================================

/**
 * Get blocked IPs with filtering and pagination
 */
export async function getBlockedIPs(query: BlockedIPsQuery): Promise<BlockedIPsResponse> {
	try {
		const redis = await getRedis();
		const blockedIPs: BlockedIP[] = [];

		const keysToProcess = (await redis.scanKeys(`${KEY_PREFIX}*`)).filter((key) => {
			const ip = key.slice(KEY_PREFIX.length);
			return !query.ipPrefix || ip.startsWith(query.ipPrefix);
		});

		const BATCH_SIZE = 50;
		for (let i = 0; i < keysToProcess.length; i += BATCH_SIZE) {
			const batch = keysToProcess.slice(i, i + BATCH_SIZE);

			const results = await Promise.all(
				batch.map(async (key) => {
					const ip = key.slice(KEY_PREFIX.length);
					const [data, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);

					if (!data) return null;

					const parsed = blockedIpDataSchema.safeParse(JSON.parse(data));
					if (!parsed.success) return null;

					const blockData = parsed.data;
					const isExpired = ttl <= 0 && ttl !== -1;

					if (isExpired && !query.showExpired) return null;

					return {
						ip,
						reason: blockData.reason,
						blockedAt: blockData.blockedAt || Date.now(),
						blockedBy: blockData.blockedBy,
						expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
						isExpired,
						hitCount: blockData.hitCount,
						lastHit: blockData.lastHit
					} as BlockedIP;
				})
			);

			for (const result of results) {
				if (result) blockedIPs.push(result);
			}
		}

		const sortBy = query.sortBy || 'blockedAt';
		const sortOrder = query.sortOrder || 'desc';
		blockedIPs.sort(createSortComparator(sortBy, sortOrder));

		const { page, limit } = validatePagination(query.page || 1, query.limit || 20);
		const startIndex = (page - 1) * limit;

		return {
			ips: blockedIPs.slice(startIndex, startIndex + limit),
			total: blockedIPs.length,
			page,
			limit,
			hasMore: startIndex + limit < blockedIPs.length
		};
	} catch (error) {
		logger.error('[SecurityServices] Failed to get blocked IPs:', error);
		return {
			ips: [],
			total: 0,
			page: 1,
			limit: 20,
			hasMore: false
		};
	}
}

/**
 * Block an IP address
 */
export async function blockIPAddress(
	ip: string,
	reason: string,
	duration: number,
	blockedBy?: string
): Promise<boolean> {
	if (!isValidIP(ip)) {
		logger.warn('[SecurityServices] Invalid IP address for blocking:', ip);
		return false;
	}

	try {
		const redis = await getRedis();
		const key = `${KEY_PREFIX}${ip}`;

		const data = JSON.stringify({
			reason,
			blockedAt: Date.now(),
			blockedBy,
			hitCount: 0
		});

		const ttl = duration > 0 ? duration : MAX_PERMANENT_BLOCK_SECONDS;

		// Write to services key (rich metadata with TTL)
		await redis.set(key, data, ttl);
		// Sync to blocking feature's SET so isIPBlocked() in the before hook sees it
		await redis.sAdd(FEATURE_BLOCKLIST_KEY, ip);
		if (reason) {
			await redis.set(`${FEATURE_KEY_PREFIX}${ip}:reason`, reason);
		}

		securityLogger.info('[SecurityServices] IP blocked', { ip, reason, duration, blockedBy });
		return true;
	} catch (error) {
		logger.error('[SecurityServices] Failed to block IP:', error);
		return false;
	}
}

/**
 * Unblock an IP address
 */
export async function unblockIPAddress(ip: string): Promise<boolean> {
	if (!isValidIP(ip)) {
		logger.warn('[SecurityServices] Invalid IP address for unblocking:', ip);
		return false;
	}

	try {
		const redis = await getRedis();
		// Remove from services key
		await redis.del(`${KEY_PREFIX}${ip}`);
		// Sync removal from blocking feature's SET
		await redis.sRem(FEATURE_BLOCKLIST_KEY, ip);
		await redis.del(`${FEATURE_KEY_PREFIX}${ip}:reason`);

		securityLogger.info('[SecurityServices] IP unblocked', { ip });
		return true;
	} catch (error) {
		logger.error('[SecurityServices] Failed to unblock IP:', error);
		return false;
	}
}

/**
 * Check if IP is blocked (fast lookup)
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
	if (!isValidIP(ip)) return false;

	try {
		const redis = await getRedis();
		const data = await redis.get(`${KEY_PREFIX}${ip}`);
		return data !== null;
	} catch {
		return false;
	}
}

/**
 * Increment hit count for blocked IP.
 * Read-modify-write preserving TTL (works on all storage backends).
 */
export async function incrementBlockedIPHitCount(ip: string): Promise<void> {
	if (!isValidIP(ip)) return;

	try {
		const redis = await getRedis();
		const key = `${KEY_PREFIX}${ip}`;
		const data = await redis.get(key);
		if (!data) return;

		const parsed = blockedIpDataSchema.safeParse(JSON.parse(data));
		if (!parsed.success) return;

		const ttl = await redis.ttl(key);
		const updated = {
			...parsed.data,
			hitCount: parsed.data.hitCount + 1,
			lastHit: Date.now()
		};

		if (ttl > 0) {
			await redis.set(key, JSON.stringify(updated), ttl);
		} else if (ttl === -1) {
			await redis.set(key, JSON.stringify(updated));
		}
	} catch {
		// Fire and forget - don't fail on hit count update
	}
}

/**
 * Get blocked IP count (fast)
 */
export async function getBlockedIPCount(): Promise<number> {
	try {
		const redis = await getRedis();
		const keys = await redis.scanKeys(`${KEY_PREFIX}*`);
		return keys.length;
	} catch {
		return 0;
	}
}
