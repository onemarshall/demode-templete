/**
 * Storage Client Management for Security Services
 *
 * Provides the shared StorageAdapter for all security services.
 * Redis, Postgres, or in-memory — selected automatically from env.
 */

import { createStorageAdapter, type StorageAdapter } from '../core/storage';

let storageAdapter: StorageAdapter | null = null;

/**
 * Get storage adapter for security services
 */
export async function getRedis(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

/**
 * Pre-seed the shared adapter at boot so the first request doesn't trigger lazy init
 * (which runs CREATE TABLE IF NOT EXISTS on Postgres). Safe to call multiple times.
 */
export function setSharedStorageAdapter(adapter: StorageAdapter): void {
	storageAdapter = adapter;
}

/**
 * Reset storage adapter (for testing)
 */
export function resetRedisClient(): void {
	storageAdapter = null;
}
