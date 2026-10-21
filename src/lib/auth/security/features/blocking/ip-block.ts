/**
 * Permanent IP Blocklist Management
 *
 * Handles permanent IP blocking for known bad actors.
 */

import { createStorageAdapter, type StorageAdapter } from '../../core/storage';
import { logger } from '#lib/auth/shared/logger.js';
import { CacheManager } from '../../core/cache';

const KEY_PREFIX = 'block:ip:';
const BLOCKLIST_KEY = 'block:ip:list';

// Cache for blocked IP lookup
const ipBlockCache = new CacheManager<string, boolean>('ip-block', 1000, 60000);

let storageAdapter: StorageAdapter | null = null;

async function getStorage(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

/**
 * Check if an IP is permanently blocked
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
	// Check cache first
	const cached = ipBlockCache.get(ip);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const storage = await getStorage();
		const blocked = await storage.sIsMember(BLOCKLIST_KEY, ip);
		ipBlockCache.set(ip, blocked);
		return blocked;
	} catch (error) {
		logger.error('[IPBlock] Failed to check IP block:', error);
		return false; // Fail-open
	}
}

/**
 * Add an IP to the permanent blocklist
 */
export async function blockIP(ip: string, reason?: string): Promise<void> {
	try {
		const storage = await getStorage();
		await storage.sAdd(BLOCKLIST_KEY, ip);
		if (reason) {
			await storage.set(`${KEY_PREFIX}${ip}:reason`, reason);
		}
		ipBlockCache.set(ip, true);

		logger.warn('[IPBlock] IP permanently blocked', { ip, reason });
	} catch (error) {
		logger.error('[IPBlock] Failed to block IP:', error);
	}
}

/**
 * Remove an IP from the permanent blocklist
 */
export async function unblockIP(ip: string): Promise<void> {
	try {
		const storage = await getStorage();
		await storage.sRem(BLOCKLIST_KEY, ip);
		await storage.del(`${KEY_PREFIX}${ip}:reason`);
		ipBlockCache.delete(ip);

		logger.info('[IPBlock] IP unblocked', { ip });
	} catch (error) {
		logger.error('[IPBlock] Failed to unblock IP:', error);
	}
}

/**
 * Get list of all blocked IPs
 */
export async function getBlockedIPs(): Promise<string[]> {
	try {
		const storage = await getStorage();
		return await storage.sMembers(BLOCKLIST_KEY);
	} catch (error) {
		logger.error('[IPBlock] Failed to get blocked IPs:', error);
		return [];
	}
}

/**
 * Get block reason for an IP
 */
export async function getBlockReason(ip: string): Promise<string | null> {
	try {
		const storage = await getStorage();
		return await storage.get(`${KEY_PREFIX}${ip}:reason`);
	} catch (error) {
		logger.error('[IPBlock] Failed to get block reason:', error);
		return null;
	}
}

/**
 * Check multiple IPs at once
 */
export async function areIPsBlocked(ips: string[]): Promise<Map<string, boolean>> {
	const results = new Map<string, boolean>();

	// Check cache first
	const uncached: string[] = [];
	for (const ip of ips) {
		const cached = ipBlockCache.get(ip);
		if (cached !== undefined) {
			results.set(ip, cached);
		} else {
			uncached.push(ip);
		}
	}

	if (uncached.length === 0) {
		return results;
	}

	try {
		const storage = await getStorage();

		for (const ip of uncached) {
			const blocked = await storage.sIsMember(BLOCKLIST_KEY, ip);
			results.set(ip, blocked);
			ipBlockCache.set(ip, blocked);
		}
	} catch (error) {
		logger.error('[IPBlock] Failed to check IP blocks:', error);
		// Set uncached as not blocked (fail-open)
		for (const ip of uncached) {
			results.set(ip, false);
		}
	}

	return results;
}

/**
 * Clear IP block cache (for testing)
 */
export function clearIPBlockCache(): void {
	ipBlockCache.clear();
}

/**
 * Reset storage adapter (for testing)
 */
export function resetRedisClient(): void {
	storageAdapter = null;
}
