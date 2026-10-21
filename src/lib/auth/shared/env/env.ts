/**
 * Environment Configuration (Optimized)
 *
 * Provides validated, typed access to environment variables for both
 * client and server contexts. Handles SvelteKit, CLI, and test environments.
 *
 * Optimizations:
 * - Lazy dotenv loading (only when needed)
 * - Cached environment detection
 * - Single-pass validation
 * - Minimal dynamic imports
 */

import * as kitPublicEnv from '$app/env/public';
import { logger } from '#lib/auth/shared/logger.js';
import { publicEnvSchema, fullEnvSchema, validateEnv, getSafeEnvLog } from './env-schema';

// Re-export types and utilities
export type { PublicEnv, ServerEnv, FullEnv } from './env-schema';
export { getSafeEnvLog, isSecurityFeatureEnabled } from './env-schema';

import type { PublicEnv, FullEnv } from './env-schema';

// ============================================
// Constants (cached at module load)
// ============================================

const IS_BROWSER = typeof window !== 'undefined';
const IS_SERVER = !IS_BROWSER;
const HAS_PROCESS_ENV = typeof process !== 'undefined' && process.env !== undefined;

// ============================================
// Module State
// ============================================

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: FullEnv | null = null;
let dotenvLoaded = false;

// ============================================
// Helper Functions
// ============================================

/**
 * Safely import SvelteKit environment modules with fallback
 */
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

// ============================================
// Global Types
// ============================================

// Remove the global declaration since we're not using Vite define anymore

// ============================================
// Environment Sources
// ============================================

/**
 * Copy the values SvelteKit resolved for `$app/env/public`.
 *
 * The variables are declared in `src/env.ts`. On the server they hold the values
 * resolved at runtime (`process.env` in Node, the platform binding on Cloudflare
 * Workers); in the browser they hold the very same values, because the server
 * ships them to the client with the page payload.
 */
function getKitPublicEnv(): Record<string, unknown> {
	const source: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(kitPublicEnv)) {
		if (value !== undefined) source[key] = value;
	}

	return source;
}

/**
 * Get public env source synchronously (fast path)
 */
function getPublicEnvSourceSync(): Record<string, unknown> {
	if (IS_BROWSER) {
		// The browser has no access to `process.env`; the values rendered by the
		// server are the ones SvelteKit delivered with the page payload.
		return getKitPublicEnv();
	}

	// On the server `process.env` is the authoritative runtime source. The
	// SvelteKit values are used as a fallback for runtimes that don't expose
	// `process.env` (e.g. Cloudflare Workers, where the values come from the
	// platform binding).
	return mergePublicEnv(HAS_PROCESS_ENV ? (process.env as Record<string, unknown>) : {});
}

/**
 * Add the values SvelteKit resolved for `$app/env/public` to a source object.
 *
 * These are the very values the server sends to the browser with the page
 * payload, so they take precedence over `process.env`. That keeps the server
 * and the browser in agreement — variables that are not declared in
 * `src/env.ts` keep their `process.env` value.
 */
function mergePublicEnv(source: Record<string, unknown>): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...source };

	for (const [key, value] of Object.entries(getKitPublicEnv())) {
		merged[key] = value;
	}

	return merged;
}

/**
 * Get public env source (async path)
 *
 * The values are resolved synchronously, the async signature is kept for
 * backwards compatibility with callers that await it.
 */
async function getPublicEnvSourceAsync(): Promise<Record<string, unknown>> {
	return getPublicEnvSourceSync();
}

/**
 * Get server env source (server-only, async)
 */
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

// ============================================
// Public Environment Access
// ============================================

/**
 * Initialize public env synchronously at module load.
 * Uses fast sync sources, validates with schema defaults on failure.
 */
function initializePublicEnv(): PublicEnv {
	if (cachedPublicEnv) return cachedPublicEnv;

	const source = getPublicEnvSourceSync();

	try {
		// Force schema validation to ensure new properties are recognized
		cachedPublicEnv = validateEnv(source, publicEnvSchema, 'Public');
	} catch (error) {
		// Use defaults to prevent crash during build/SSR
		logger.error('[Env] Public env validation failed, using defaults', {
			error: error instanceof Error ? error.message : String(error)
		});
		// Parse fresh defaults to include new schema properties
		cachedPublicEnv = publicEnvSchema.parse({});
	}

	return cachedPublicEnv;
}

/**
 * Synchronous access to public environment.
 * Initialized once at module load.
 */
export const publicEnv: PublicEnv = initializePublicEnv();

/**
 * Force refresh public environment (useful for development/debugging)
 */
export function refreshPublicEnv(): PublicEnv {
	cachedPublicEnv = null;
	return initializePublicEnv();
}

/**
 * Get validated public env (async version with SvelteKit fallback)
 */
export async function getPublicEnv(): Promise<PublicEnv> {
	// Always return the latest value, ignore cache for async calls
	const source = await getPublicEnvSourceAsync();
	const freshEnv = validateEnv(source, publicEnvSchema, 'Public');

	// Update cache
	cachedPublicEnv = freshEnv;

	return freshEnv;
}

// ============================================
// Server Environment Access
// ============================================

/**
 * Get validated server environment (async, primary method)
 */
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

// ============================================
// Environment Helpers (Inlined for performance)
// ============================================

/** Check if running in development mode */
export const isDevelopment = (): boolean => publicEnv.PUBLIC_ENV_MODE === 'development';

/** Check if running in production mode */
export const isProduction = (): boolean => publicEnv.PUBLIC_ENV_MODE === 'production';

/** Check if running in staging mode */
export const isStaging = (): boolean => publicEnv.PUBLIC_ENV_MODE === 'staging';

/** Check if running on the server */
export const isServer = (): boolean => IS_SERVER;

/** Check if running in the browser */
export const isBrowser = (): boolean => IS_BROWSER;

/** Check if auth debug mode is enabled */
export const isAuthDebugMode = (): boolean => publicEnv.PUBLIC_AUTH_DEBUG_MODE === true;

// ============================================
// Cache Management
// ============================================

/**
 * Clear cached environment variables.
 * Useful for testing or hot reloading.
 */
export function clearEnvCache(): void {
	cachedPublicEnv = null;
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

// ============================================
// Debug Utilities
// ============================================

/**
 * Get safe representation of current environment for debugging.
 * Redacts sensitive values.
 */
export function getDebugEnvInfo(): {
	nodeEnv: string;
	isServer: boolean;
	publicEnvLoaded: boolean;
	serverEnvLoaded: boolean;
	publicVars: Record<string, unknown>;
} {
	return {
		nodeEnv: typeof publicEnv.PUBLIC_ENV_MODE === 'string' ? publicEnv.PUBLIC_ENV_MODE : 'unknown',
		isServer: IS_SERVER,
		publicEnvLoaded: cachedPublicEnv !== null,
		serverEnvLoaded: cachedServerEnv !== null,
		publicVars: getSafeEnvLog(publicEnv as unknown as Record<string, unknown>)
	};
}
