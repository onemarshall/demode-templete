/**
 * Admin Plugin
 */

import { admin } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '#lib/platform/logger.js';

interface AdminEnv {
	AUTH_ADMIN_PLUGIN?: boolean;
	AUTH_ADMIN_DEFAULT_ROLE?: string;
	AUTH_ADMIN_ROLES?: string[];
	AUTH_ADMIN_USER_IDS?: string[];
	AUTH_ADMIN_IMPERSONATION_SESSION_DURATION?: number;
	AUTH_ADMIN_DEFAULT_BAN_REASON?: string;
	AUTH_ADMIN_DEFAULT_BAN_EXPIRES_IN?: number;
	AUTH_ADMIN_BANNED_USER_MESSAGE?: string;
}

/**
 * Build admin plugin if enabled
 */
export function AdminPlugin(env: AdminEnv): BetterAuthPlugin | null {
	if (!env.AUTH_ADMIN_PLUGIN) {
		return null;
	}
	logger.debug('Admin plugin enabled (server flag)');

	const defaultRole = env.AUTH_ADMIN_DEFAULT_ROLE ?? 'user';
	const adminRoles = env.AUTH_ADMIN_ROLES ?? ['admin'];
	const adminUserIds = env.AUTH_ADMIN_USER_IDS;
	const impersonationSessionDuration = env.AUTH_ADMIN_IMPERSONATION_SESSION_DURATION ?? 3600;
	const defaultBanReason = env.AUTH_ADMIN_DEFAULT_BAN_REASON ?? 'No reason';
	const defaultBanExpiresIn = env.AUTH_ADMIN_DEFAULT_BAN_EXPIRES_IN;
	const bannedUserMessage =
		env.AUTH_ADMIN_BANNED_USER_MESSAGE ??
		'You have been banned from this application. Please contact support if you believe this is an error.';

	try {
		return admin({
			defaultRole,
			adminRoles,
			adminUserIds,
			impersonationSessionDuration,
			defaultBanReason,
			defaultBanExpiresIn,
			bannedUserMessage
		});
	} catch (error) {
		logger.error('Failed to  admin plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
