/**
 * OAuth Proxy Plugin
 *
 * Routes OAuth flows through the production server so preview/dev
 * environments can share the single registered production callback URL.
 * Requires the same OAUTH_PROXY_SECRET on every participating environment.
 * @see https://www.better-auth.com/docs/plugins/oauth-proxy
 */

import type { BetterAuthPlugin } from 'better-auth';
import { oAuthProxy } from 'better-auth/plugins';
import { logger } from '#lib/auth/shared/logger.js';

interface OAuthProxyEnv {
	AUTH_OAUTH_PROXY_PLUGIN?: boolean;
	OAUTH_PROXY_SECRET?: string;
	PUBLIC_BETTER_AUTH_URL?: string;
}

/**
 * Build OAuth Proxy plugin if enabled
 */
export function OAuthProxyPlugin(env: OAuthProxyEnv): BetterAuthPlugin | null {
	const enabled = env.AUTH_OAUTH_PROXY_PLUGIN === true;
	if (!enabled) {
		return null;
	}

	if (!env.OAUTH_PROXY_SECRET) {
		logger.warn('OAuth Proxy plugin enabled but OAUTH_PROXY_SECRET is not set');
		return null;
	}

	logger.debug('OAuth Proxy plugin enabled : Server');

	try {
		return oAuthProxy({
			productionURL: env.PUBLIC_BETTER_AUTH_URL,
			secret: env.OAUTH_PROXY_SECRET
		});
	} catch (error) {
		logger.error('Failed to build OAuth Proxy plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
