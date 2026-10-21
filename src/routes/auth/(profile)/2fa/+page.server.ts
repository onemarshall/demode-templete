// src/routes/auth/2fa/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { twoFactorVerificationSchema } from '$lib/components/forms/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const cookieName = 'better-auth.two_factor';
	const hasTwoFactorCookie = Boolean(cookies.get(cookieName));
	const reason = url.searchParams.get('reason') ?? (hasTwoFactorCookie ? 'pending' : 'stale');
	const isStale = reason === 'stale';
	const redirectToParam = url.searchParams.get('redirectTo');
	const redirectTo =
		typeof redirectToParam === 'string' &&
		redirectToParam.startsWith('/') &&
		!redirectToParam.startsWith('//') &&
		!redirectToParam.includes('://')
			? redirectToParam
			: '/auth/profile';

	// If we know the flow is stale, clear the HttpOnly cookie server-side.
	if (isStale && hasTwoFactorCookie) {
		cookies.delete(cookieName, { path: '/' });
	}

	// If no cookie and no valid reason, bounce back to sign-in
	if (!hasTwoFactorCookie && reason === 'pending') {
		throw redirect(302, '/auth/sign-in');
	}

	return {
		form: await superValidate(zod4(twoFactorVerificationSchema)),
		redirectTo,
		reason,
		hasTwoFactorCookie: isStale ? false : hasTwoFactorCookie,
		isStale
	};
};
