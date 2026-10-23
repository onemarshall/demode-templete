/**
 * Core Better Auth Plugins
 *
 * Aggregates all module plugins into a single array.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '#lib/auth/shared/env/index.js';
import { logger } from '#lib/auth/shared/logger.js';

// Import module plugins
import { AdminPlugin } from '#lib/auth/modules/admin/index.js';
import { CreemPlugin } from '#lib/auth/modules/creem/index.js';
import { EmailOTPPlugin } from '#lib/auth/modules/emailOTP/index.js';
import { LastLoginMethodPlugin } from '#lib/auth/modules/lastLoginMethod/index.js';
import { MagicLinkPlugin } from '#lib/auth/modules/magicLink/index.js';
import { OAuthProxyPlugin } from '#lib/auth/modules/oauthProxy/index.js';
import { OneTimeTokenPlugin } from '#lib/auth/modules/oneTimeToken/index.js';
import { OrganizationPlugin } from '#lib/auth/modules/organization/index.js';
import { PasskeyPlugin } from '#lib/auth/modules/passkey/index.js';
import { SIWEPlugin } from '#lib/auth/modules/siwe/plugin.js';
import { TwoFactorPlugin } from '#lib/auth/modules/twoFactor/index.js';

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
	{ name: 'Organization', factory: OrganizationPlugin },
	{ name: 'Passkey', factory: PasskeyPlugin },
	{ name: 'Two-Factor', factory: TwoFactorPlugin },
	{ name: 'Magic Link', factory: MagicLinkPlugin },
	{ name: 'SIWE', factory: SIWEPlugin },
	{ name: 'Email OTP', factory: EmailOTPPlugin },
	{ name: 'One-Time Token', factory: OneTimeTokenPlugin },
	{ name: 'OAuth Proxy', factory: OAuthProxyPlugin },
	{ name: 'Creem', factory: CreemPlugin }
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

export { AdminPlugin } from '#lib/auth/modules/admin/index.js';
export { CreemPlugin } from '#lib/auth/modules/creem/index.js';
export { EmailOTPPlugin } from '#lib/auth/modules/emailOTP/index.js';
export { LastLoginMethodPlugin } from '#lib/auth/modules/lastLoginMethod/index.js';
export { MagicLinkPlugin } from '#lib/auth/modules/magicLink/index.js';
export { OAuthProxyPlugin } from '#lib/auth/modules/oauthProxy/index.js';
export { OneTimeTokenPlugin } from '#lib/auth/modules/oneTimeToken/index.js';
export { OrganizationPlugin } from '#lib/auth/modules/organization/index.js';
export { PasskeyPlugin } from '#lib/auth/modules/passkey/index.js';
export { SIWEPlugin } from '#lib/auth/modules/siwe/plugin.js';
export { TwoFactorPlugin } from '#lib/auth/modules/twoFactor/index.js';
