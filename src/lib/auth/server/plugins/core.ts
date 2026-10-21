/**
 * Core Better Auth Plugins
 *
 * Aggregates all module plugins into a single array.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '#lib/auth/shared/env/index.js';
import { buildCorePlugins as buildModuleCorePlugins } from '#lib/auth/modules/core.js';

/**
 *  core plugins based on environment configuration
 */
export function CorePlugins(env: FullEnv): BetterAuthPlugin[] {
	return buildModuleCorePlugins(env);
}

// Alias export used by config/aggregator
export const buildCorePlugins = CorePlugins;

// Re-export module plugin ers for direct use
export {
	AdminPlugin,
	CreemPlugin,
	EmailOTPPlugin,
	LastLoginMethodPlugin,
	MagicLinkPlugin,
	OAuthProxyPlugin,
	OneTimeTokenPlugin,
	PasskeyPlugin,
	SIWEPlugin,
	TwoFactorPlugin
} from '#lib/auth/modules/core.js';

// Re-export lastLoginMethod for direct use
export { lastLoginMethod } from 'better-auth/plugins';
