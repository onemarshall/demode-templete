import { error, redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { hasConsultantAccess } from '#lib/modules/diagnostic/server/consultant.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw redirect(302, '/auth/sign-in');
	if (!(await hasConsultantAccess(session.user.id)))
		error(403, 'Consulting access is not available.');
	return {
		user: {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email
		}
	};
};
