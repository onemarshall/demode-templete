// src/routes/auth/account-recovery/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	// If user is already logged in, redirect to profile
	const session = await auth.api.getSession({ headers: request.headers });

	if (session?.user) {
		throw redirect(302, '/auth/dashboard');
	}

	// No server data needed - form is client-side using authClient
	return {};
};
