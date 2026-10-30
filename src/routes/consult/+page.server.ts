import { error } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { listConsultantEngagements } from '#lib/modules/diagnostic/server/consultant.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) error(401, 'Sign in required');
	return {
		engagements: await listConsultantEngagements(session.user.id)
	};
};
