// src/routes/(admin)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { toShellUser } from '#lib/app/shell/shell-user.server.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	return {
		user: toShellUser(session.user),
		session: session.session
	};
};
