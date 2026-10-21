/**
 * SIWE (Sign-In with Ethereum) Plugin
 */

import { siwe } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import { getSIWEConfig, validateSIWEConfig } from './utils';
import { logger } from '#lib/auth/shared/logger.js';

interface SIWEEnv {
	AUTH_SIWE_ENABLED?: boolean;
	PUBLIC_AUTH_SIWE_PLUGIN?: boolean;
	SIWE_DOMAIN?: string;
	SIWE_EMAIL_DOMAIN?: string;
	SIWE_ANONYMOUS?: boolean;
	SIWE_RPC_URL?: string;
	SIWE_ENABLE_ENS_LOOKUP?: boolean;
}

/**
 * Build SIWE plugin if enabled
 */
export function SIWEPlugin(env: SIWEEnv): BetterAuthPlugin | null {
	if (!env.AUTH_SIWE_ENABLED) {
		return null;
	}

	if (!validateSIWEConfig(env)) {
		logger.warn('SIWE plugin missing required config (SIWE_DOMAIN)');
		return null;
	}

	logger.debug('SIWE plugin enabled : Server');

	try {
		return siwe(getSIWEConfig(env));
	} catch (error) {
		logger.error('Failed to  SIWE plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
