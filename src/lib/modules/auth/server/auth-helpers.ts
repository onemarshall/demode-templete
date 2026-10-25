/**
 * Auth Helpers for Remote Functions
 *
 * Provides reusable authentication and authorization utilities
 * that properly integrate with SvelteKit's request context and Better Auth.
 */

import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { auth } from './config';
import { getUserRoles, isAdminUser } from '../shared/roles.js';

// Re-exported for backwards compatibility — the canonical implementations
// live in '../shared/roles.js' (pure module, no config side-effects).
export { getUserRoles, isAdminUser };
export type { AdminAuthorizationOptions, UserWithRoles } from '../shared/roles.js';

// ============================================
// Types
// ============================================

/**
 * Session type from Better Auth
 */
type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * User type with admin plugin fields
 */
export type SessionUser = NonNullable<Session>['user'] & {
	role?: string | string[];
	banned?: boolean;
	banReason?: string;
	banExpires?: Date;
};

/**
 * Authenticated session with typed user
 */
export interface AuthenticatedSession {
	user: SessionUser;
	session: NonNullable<NonNullable<Session>['session']>;
}

// ============================================
// Request Helpers
// ============================================

/**
 * Get the current request headers from SvelteKit's request event.
 */
export function getRequestHeaders(): Headers {
	const event = getRequestEvent();
	return event.request.headers;
}

/**
 * Get the current request from SvelteKit's request event.
 */
export function getRequest(): Request {
	const event = getRequestEvent();
	return event.request;
}

// ============================================
// Session Helpers
// ============================================

/**
 * Get the current session using Better Auth.
 * Returns null if no session exists.
 */
export async function getSession(): Promise<Session> {
	return auth.api.getSession({
		headers: getRequestHeaders()
	});
}

/**
 * Require authentication - throws 401 if not authenticated.
 * Returns typed session with user guaranteed to exist.
 */
export async function requireAuth(): Promise<AuthenticatedSession> {
	const session = await getSession();

	if (!session?.user || !session?.session) {
		error(401, 'Unauthorized');
	}

	// Check if user is banned
	const user = session.user as SessionUser;
	if (user.banned) {
		const message = user.banReason
			? `Account banned: ${user.banReason}`
			: 'Your account has been banned. Please contact support.';
		error(403, message);
	}

	return session as AuthenticatedSession;
}

/**
 * Require admin access - throws 401/403 appropriately.
 * Checks against ADMIN_ROLES and ADMIN_USER_IDS.
 */
export async function requireAdmin(): Promise<AuthenticatedSession> {
	const session = await requireAuth();
	const user = session.user;

	if (!isAdminUser(user)) {
		error(403, 'Admin access required');
	}

	return session;
}

/**
 * Require that the authenticated user matches the requested userId.
 * Admins can access any user's data.
 */
export async function requireSameUser(userId: string): Promise<AuthenticatedSession> {
	const session = await requireAuth();

	// Allow if same user
	if (session.user.id === userId) {
		return session;
	}

	// Allow if admin
	if (isAdminUser(session.user)) {
		return session;
	}

	error(403, 'Access denied');
}

// ============================================
// Check Helpers (non-throwing)
// ============================================

/**
 * Check if the current user is authenticated (doesn't throw).
 */
export async function isAuthenticated(): Promise<boolean> {
	try {
		const session = await getSession();
		return !!session?.user;
	} catch {
		return false;
	}
}

/**
 * Check if the current user is an admin (doesn't throw).
 */
export async function isAdmin(): Promise<boolean> {
	try {
		const session = await getSession();
		if (!session?.user) return false;

		const user = session.user as SessionUser;
		return isAdminUser(user);
	} catch {
		return false;
	}
}

/**
 * Check if user has a specific role (doesn't throw).
 */
export async function hasRole(role: string): Promise<boolean> {
	try {
		const session = await getSession();
		if (!session?.user) return false;

		const user = session.user as SessionUser;
		const userRoles = getUserRoles(user);

		return userRoles.includes(role);
	} catch {
		return false;
	}
}

// ============================================
// Admin API Helper
// ============================================

/**
 * Get the Better Auth admin API.
 * This is just auth.api - provided for clarity in admin operations.
 *
 * Note: All admin methods require headers with session cookies.
 * Use getRequestHeaders() to get the current request headers.
 */
export function getAdminApi() {
	return auth.api;
}
