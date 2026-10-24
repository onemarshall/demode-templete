import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth/index.js';
import { logger } from '#lib/auth/shared/logger.js';

export const load = async ({ url, request }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		logger.warn('[Verify Email] Missing token');
		throw redirect(302, '/auth/sign-in?error=missing_token');
	}

	// Verify email; on success, redirect to profile. Only catch real errors.
	try {
		await auth.api.verifyEmail({
			headers: request.headers,
			query: { token }
		});
	} catch (err) {
		logger.error('[Verify Email] Verification failed', err);
		throw redirect(302, '/auth/sign-in?error=verification_failed');
	}

	logger.info('[Verify Email] Email verified successfully');
	throw redirect(302, '/auth/sign-in?verified=true');
};
