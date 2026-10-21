/**
 * Canonical auth client entry point.
 *
 * This is the single source of truth for the Better Auth client instance,
 * its plugins, and initialization lifecycle. Import from `#lib/auth-client.js`
 * throughout the app.
 */

import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import {
	twoFactorClient,
	lastLoginMethodClient,
	siweClient,
	magicLinkClient,
	emailOTPClient
} from 'better-auth/client/plugins';
import { creemClient } from '@creem_io/better-auth/client';

import { publicEnv } from '#lib/auth/shared/env/index.js';
import type { auth } from '#lib/auth/server/config.js';

import {
	createFetchWrapper,
	initializeSessionManagement
} from '#lib/auth/client/helpers.js';

import { logger } from '#lib/auth/shared/logger.js';

// ============================================
// Types
// ============================================

interface SecurityClientModule {
	getStatus?: () => Promise<unknown>;
	verifyCaptcha?: (token: string) => Promise<unknown>;
	getHealth?: () => Promise<unknown>;
	configure?: (options: { baseUrl: string }) => void;
}

interface PluginConfig {
	envKey: keyof typeof publicEnv;
	name: string;
	loader: () => Promise<SecurityClientModule>;
}

// ============================================
// Configuration
// ============================================

const baseURL =
	typeof window !== 'undefined'
		? window.location.origin
		: String(publicEnv.PUBLIC_SITE_URL || 'http://localhost:3000');

const SECURITY_PLUGINS: PluginConfig[] = [
	{
		envKey: 'PUBLIC_AUTH_SECURITY_PLUGIN',
		name: 'security',
		loader: async () => {
			const m = await import('#lib/auth/security/client/standalone.js');
			return m.security;
		}
	}
];

// ============================================
// Auth Client
// ============================================

export const authClient = createAuthClient({
	baseURL,
	fetchOptions: { customFetchImpl: createFetchWrapper() },
	plugins: [
		inferAdditionalFields<typeof auth>(),
		...(publicEnv.PUBLIC_AUTH_PASSKEYS_PLUGIN ? [passkeyClient()] : []),
		...(publicEnv.PUBLIC_AUTH_LAST_LOGIN_METHOD_PLUGIN ? [lastLoginMethodClient()] : []),
		...(publicEnv.PUBLIC_AUTH_SIWE_PLUGIN ? [siweClient()] : []),
		...(publicEnv.PUBLIC_AUTH_MAGIC_LINK_PLUGIN ? [magicLinkClient()] : []),
		...(publicEnv.PUBLIC_AUTH_EMAIL_OTP_PLUGIN ? [emailOTPClient()] : []),
		...(publicEnv.PUBLIC_AUTH_2FA_PLUGIN
			? [
					twoFactorClient({
						onTwoFactorRedirect() {
							window.location.href = '/auth/2fa';
						}
					})
				]
			: []),
		...(publicEnv.PUBLIC_CREEM_ENABLED ? [creemClient()] : [])
	]
});

export default authClient;

// Export inferred types for use throughout the app
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session['user'];
export type AuthUser = typeof auth.$Infer.Session['user'];

// ============================================
// Security Plugin Loading
// ============================================

const loadedPlugins = new Map<string, SecurityClientModule>();

async function loadPlugin(config: PluginConfig): Promise<void> {
	if (!publicEnv[config.envKey]) return;

	try {
		const plugin = await config.loader();
		plugin.configure?.({ baseUrl: baseURL });
		loadedPlugins.set(config.name, plugin);
	} catch (error) {
		logger.warn(`[Auth] Failed to load ${config.name}:`, error);
	}
}

async function loadSecurityPlugins(): Promise<void> {
	await Promise.allSettled(SECURITY_PLUGINS.map(loadPlugin));
}

// ============================================
// Initialization
// ============================================

let isInitialized = false;

export async function initializeAuth(): Promise<void> {
	if (isInitialized) return;

	try {
		await loadSecurityPlugins();
		initializeSessionManagement(authClient);
		isInitialized = true;
	} catch (error) {
		logger.error('[Auth] Initialization failed:', error);
	}
}

export async function cleanupAuth(): Promise<void> {
	loadedPlugins.clear();
	isInitialized = false;
}

/**
 * Get a loaded security plugin by name
 */
export function getSecurityPlugin<T extends SecurityClientModule>(name: string): T | undefined {
	return loadedPlugins.get(name) as T | undefined;
}

/**
 * Check if auth has been initialized
 */
export function isAuthInitialized(): boolean {
	return isInitialized;
}

// Unified security client (re-export for convenience)
export { security, createSecurityClient, getSecurityClient } from '#lib/auth/security/client/index.js';
