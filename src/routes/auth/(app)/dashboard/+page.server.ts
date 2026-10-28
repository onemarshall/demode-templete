import { redirect } from '@sveltejs/kit';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import type { PageServerLoad } from './$types';

/**
 * Every authentication flow lands here by default. With tenancy enabled the
 * product dashboard is the real home, so funnel through to it rather than
 * showing the placeholder skeleton in the account shell.
 */
export const load: PageServerLoad = async () => {
	if ((await getServerEnv()).AUTH_ORGANIZATION_PLUGIN) redirect(303, '/app');
	return {};
};
