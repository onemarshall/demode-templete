/**
 * Module Plugin Template
 *
 * Copy this file to create new module plugins.
 * Replace MODULE_NAME with your module name.
 *
 * Pattern:
 *   1. Check if enabled via env flag
 *   2. Validate required config
 *   3. Build and return plugin (or null if disabled)
 */

import type { BetterAuthPlugin } from 'better-auth';
import { oneTimeToken } from 'better-auth/plugins/one-time-token';
import { logger } from '#lib/auth/shared/logger.js';

interface OneTimeTokenEnv {
	AUTH_ONE_TIME_TOKEN_ENABLED?: boolean;
}

/**
 * Build MODULE_NAME plugin if enabled
 */
export function OneTimeTokenPlugin(env: OneTimeTokenEnv): BetterAuthPlugin | null {
	const enabled = env.AUTH_ONE_TIME_TOKEN_ENABLED === true;
	if (!enabled) {
		return null;
	}

	logger.debug('One-Time Token plugin enabled : Server');

	try {
		return oneTimeToken({
			// Aligns with docs: server-only generation, 10 minute expiry, hashed storage
			disableClientRequest: true,
			expiresIn: 10,
			storeToken: 'hashed'
		});
	} catch (error) {
		logger.error('Failed to  One-Time Token plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
