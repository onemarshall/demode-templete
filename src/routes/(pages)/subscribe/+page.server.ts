import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * The subscription plan page is retired.
 *
 * Nothing in the catalogue recurs, so there is no plan to subscribe to. The
 * one-time catalogue lives at /auth/pricing.
 */
export const load: PageServerLoad = () => {
	redirect(308, '/auth/pricing');
};
