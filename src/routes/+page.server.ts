import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.auth?.user;

	return {
		user: user
			? {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
					emailVerified: user.emailVerified
				}
			: null
	};
};
