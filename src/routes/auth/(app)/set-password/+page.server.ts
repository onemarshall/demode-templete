import { redirect } from '@sveltejs/kit';
import { loadAuthUserContext } from '#lib/modules/auth/server/user-context.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const context = await loadAuthUserContext(request.headers);
	if (!context) throw redirect(302, '/auth/sign-in');
	if (context.user.hasPassword) throw redirect(302, '/auth/change-password');
	return { email: context.user.email };
};
