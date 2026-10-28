import type { PageServerLoad } from './$types';
import { readReturnTo } from '#lib/modules/auth/shared/return-to.js';

/**
 * A `?redirectTo=` on the link wins. Otherwise fall back to the intent cookie,
 * which survives an email verification detour that would strip a query string.
 */
export const load: PageServerLoad = async ({ cookies }) => ({
	defaultRedirect: readReturnTo(cookies)
});
