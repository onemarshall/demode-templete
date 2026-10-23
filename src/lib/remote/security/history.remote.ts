import { query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as z from 'zod';
import { auth } from '#lib/auth/server/config.js';
import { isAdminUser } from '#lib/auth/shared/roles.js';
import { listAdminHistory, listOwnHistory } from '#lib/auth/server/history.js';

const cursor = z.object({ before: z.string().max(300).optional() }).optional();

export const getOwnSecurityHistory = query(cursor, async (input) => {
	const { request } = getRequestEvent();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Sign in required');
	return listOwnHistory(session.user.id, input?.before, 50);
});

export const getAdminAuditHistory = query(cursor, async (input) => {
	const { request } = getRequestEvent();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Sign in required');
	if (!isAdminUser(session.user)) throw error(403, 'Admin access required');
	return listAdminHistory(input?.before, 50);
});
