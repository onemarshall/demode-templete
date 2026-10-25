import { redirect } from '@sveltejs/kit';
import { loadAuthUserContext } from '#lib/modules/auth/server/user-context.js';
import { loadDeletionEligibility } from '#lib/modules/auth/server/deletion-policy.js';
import { getUserRoles } from '#lib/modules/auth/shared/roles.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, depends }) => {
	const context = await loadAuthUserContext(request.headers);
	if (!context) redirect(302, '/auth/sign-in');
	depends('auth:user');
	depends('auth:session');
	const { user } = context;
	return {
		user,
		hasPassword: user.hasPassword,
		roles: getUserRoles({ role: user.role as string | string[] | null | undefined }),
		deletionEligibility: await loadDeletionEligibility({
			id: user.id,
			role: user.role as string | string[] | null | undefined
		})
	};
};
