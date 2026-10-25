// src/routes/auth/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { resolveUserImage } from '#lib/modules/auth/server/session-serializer.js';
import { getServerEnv } from '#lib/platform/config/server.server.js';
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
		tenancyEnabled: (await getServerEnv()).AUTH_ORGANIZATION_PLUGIN,
		user: { ...session.user, image: resolveUserImage(session.user.image) },
		session: session.session
	};
};
