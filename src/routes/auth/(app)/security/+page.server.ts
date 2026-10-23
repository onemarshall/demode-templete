import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { loadAuthUserContext } from '#lib/auth/server/user-context.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, depends }) => {
	const context = await loadAuthUserContext(request.headers);
	if (!context) throw redirect(302, '/auth/sign-in');
	depends('auth:session');
	depends('auth:user');
	const accounts = await auth.api.listUserAccounts({ headers: request.headers });
	return {
		user: context.user,
		session: context.session,
		accounts: accounts.map(({ id, providerId }) => ({ id, providerId }))
	};
};
