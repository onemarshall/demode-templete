import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { logger, securityLogger } from '$lib/auth/shared/logger';
import { Pool } from 'pg';
import { getServerEnv } from '$lib/auth/shared/env';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the session
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { walletAddress } = body;

		if (!walletAddress) {
			return json({ error: 'Wallet address is required' }, { status: 400 });
		}

		logger.info('Unlinking wallet for user', {
			userId: session.user.id,
			walletAddress: walletAddress.substring(0, 6) + '...'
		});

		// Delete the wallet address from the database
		try {
			const env = await getServerEnv();
			const databaseUrl =
				typeof env.BETTER_DATABASE_URL === 'string' ? env.BETTER_DATABASE_URL : undefined;
			if (!databaseUrl) {
				return json({ error: 'Database not configured' }, { status: 500 });
			}
			const pool = new Pool({
				connectionString: databaseUrl
			});
			const client = await pool.connect();

			// Delete the wallet address
			const result = await client.query(
				'DELETE FROM "walletAddress" WHERE "userId" = $1 AND address = $2',
				[session.user.id, walletAddress]
			);

			client.release();
			await pool.end();

			if (result.rowCount === 0) {
				return json({ error: 'Wallet address not found' }, { status: 404 });
			}

			securityLogger.info('Wallet unlinked successfully', {
				userId: session.user.id,
				walletAddress: walletAddress.substring(0, 6) + '...'
			});

			return json({ success: true });
		} catch (dbError) {
			logger.error('Database error while unlinking wallet', { error: dbError });
			return json({ error: 'Failed to unlink wallet' }, { status: 500 });
		}
	} catch (error) {
		logger.error('Error unlinking wallet', { error });
		securityLogger.error('Failed to unlink wallet', { error });
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
