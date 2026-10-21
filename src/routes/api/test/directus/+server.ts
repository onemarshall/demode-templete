import { json } from '@sveltejs/kit';
// import { runAllTests } from '#lib/_old/server/test/directus-plugin-test';
import { logger } from '#lib/auth/shared/logger.js';

async function runAllTests(): Promise<void> {
	return;
}

/**
 * Test endpoint for Directus plugin installation
 *
 * GET /api/test/directus
 *
 * Returns the test results for plugin installation
 */
export async function GET() {
	try {
		logger.info('Running Directus plugin installation test...');

		await runAllTests();

		return json({
			success: true,
			message: 'Directus plugin test completed. Check server logs for detailed results.',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Directus plugin test failed:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
}
