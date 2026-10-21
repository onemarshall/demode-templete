/**
 * Magic Link Authentication Plugin
 */

import { magicLink } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '#lib/auth/shared/logger.js';
import { sendMagicLinkEmail } from '#lib/auth/server/email/index.js';

interface MagicLinkEnv {
	AUTH_MAGIC_LINK_PLUGIN?: boolean;
	PUBLIC_APP_NAME?: string;
	AUTH_MAGIC_LINK_EXPIRES_IN?: number;
	AUTH_MAGIC_LINK_DISABLE_SIGNUP?: boolean;
}

/**
 * Build magic link plugin if enabled
 */
export function MagicLinkPlugin(env: MagicLinkEnv): BetterAuthPlugin | null {
	if (!env.AUTH_MAGIC_LINK_PLUGIN) {
		return null;
	}

	const expiresIn = env.AUTH_MAGIC_LINK_EXPIRES_IN ?? 300;
	const disableSignUp = env.AUTH_MAGIC_LINK_DISABLE_SIGNUP ?? false;

	logger.debug('Magic link plugin enabled : Server');

	try {
		return magicLink({
			expiresIn,
			disableSignUp,
			async sendMagicLink({ email, url }, ctx) {
				logger.info(`Sending magic link to ${email}`, ctx?.request);

				try {
					await sendMagicLinkEmail(email, url);
					logger.info(`Magic link email sent successfully to ${email}`);
				} catch (error) {
					logger.error('Failed to send magic link email:', error);
					throw new Error('Failed to send magic link');
				}
			}
		});
	} catch (error) {
		logger.error('Failed to  magic link plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
