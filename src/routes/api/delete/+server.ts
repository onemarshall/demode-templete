// src/routes/auth/delete/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { logger } from '#lib/auth/shared/logger.js';
import type { User as BetterAuthUser } from 'better-auth';

// Type guard to check if the response is a success
type DeleteSuccess = {
	success: true;
	user: BetterAuthUser;
};

const isDeleteSuccess = (res: unknown): res is DeleteSuccess => {
	return typeof res === 'object' && res !== null && 'success' in res && res.success === true;
};

/**
 * Handles account deletion requests
 * Uses Better Auth's built-in password verification and email verification
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { password, token, callbackURL } = await request.json();

		// Call Better Auth's deleteUser API
		const result = await auth.api.deleteUser({
			headers: request.headers,
			body: {
				password,
				token,
				callbackURL: callbackURL || '/auth/goodbye'
			}
		});

		// If deletion was successful
		if (isDeleteSuccess(result)) {
			logger.info('User deleted', {
				userId: result.user.id,
				ip: request.headers.get('x-forwarded-for')
			});

			// Return success response with redirect URL
			return json({ success: true, redirect: callbackURL || '/auth/goodbye' }, { status: 200 });
		}

		// If we get here, deletion failed
		const errorMessage = (result as { message?: string }).message || 'Failed to delete account';
		logger.warn('Account deletion failed', { reason: errorMessage });
		return json({ success: false, error: errorMessage }, { status: 400 });
	} catch (error) {
		// Log unexpected errors
		const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
		logger.error('Error in delete endpoint', { error: errorMessage });
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
