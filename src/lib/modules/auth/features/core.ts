/**
 * Core Better Auth Plugins
 *
 * Aggregates all module plugins into a single array.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '#lib/platform/config/index.js';
import { logger } from '#lib/platform/logger.js';

// Import module plugins
import { AdminPlugin } from './admin/index.js';
import { getAuthIntegrations } from '../server/integrations';
import { EmailOTPPlugin } from './email-otp/index.js';
import { LastLoginMethodPlugin } from './last-login-method/index.js';
import { MagicLinkPlugin } from './magic-link/index.js';
import { OAuthProxyPlugin } from './oauth-proxy/index.js';
import { OneTimeTokenPlugin } from './one-time-token/index.js';
import { OrganizationPlugin } from './organization/index.js';
import { PasskeyPlugin } from './passkey/index.js';
import { SIWEPlugin } from './siwe/plugin.js';
import { TwoFactorPlugin } from './two-factor/index.js';

// ============================================
// Types
// ============================================

type PluginFactory = (env: FullEnv) => BetterAuthPlugin | null;

interface PluginDefinition {
	name: string;
	factory: PluginFactory;
	alwaysEnabled?: boolean;
}

// ============================================
// Plugin Configuration
// ============================================

const PLUGIN_DEFINITIONS: PluginDefinition[] = [
	{ name: 'Last Login Method', factory: LastLoginMethodPlugin, alwaysEnabled: true },
	{ name: 'Admin', factory: AdminPlugin },
	{ name: 'Organization', factory: (env) => OrganizationPlugin(env, getAuthIntegrations().organizationHooks) },
	{ name: 'Passkey', factory: PasskeyPlugin },
	{ name: 'Two-Factor', factory: TwoFactorPlugin },
	{ name: 'Magic Link', factory: MagicLinkPlugin },
	{ name: 'SIWE', factory: SIWEPlugin },
	{ name: 'Email OTP', factory: EmailOTPPlugin },
	{ name: 'One-Time Token', factory: OneTimeTokenPlugin },
	{ name: 'OAuth Proxy', factory: OAuthProxyPlugin }
];

// ============================================
// Plugin Builder
// ============================================

/**
 * Build core plugins based on environment configuration
 */
export function buildCorePlugins(env: FullEnv): BetterAuthPlugin[] {
	const plugins: BetterAuthPlugin[] = [];
	const enabled: string[] = [];

	for (const { name, factory } of PLUGIN_DEFINITIONS) {
		const plugin = factory(env);

		if (plugin) {
			plugins.push(plugin);
			enabled.push(name);
		}
	}

	logger.info(`Core plugins initialized: ${enabled.join(', ')} (${plugins.length} active)`);
	return plugins;
}

// ============================================
// Re-exports
// ============================================

export { AdminPlugin } from './admin/index.js';
export { EmailOTPPlugin } from './email-otp/index.js';
export { LastLoginMethodPlugin } from './last-login-method/index.js';
export { MagicLinkPlugin } from './magic-link/index.js';
export { OAuthProxyPlugin } from './oauth-proxy/index.js';
export { OneTimeTokenPlugin } from './one-time-token/index.js';
export { OrganizationPlugin } from './organization/index.js';
export { PasskeyPlugin } from './passkey/index.js';
export { SIWEPlugin } from './siwe/plugin.js';
export { TwoFactorPlugin } from './two-factor/index.js';
