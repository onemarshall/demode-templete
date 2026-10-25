/**
 * Temporary Block Management
 *
 * Ported from plugins/abuse-protection/services/block.ts
 * Handles temporary IP/user blocking after failed authentication attempts.
 */

import { z } from 'zod';
import type { BlockStatus, BlockingFeatureConfig } from './types';
import { createStorageAdapter, type StorageAdapter } from '../../core/storage';
import { logger } from '#lib/platform/logger.js';
import { CacheManager } from '../../core/cache';

const tempBlockDataSchema = z.object({
	reason: z.string().optional()
});

const KEY_PREFIX = 'block:temp:';

// Use unified cache manager instead of custom Map
const blockCache = new CacheManager<string, BlockStatus>('block-status', 500, 2000);

let storageAdapter: StorageAdapter | null = null;

async function getStorage(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

/**
 * Get block status for an identifier (cached)
 */
export async function getBlockStatus(
	identifier: string,
	config: BlockingFeatureConfig
): Promise<BlockStatus> {
	if (!config.enabled) {
		return { blocked: false };
	}

	// Check cache first
	const cached = blockCache.get(identifier);
	if (cached) {
		// Update expiresIn if blocked
		if (cached.blocked && cached.expiresAt) {
			const remaining = Math.max(0, Math.ceil((cached.expiresAt - Date.now()) / 1000));
			if (remaining <= 0) {
				blockCache.delete(identifier);
				return { blocked: false };
			}
			return { ...cached, expiresIn: remaining };
		}
		return cached;
	}

	try {
		const storage = await getStorage();
		const key = `${KEY_PREFIX}${identifier}`;

		const blockData = await storage.get(key);
		const ttl = await storage.ttl(key);

		if (!blockData || ttl <= 0) {
			const status: BlockStatus = { blocked: false };
			blockCache.set(identifier, status);
			return status;
		}

		let reason = 'Too many failed attempts';
		try {
			const parsed = tempBlockDataSchema.safeParse(JSON.parse(blockData));
			if (parsed.success && parsed.data.reason) {
				reason = parsed.data.reason;
			}
		} catch {
			// Use default reason
		}

		const now = Date.now();
		const status: BlockStatus = {
			blocked: true,
			reason,
			expiresAt: now + ttl * 1000,
			expiresIn: Math.max(0, ttl)
		};

		blockCache.set(identifier, status, Math.min(2000, ttl * 1000));
		return status;
	} catch (error) {
		logger.error('[Blocking] Block status check failed:', error);
		return { blocked: false };
	}
}

/**
 * Check if an identifier is currently blocked
 */
export async function isBlocked(
	identifier: string,
	config: BlockingFeatureConfig
): Promise<boolean> {
	const status = await getBlockStatus(identifier, config);
	return status.blocked;
}

/**
 * Set a temporary block for an identifier
 */
export async function setTempBlock(
	identifier: string,
	durationSeconds: number,
	reason: string = 'Too many failed attempts'
): Promise<void> {
	try {
		const storage = await getStorage();
		const key = `${KEY_PREFIX}${identifier}`;
		const blockData = JSON.stringify({ reason, blockedAt: Date.now() });

		await storage.set(key, blockData, durationSeconds);
		blockCache.delete(identifier);

		logger.warn('[Blocking] Temporary block set', {
			identifier,
			durationSeconds,
			reason
		});
	} catch (error) {
		logger.error('[Blocking] Failed to set temp block:', error);
	}
}

/**
 * Clear a temporary block for an identifier
 */
export async function clearTempBlock(identifier: string): Promise<void> {
	try {
		const storage = await getStorage();
		await storage.del(`${KEY_PREFIX}${identifier}`);
		blockCache.delete(identifier);

		logger.info('[Blocking] Temporary block cleared', { identifier });
	} catch (error) {
		logger.error('[Blocking] Failed to clear temp block:', error);
	}
}

/**
 * Clear temporary blocks for multiple identifiers (batch)
 */
export async function clearTempBlocks(identifiers: string[]): Promise<void> {
	if (identifiers.length === 0) return;

	try {
		const storage = await getStorage();
		for (const id of identifiers) {
			await storage.del(`${KEY_PREFIX}${id}`);
		}

		for (const id of identifiers) {
			blockCache.delete(id);
		}

		logger.info('[Blocking] Temporary blocks cleared', { count: identifiers.length });
	} catch (error) {
		logger.error('[Blocking] Failed to batch clear temp blocks:', error);
	}
}

/**
 * Calculate block duration using exponential backoff
 */
export function calculateBlockDuration(
	failedAttempts: number,
	config: BlockingFeatureConfig
): number {
	const maxAttempts = config.maxFailedAttempts ?? 5;
	const baseDuration = config.baseDuration ?? 60;
	const maxDuration = config.maxDuration ?? 3600;

	if (failedAttempts < maxAttempts) {
		return 0;
	}

	if (!config.escalatingBlocks) {
		return baseDuration;
	}

	const exponent = failedAttempts - maxAttempts;
	return Math.min(Math.pow(2, exponent) * baseDuration, maxDuration);
}

/**
 * Get remaining block time in seconds
 */
export async function getRemainingBlockTime(identifier: string): Promise<number> {
	try {
		const storage = await getStorage();
		const ttl = await storage.ttl(`${KEY_PREFIX}${identifier}`);
		return Math.max(0, ttl);
	} catch (error) {
		logger.error('[Blocking] Failed to get remaining block time:', error);
		return 0;
	}
}

/**
 * Clear block cache (for testing)
 */
export function clearBlockCache(): void {
	blockCache.clear();
}

/**
 * Reset storage adapter (for testing)
 */
export function resetRedisClient(): void {
	storageAdapter = null;
}
