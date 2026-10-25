// src/routes/(admin)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { resolveUserImage } from '#lib/modules/auth/server/session-serializer.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	return {
		user: { ...session.user, image: resolveUserImage(session.user.image) },
		session: session.session
	};
};
