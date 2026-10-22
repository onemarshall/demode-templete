// src/routes/(protected)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { resolveUserImage } from '#lib/auth/server/session-serializer.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, url }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		const redirectTo = url.pathname + url.search;
		throw redirect(302, `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return {
		user: { ...session.user, image: resolveUserImage(session.user.image) },
		session: session.session
	};
};
