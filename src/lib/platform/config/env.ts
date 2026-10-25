/** Public runtime configuration. Safe to import from browser components. */
import * as kitPublicEnv from '$app/env/public';
import { logger } from '../logger.js';
import { publicEnvSchema, validateEnv, getSafeEnvLog } from './env-schema';
import type { PublicEnv } from './env-schema';
export type { PublicEnv } from './env-schema';
const IS_BROWSER = typeof window !== 'undefined';
const IS_SERVER = !IS_BROWSER;
const HAS_PROCESS_ENV = typeof process !== 'undefined' && process.env !== undefined;
let cachedPublicEnv: PublicEnv | null = null;
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
export function mergePublicEnv(source: Record<string, unknown>): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...source };

	for (const [key, value] of Object.entries(getKitPublicEnv())) {
		merged[key] = value;
	}

	return merged;
}

async function getPublicEnvSourceAsync(): Promise<Record<string, unknown>> {
	return getPublicEnvSourceSync();
}

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


/** Reset public validation state without importing private configuration. */
export function clearPublicEnvCache(): void { cachedPublicEnv = null; }
export function getPublicEnvDebugInfo() {
  return {
    nodeEnv: typeof publicEnv.PUBLIC_ENV_MODE === 'string' ? publicEnv.PUBLIC_ENV_MODE : 'unknown',
    isServer: IS_SERVER,
    publicEnvLoaded: cachedPublicEnv !== null,
    publicVars: getSafeEnvLog(publicEnv as unknown as Record<string, unknown>)
  };
}
