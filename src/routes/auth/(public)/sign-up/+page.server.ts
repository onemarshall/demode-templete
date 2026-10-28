import type { PageServerLoad } from './$types';
import { readReturnTo } from '#lib/modules/auth/shared/return-to.js';

/**
 * Signing up does not create a session (the email must be verified first), so
 * this default is what the *later* sign-in uses. Keeping it here means a new
 * user who was mid-flow still lands back where they were.
 */
export const load: PageServerLoad = async ({ cookies }) => ({
	defaultRedirect: readReturnTo(cookies)
});
