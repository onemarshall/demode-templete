// src/routes/auth/sessions/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { logger } from '#lib/auth/shared/logger.js';
import type { PageServerLoad } from './$types';

interface Session {
	id: string;
	token: string;
	userId: string;
	expiresAt: Date | string;
	createdAt: Date | string;
	updatedAt: Date | string;
	ipAddress?: string | null;
	userAgent?: string | null;
}

interface User {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	emailVerified: boolean;
	twoFactorEnabled?: boolean;
}

export const load: PageServerLoad = async ({ request, depends }) => {
	try {
		// Always fetch fresh session data from API to ensure we have all fields
		const apiSession = await auth.api.getSession({ headers: request.headers });
		if (!apiSession?.user || !apiSession?.session) {
			throw redirect(302, '/auth/sign-in');
		}
		const user = apiSession.user as User;
		const session = apiSession.session as Session;

		// Check session expiration
		const expiresAt = new Date(session.expiresAt);
		if (expiresAt <= new Date()) {
			throw redirect(302, '/auth/sign-in');
		}

		depends('auth:session');
		depends('auth:user');

		// Get all sessions for the user
		const allSessions = await listUserSessions(request.headers);

		// Get account and passkey counts
		const accountCount = await getAccountCount(request.headers);
		const passkeyCount = await getPasskeyCount(request.headers);

		return {
			user,
			session,
			allSessions,
			accountCount,
			passkeyCount
		};
	} catch (error) {
		// Re-throw SvelteKit redirects
		if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
			throw error;
		}

		logger.error('Session page load error', { error });
		throw redirect(302, '/auth/sign-in');
	}
};

/**
 * List all sessions for the current user
 */
async function listUserSessions(headers: Headers): Promise<Session[]> {
	try {
		const sessions = await auth.api.listSessions({ headers });
		return (sessions || []) as Session[];
	} catch (error) {
		logger.warn('Failed to list sessions', { error });
		return [];
	}
}

/**
 * Get count of linked accounts
 */
async function getAccountCount(headers: Headers): Promise<number> {
	try {
		const accounts = await auth.api.listUserAccounts({ headers });
		return Array.isArray(accounts) ? accounts.length : 0;
	} catch (error) {
		logger.debug('Failed to list accounts', { error });
		return 0;
	}
}

/**
 * Get count of registered passkeys
 */
async function getPasskeyCount(headers: Headers): Promise<number> {
	try {
		// Try the standard passkey API
		const api = auth.api as Record<string, unknown>;

		// Method 1: auth.api.listPasskeys
		if (typeof api.listPasskeys === 'function') {
			const passkeys = await (api.listPasskeys as (opts: { headers: Headers }) => Promise<unknown>)(
				{ headers }
			);
			if (Array.isArray(passkeys)) return passkeys.length;
			if (passkeys && typeof passkeys === 'object' && 'data' in passkeys) {
				const data = (passkeys as { data: unknown }).data;
				if (Array.isArray(data)) return data.length;
			}
		}

		// Method 2: auth.api.passkey.listUserPasskeys (if passkey is a namespace)
		const passkeyApi = api.passkey as Record<string, unknown> | undefined;
		if (passkeyApi && typeof passkeyApi.listUserPasskeys === 'function') {
			const passkeys = await (
				passkeyApi.listUserPasskeys as (opts: { headers: Headers }) => Promise<unknown>
			)({ headers });
			if (Array.isArray(passkeys)) return passkeys.length;
			if (passkeys && typeof passkeys === 'object' && 'data' in passkeys) {
				const data = (passkeys as { data: unknown }).data;
				if (Array.isArray(data)) return data.length;
			}
		}

		return 0;
	} catch (error) {
		logger.debug('Failed to get passkey count', { error });
		return 0;
	}
}
