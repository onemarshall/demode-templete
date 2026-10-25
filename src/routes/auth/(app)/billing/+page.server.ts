// src/routes/auth/(app)/billing/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { loadActiveSubscription } from '#lib/modules/billing/server/subscription.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, depends }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	depends('auth:session');
	depends('auth:user');

	return {
		subscription: await loadActiveSubscription(session.user.id)
	};
};
