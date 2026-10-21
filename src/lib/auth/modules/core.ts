/**
 * Core Better Auth Plugins
 *
 * Aggregates all module plugins into a single array.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '$lib/auth/shared/env';
import { logger } from '$lib/auth/shared/logger';

// Import module plugins
import { AdminPlugin } from '$lib/auth/modules/admin';
import { CreemPlugin } from '$lib/auth/modules/creem';
import { EmailOTPPlugin } from '$lib/auth/modules/emailOTP';
import { LastLoginMethodPlugin } from '$lib/auth/modules/lastLoginMethod';
import { MagicLinkPlugin } from '$lib/auth/modules/magicLink';
import { OAuthProxyPlugin } from '$lib/auth/modules/oauthProxy';
import { OneTimeTokenPlugin } from '$lib/auth/modules/oneTimeToken';
import { PasskeyPlugin } from '$lib/auth/modules/passkey';
import { SIWEPlugin } from '$lib/auth/modules/siwe/plugin';
import { TwoFactorPlugin } from '$lib/auth/modules/twoFactor';

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

export { AdminPlugin } from '$lib/auth/modules/admin';
export { CreemPlugin } from '$lib/auth/modules/creem';
export { EmailOTPPlugin } from '$lib/auth/modules/emailOTP';
export { LastLoginMethodPlugin } from '$lib/auth/modules/lastLoginMethod';
export { MagicLinkPlugin } from '$lib/auth/modules/magicLink';
export { OAuthProxyPlugin } from '$lib/auth/modules/oauthProxy';
export { OneTimeTokenPlugin } from '$lib/auth/modules/oneTimeToken';
export { PasskeyPlugin } from '$lib/auth/modules/passkey';
export { SIWEPlugin } from '$lib/auth/modules/siwe/plugin';
export { TwoFactorPlugin } from '$lib/auth/modules/twoFactor';
