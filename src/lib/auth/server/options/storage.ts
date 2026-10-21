/**
 * Storage Configuration Options
 *
 * Storage-related authentication configuration.
 * Uses globalThis to ensure the same storage instance is shared across
 * all module loads (Vite HMR can create separate module instances).
 */

import { getServerEnv, type FullEnv } from '../../shared/env';
import { createClient } from 'redis';

export type SessionStorage = {
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string, ttl?: number) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

const STORAGE_KEY = '__better_auth_session_storage__';

export async function secondaryStorage(envOverride?: FullEnv): Promise<SessionStorage> {
	if ((globalThis as Record<string, unknown>)[STORAGE_KEY]) {
		return (globalThis as Record<string, unknown>)[STORAGE_KEY] as SessionStorage;
	}

	const env = envOverride ?? (await getServerEnv());
	const redisUrl = typeof env.REDIS_URL === 'string' ? env.REDIS_URL : undefined;

	let storage: SessionStorage;

	if (redisUrl) {
		// Use Redis-backed storage
		const redis = createClient({ url: redisUrl });
		await redis.connect();

		storage = {
			get: async (key: string): Promise<string | null> => {
				const value = await redis.get(key);
				return value ?? null;
			},
			set: async (key: string, value: string, ttl?: number): Promise<void> => {
				if (ttl) await redis.set(key, value, { EX: ttl });
				else await redis.set(key, value);
			},
			delete: async (key: string): Promise<void> => {
				await redis.del(key);
			}
		};
	} else {
		// Fallback to in-memory Map when Redis not configured
		const store = new Map<string, string>();
		const expirations = new Map<string, NodeJS.Timeout>();

		storage = {
			get: async (key: string): Promise<string | null> => {
				return store.has(key) ? store.get(key)! : null;
			},
			set: async (key: string, value: string, ttl?: number): Promise<void> => {
				store.set(key, value);
				// handle TTL manually
				if (ttl) {
					if (expirations.has(key)) clearTimeout(expirations.get(key)!);
					expirations.set(
						key,
						setTimeout(() => {
							store.delete(key);
							expirations.delete(key);
						}, ttl * 1000)
					);
				}
			},
			delete: async (key: string): Promise<void> => {
				store.delete(key);
				if (expirations.has(key)) {
					clearTimeout(expirations.get(key)!);
					expirations.delete(key);
				}
			}
		};
	}

	(globalThis as Record<string, unknown>)[STORAGE_KEY] = storage;
	return storage;
}

/**
 * Get the existing storage instance. Throws if not yet initialized.
 */
export function getSessionStorage(): SessionStorage {
	const storage = (globalThis as Record<string, unknown>)[STORAGE_KEY] as SessionStorage | undefined;
	if (!storage) {
		throw new Error('Secondary storage not initialized. Call secondaryStorage() first.');
	}
	return storage;
}

// Export alias for compatibility with existing imports
export { secondaryStorage as getSecondaryStorage };
