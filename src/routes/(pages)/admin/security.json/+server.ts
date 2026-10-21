import { json, redirect, error, type RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/auth/server/config';
import { getSecurityDashboard } from '$lib/remote';
import type { SessionUser } from '$lib/auth/server/auth-helpers';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	const user = session.user as SessionUser;
	if (user.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const dashboard = await getSecurityDashboard({});

	return json(
		{
			user: session.user,
			...dashboard
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
