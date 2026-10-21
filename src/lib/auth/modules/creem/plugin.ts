/**
 * Creem Plugin
 *
 * Better Auth plugin for Creem payment processing and subscription management.
 * @see https://creem.io
 */

import { creem } from '@creem_io/better-auth';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '$lib/auth/shared/logger';

interface CreemEnv {
	CREEM_API_KEY?: string;
	CREEM_WEBHOOK_SECRET?: string;
	CREEM_TEST_MODE?: boolean;
	CREEM_PERSIST_SUBSCRIPTIONS?: boolean;
	CREEM_DEFAULT_SUCCESS_URL?: string;
	PUBLIC_CREEM_ENABLED?: boolean;
}

/**
 * Build Creem plugin if enabled and API key is present
 */
export function CreemPlugin(env: CreemEnv): BetterAuthPlugin | null {
	if (!env.PUBLIC_CREEM_ENABLED || !env.CREEM_API_KEY) {
		return null;
	}

	logger.debug('Creem plugin enabled');

	const apiKey = env.CREEM_API_KEY;
	const webhookSecret = env.CREEM_WEBHOOK_SECRET;
	const testMode = env.CREEM_TEST_MODE ?? true;
	const persistSubscriptions = env.CREEM_PERSIST_SUBSCRIPTIONS ?? true;
	const defaultSuccessUrl = env.CREEM_DEFAULT_SUCCESS_URL ?? '/dashboard';

	try {
		return creem({
			apiKey,
			webhookSecret,
			testMode,
			persistSubscriptions,
			defaultSuccessUrl
		});
	} catch (error) {
		logger.error('Failed to build Creem plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
