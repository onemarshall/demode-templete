/**
 * Passkey Authentication Plugin
 */

import { passkey } from '@better-auth/passkey';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '$lib/auth/shared/logger';
import { resolvePasskeyConfig } from './config';

interface PasskeyEnv {
	PUBLIC_AUTH_PASSKEYS_PLUGIN?: boolean;
	PUBLIC_AUTH_PASSKEY_RPID?: string;
	PUBLIC_AUTH_PASSKEY_RP_NAME?: string;
	PUBLIC_AUTH_PASSKEY_ORIGIN?: string;
	PUBLIC_AUTH_PASSKEY_ATTACHMENT?: 'platform' | 'cross-platform';
	PUBLIC_AUTH_PASSKEY_RESIDENT_KEY?: 'required' | 'preferred' | 'discouraged';
	PUBLIC_AUTH_PASSKEY_USER_VERIFICATION?: 'required' | 'preferred' | 'discouraged';
	PUBLIC_APP_NAME?: string;
	PUBLIC_SITE_URL?: string;
	PUBLIC_BETTER_AUTH_URL?: string;
}

/**
 * Build passkey plugin if enabled
 */
export function PasskeyPlugin(env: PasskeyEnv): BetterAuthPlugin | null {
	if (!env.PUBLIC_AUTH_PASSKEYS_PLUGIN) {
		return null;
	}

	// The relying party ID has to match the origin the browser is served from,
	// otherwise the ceremony is rejected with ERROR_INVALID_RP_ID and reported
	// as a generic "Auth cancelled". Resolve it from the canonical URLs so a
	// missing variable cannot silently break the deployed environment.
	const config = resolvePasskeyConfig({
		rpID: env.PUBLIC_AUTH_PASSKEY_RPID,
		origin: env.PUBLIC_AUTH_PASSKEY_ORIGIN,
		siteUrl: env.PUBLIC_SITE_URL,
		betterAuthUrl: env.PUBLIC_BETTER_AUTH_URL,
	});

	for (const warning of config.warnings) {
		logger.warn(`[Passkey] ${warning}`);
	}

	logger.debug('Passkey plugin enabled : Server', {
		rpID: config.rpID,
		origins: config.origins,
	});

	const authenticatorAttachment = env.PUBLIC_AUTH_PASSKEY_ATTACHMENT;
	const residentKey = env.PUBLIC_AUTH_PASSKEY_RESIDENT_KEY ?? 'preferred';
	const userVerification = env.PUBLIC_AUTH_PASSKEY_USER_VERIFICATION ?? 'preferred';

	try {
		return passkey({
			rpID: config.rpID,
			rpName: env.PUBLIC_AUTH_PASSKEY_RP_NAME || env.PUBLIC_APP_NAME || 'App',
			// `null` makes better-auth fall back to the origin of the incoming
			// request, which keeps local development on other ports working.
			origin: config.origins,
			authenticatorSelection: {
				authenticatorAttachment,
				residentKey,
				userVerification
			}
		});
	} catch (error) {
		logger.error('Failed to  passkey plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
