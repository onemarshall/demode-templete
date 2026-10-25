/** Private runtime configuration. Import only from server code. */
import { logger } from '../logger.js';
import { fullEnvSchema, validateEnv } from './env-schema';
import type { FullEnv, PublicEnv } from './env-schema';
import { mergePublicEnv, clearPublicEnvCache, getPublicEnvDebugInfo, getPublicEnv } from './env';
export type { FullEnv, ServerEnv, PublicEnv } from './env-schema';
const IS_BROWSER = typeof window !== 'undefined';
const IS_SERVER = !IS_BROWSER;
const HAS_PROCESS_ENV = typeof process !== 'undefined' && process.env !== undefined;
let cachedServerEnv: FullEnv | null = null;
let dotenvLoaded = false;
async function tryImportEnv(modulePath: string): Promise<{ env: Record<string, unknown> }> {
	try {
		const module = await import(/* @vite-ignore */ modulePath);
		return module;
	} catch (error) {
		// Log the error for debugging but return fallback to prevent crashes
		logger.debug(`[Env] Failed to import ${modulePath}:`, error);
		// Return a fallback empty env object if import fails
		return { env: {} };
	}
}

// ============================================
// Dotenv Loading (Lazy, Server-only)
// ============================================

/**
 * Load dotenv files lazily when server env is first accessed.
 * Only runs once, only on server.
 */
async function ensureDotenvLoaded(): Promise<void> {
	if (dotenvLoaded || IS_BROWSER) return;
	dotenvLoaded = true;

	try {
		const [{ existsSync }, { config }] = await Promise.all([import('node:fs'), import('dotenv')]);

		// Load in priority order (first match wins with override: false)
		const envFiles = ['.env.local', `.env.${process.env.NODE_ENV || 'development'}`, '.env'];

		for (const path of envFiles) {
			if (existsSync(path)) {
				config({ path, override: false });
			}
		}
	} catch {
		// Dotenv not available - fine in production/bundled environments
	}
}

async function getServerEnvSource(): Promise<Record<string, unknown>> {
	// Fast path: process.env available
	if (HAS_PROCESS_ENV) {
		await ensureDotenvLoaded();
		return mergePublicEnv(process.env as Record<string, unknown>);
	}

	// SvelteKit path
	try {
		const [{ env: privateEnv }] = await Promise.all([
			tryImportEnv(/* @vite-ignore */ '$env/dynamic/private')
		]);
		return mergePublicEnv(privateEnv);
	} catch (error) {
		logger.warn('[Env] SvelteKit environment imports failed, falling back to process.env:', error);
		// Fallback to process.env for non-SvelteKit contexts
		if (HAS_PROCESS_ENV) {
			await ensureDotenvLoaded();
			return mergePublicEnv(process.env as Record<string, unknown>);
		}
		throw new Error('Unable to access server environment variables');
	}
}

export async function getServerEnv(): Promise<FullEnv> {
	if (IS_BROWSER) {
		throw new Error('getServerEnv() cannot be called on the client');
	}

	if (cachedServerEnv) return cachedServerEnv;

	const source = await getServerEnvSource();
	cachedServerEnv = validateEnv(source, fullEnvSchema, 'Server');
	return cachedServerEnv;
}

/**
 * Get validated server environment (sync, CLI/test only)
 */
export function getServerEnvSync(): FullEnv {
	if (IS_BROWSER) {
		throw new Error('getServerEnvSync() cannot be called on the client');
	}

	if (cachedServerEnv) return cachedServerEnv;

	if (!HAS_PROCESS_ENV) {
		throw new Error('getServerEnvSync() requires process.env (use getServerEnv() in SvelteKit)');
	}

	// Note: dotenv may not be loaded yet in sync path
	cachedServerEnv = validateEnv(process.env as Record<string, unknown>, fullEnvSchema, 'Server');
	return cachedServerEnv;
}

export function clearEnvCache(): void {
	clearPublicEnvCache();
	cachedServerEnv = null;
	dotenvLoaded = false;
}

/**
 * Reload environment variables.
 * Clears cache and re-validates.
 */
export async function reloadEnv(): Promise<{ public: PublicEnv; server?: FullEnv }> {
	clearEnvCache();

	const result: { public: PublicEnv; server?: FullEnv } = {
		public: await getPublicEnv()
	};

	if (IS_SERVER) {
		result.server = await getServerEnv();
	}

	return result;
}


/** Safe metadata for runtime diagnostics; private values are never returned. */
export function getDebugEnvInfo() {
  return { ...getPublicEnvDebugInfo(), serverEnvLoaded: cachedServerEnv !== null };
}
