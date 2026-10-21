/**
 * Admin Helpers for Remote Functions
 *
 * Provides admin-specific utilities that integrate with Better Auth's admin plugin.
 */

import { auth } from './config';
import { logger } from '$lib/auth/shared/logger';

/**
 * Get the Better Auth admin API.
 * This requires the admin plugin to be configured in your Better Auth setup.
 */
export function getAdminApi() {
	const api = auth?.api as Record<string, unknown> | undefined;
	const apiKeys = api ? Object.keys(api) : [];

	const required = [
		'setRole',
		'getUser',
		'createUser',
		'adminUpdateUser',
		'listUsers',
		'listUserSessions',
		'unbanUser',
		'banUser',
		'impersonateUser',
		'stopImpersonating',
		'revokeUserSession',
		'revokeUserSessions',
		'removeUser',
		'setUserPassword'
	];

	const missing = required.filter((key) => !api?.[key]);

	if (missing.length) {
		logger.error('Admin plugin not enabled; auth.api lacks admin endpoints', {
			apiKeys,
			missing
		});
		throw new Error('Admin plugin not enabled; auth.api.admin is unavailable');
	}

	return api as unknown;
}
