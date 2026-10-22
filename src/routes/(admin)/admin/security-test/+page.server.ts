import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '#lib/auth/server/config.js';
import { isAdminUser, type SessionUser } from '#lib/auth/server/auth-helpers.js';
import { isDevelopment } from '#lib/auth/shared/env/index.js';

export const load: PageServerLoad = async ({ request }) => {
	const isTestRuntime = process.env.NODE_ENV === 'test';
	if (!isDevelopment() && !isTestRuntime) {
		throw error(404, 'Not found');
	}

	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	const user = session.user as SessionUser;
	if (!isAdminUser(user)) {
		throw error(403, 'Admin access required');
	}

	return {};
};
