// src/routes/auth/confirm-delete/+server.ts
import { redirect, error, type RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { logger } from '$lib/auth/shared/logger';

export const GET: RequestHandler = async ({ url, request }) => {
	const token = url.searchParams.get('token');
	if (!token || token.length < 10 || token.length > 512) {
		throw error(400, 'Missing or invalid deletion token');
	}

	try {
		await auth.api.deleteUser({ headers: request.headers, body: { token } });
	} catch (e) {
		logger.warn('[confirm-delete] Account deletion failed', {
			error: e instanceof Error ? e.message : String(e)
		});
		throw error(400, 'Deletion link is invalid or has expired');
	}

	throw redirect(303, '/auth/goodbye');
};
