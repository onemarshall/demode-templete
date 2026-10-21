import { form, query, getRequestEvent } from '$app/server';
import { getAdminApi } from '#lib/auth/server/admin-helpers.js';
import { z } from 'zod';
import {
	banUserSchema,
	userIdSchema,
	setRoleSchema,
	setPasswordSchema,
	revokeSessionSchema
} from '#lib/auth/shared/types/admin.js';
import type { UserListItem, UserDetail, SessionItem } from '#lib/components/users/types.js';

interface AdminApi {
	listUsers(input: {
		query?: { limit?: number; page?: number; cursor?: string };
		headers: Headers;
	}): Promise<{ users: UserListItem[]; total?: number }>;
	getUser(input: { query: { id: string }; headers: Headers }): Promise<{ user?: UserDetail }>;
	listUserSessions(input: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ sessions: SessionItem[] }>;
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
	removeUser(input: { body: { userId: string }; headers: Headers }): Promise<void>;
}

function getAdmin() {
	return getAdminApi() as AdminApi;
}

export const listUsers = query(async () => {
	const { request } = getRequestEvent();
	return getAdmin().listUsers({ headers: request.headers });
});

export const getUser = query(z.string(), async (id) => {
	const { request } = getRequestEvent();
	return getAdmin().getUser({ query: { id }, headers: request.headers });
});

export const listUserSessions = query(userIdSchema, async ({ userId }) => {
	const { request } = getRequestEvent();
	return getAdmin().listUserSessions({ body: { userId }, headers: request.headers });
});

export const banUser = form(banUserSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().banUser({ body: data, headers: request.headers });
	// Note: listUsers.refresh() is not available on RemoteQueryFunction
	// The client side will need to handle refetching
});

export const unbanUser = form(userIdSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().unbanUser({ body: data, headers: request.headers });
	// Note: listUsers.refresh() is not available on RemoteQueryFunction
	// The client side will need to handle refetching
});

export const setRole = form(setRoleSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().setRole({ body: data, headers: request.headers });
	// Note: listUsers.refresh() is not available on RemoteQueryFunction
	// The client side will need to handle refetching
});

export const setUserPassword = form(setPasswordSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().setUserPassword({ body: data, headers: request.headers });
});

export const revokeSession = form(revokeSessionSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().revokeUserSession({ body: data, headers: request.headers });
});

export const revokeAllSessions = form(userIdSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().revokeUserSessions({ body: data, headers: request.headers });
});

export const removeUser = form(userIdSchema, async (data) => {
	const { request } = getRequestEvent();
	await getAdmin().removeUser({ body: data, headers: request.headers });
	// Note: listUsers.refresh() is not available on RemoteQueryFunction
	// The client side will need to handle refetching
});
