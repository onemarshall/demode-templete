// src/routes/auth/(app)/security/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { loadAuthUserContext } from '#lib/auth/server/user-context.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, depends }) => {
	try {
		const context = await loadAuthUserContext(request.headers);
		if (!context) {
			throw redirect(302, '/auth/sign-in');
		}

		depends('auth:session');
		depends('auth:user');

		return {
			user: context.user,
			session: context.session
		};
	} catch (error) {
		// Handle SvelteKit redirects properly
		if (error && typeof error === 'object' && 'status' in error) {
			throw error;
		}
		throw redirect(302, '/auth/sign-in');
	}
};
