import { redirect, error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/modules/auth/server/config.js';
import { isAdminUser } from '#lib/modules/auth/server/auth-helpers.js';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getAdminApi } from '#lib/modules/auth/server/admin-helpers.js';
import { logger } from '#lib/platform/logger.js';
import type { SessionItem, UserDetail, UserListItem } from '#lib/modules/auth/features/admin/shared/types.js';

// ================================
// Types
// ================================

interface AdminListUsersResponse {
	users: UserListItem[];
	total?: number;
}

interface AdminListSessionsResponse {
	sessions: SessionItem[];
}

interface AdminApi {
	listUsers(input: {
		query?: { limit?: number; page?: number; cursor?: string };
		headers: Headers;
	}): Promise<AdminListUsersResponse>;
	getUser(input: { query: { id: string }; headers: Headers }): Promise<UserDetail>;
	listUserSessions(input: {
		body: { userId: string };
		headers: Headers;
	}): Promise<AdminListSessionsResponse>;
	banUser(input: {
		body: { userId: string; banReason?: string; banExpiresIn?: number };
		headers: Headers;
	}): Promise<void>;
	unbanUser(input: { body: { userId: string }; headers: Headers }): Promise<void>;
	setRole(input: { body: { userId: string; role: string }; headers: Headers }): Promise<void>;
	setUserPassword(input: {
		body: { userId: string; newPassword: string };
		headers: Headers;
	}): Promise<void>;
	revokeUserSession(input: { body: { sessionToken: string }; headers: Headers }): Promise<void>;
	revokeUserSessions(input: { body: { userId: string }; headers: Headers }): Promise<void>;
	impersonateUser(input: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ response?: Response }>;
	stopImpersonating(input: { headers: Headers }): Promise<{ response?: Response }>;
	removeUser(input: { body: { userId: string }; headers: Headers }): Promise<void>;
}

/** Shape of API errors from Better Auth */
interface ApiError {
	statusCode?: number;
	status?: number;
	body?: { message?: string };
}

/** Default return shape when no user is selected */
const emptyUserResponse: {
	selectedId: null;
	user: null;
	sessions: SessionItem[];
} = {
	selectedId: null,
	user: null,
	sessions: []
};

// Extended user type with role (from admin plugin)
interface SessionUser {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	role?: string;
	banned?: boolean;
	banReason?: string | null;
	banExpires?: Date | null;
}

// ================================
// Helpers
// ================================

function getAdmin(): AdminApi {
	return getAdminApi() as AdminApi;
}

function getFormString(form: FormData, key: string): string | undefined {
	const value = form.get(key);
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getUserId(form: FormData): string | undefined {
	return getFormString(form, 'userId');
}

// ================================
// Load
// ================================

export const load: PageServerLoad = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		redirect(302, '/auth/sign-in');
	}

	const user = session.user as SessionUser;

	const env = await getServerEnv();
	const allowedRoles = Array.isArray(env.AUTH_ADMIN_ROLES) ? env.AUTH_ADMIN_ROLES : ['admin'];
	const allowedIds = Array.isArray(env.AUTH_ADMIN_USER_IDS) ? env.AUTH_ADMIN_USER_IDS : [];

	if (!isAdminUser(user, { adminRoles: allowedRoles, adminUserIds: allowedIds })) {
		error(403, 'Admin access required');
	}

	const admin = getAdmin();

	try {
		const { users = [] } = await admin.listUsers({ query: {}, headers: request.headers });
		const selectedId = url.searchParams.get('user');

		// Only fetch user details if a user is selected and exists
		const userExists = selectedId && users.some((u) => u.id === selectedId);
		if (!userExists) {
			return { users, ...emptyUserResponse };
		}

		const [userRes, sessionsRes] = await Promise.all([
			admin.getUser({ query: { id: selectedId }, headers: request.headers }),
			admin.listUserSessions({ body: { userId: selectedId }, headers: request.headers })
		]);

		return {
			users,
			selectedId,
			user: userRes ?? null,
			sessions: sessionsRes?.sessions ?? []
		};
	} catch (e) {
		logger.error('Failed to load users', { error: e });
		error(500, 'Failed to load user data');
	}
};

// ================================
// Actions
// ================================

export const actions: Actions = {
	impersonate: async ({ request }) => {
		const form = await request.formData();
		const userId = getUserId(form);

		if (!userId) return fail(400, { error: 'Missing userId' });

		try {
			await getAdmin().impersonateUser({
				body: { userId },
				headers: request.headers
			});
			return { success: true, impersonating: true };
		} catch (e) {
			logger.error('Failed to impersonate user', { error: e });
			const err = e as ApiError;
			return fail(err.status ?? 500, {
				error: err.body?.message ?? 'Failed to impersonate user'
			});
		}
	},

	stopImpersonating: async ({ request }) => {
		try {
			await getAdmin().stopImpersonating({ headers: request.headers });
			return { success: true, impersonating: false };
		} catch (e) {
			logger.error('Failed to stop impersonating', { error: e });
			const err = e as ApiError;
			return fail(err.status ?? 500, {
				error: err.body?.message ?? 'Failed to stop impersonating'
			});
		}
	}
};
