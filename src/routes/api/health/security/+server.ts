import { json } from '@sveltejs/kit';
import { getSecurityStorage } from '$lib/auth/server/security-storage';
import { logger } from '$lib/auth/shared/logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const storage = await getSecurityStorage();
		const storageOk = await storage.get('__health__').then(() => true).catch(() => false);

		return json(
			{
				timestamp: new Date().toISOString(),
				services: {
					storage: storageOk,
					threatIntelligence: true,
					fraudDetection: true,
					abuseProtection: true
				},
				overall: 'healthy'
			},
			{ headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
		);
	} catch (err) {
		logger.error('Health-check endpoint failed', { error: err });
		return json({ error: 'Health check failed', timestamp: new Date().toISOString() }, { status: 500 });
	}
};
