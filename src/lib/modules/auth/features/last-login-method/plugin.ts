/**
 * Last Login Method Plugin
 *
 * Wraps better-auth's lastLoginMethod plugin with env-driven toggles.
 */

import { lastLoginMethod } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '#lib/platform/logger.js';

interface LastLoginMethodEnv {
	AUTH_LAST_LOGIN_METHOD_ENABLED?: boolean;
	AUTH_LAST_LOGIN_METHOD_STORE_DB?: boolean;
}

/**
 * Build last login method plugin if enabled.
 */
export function LastLoginMethodPlugin(env: LastLoginMethodEnv): BetterAuthPlugin | null {
	const enabled = env.AUTH_LAST_LOGIN_METHOD_ENABLED ?? true;
	if (!enabled) {
		return null;
	}

	const storeInDatabase = env.AUTH_LAST_LOGIN_METHOD_STORE_DB ?? true;
	logger.debug('Last login method plugin enabled', { storeInDatabase });

	try {
		return lastLoginMethod({
			storeInDatabase
		});
	} catch (error) {
		logger.error('Failed to  last login method plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
