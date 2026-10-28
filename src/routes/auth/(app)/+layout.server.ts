// src/routes/auth/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { logger } from '#lib/platform/logger.js';
import { listSwitcherContext } from '#lib/modules/tenancy/server/resolution.js';
import { ACTIVE_BRAND_COOKIE } from '#lib/modules/tenancy/shared/types.js';
import { displayBrandId } from '#lib/app/navigation/config.js';
import { toShellUser } from '#lib/app/shell/shell-user.server.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, url, cookies }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		const redirectTo = url.pathname + url.search;
		throw redirect(302, `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const tenancyEnabled = (await getServerEnv()).AUTH_ORGANIZATION_PLUGIN;
	// The switcher is chrome, not authority: a tenancy read failure must not
	// take down account pages, which do not depend on it to function.
	const organisations = tenancyEnabled
		? await listSwitcherContext(session.user.id).catch((error) => {
				logger.warn('[App] Brand switcher unavailable on account pages', {
					error: error instanceof Error ? error.message : String(error)
				});
				return [];
			})
		: [];

	return {
		tenancyEnabled,
		user: toShellUser(session.user),
		session: session.session,
		organisations,
		// Display only: the switcher re-validates the chosen brand server-side.
		activeBrandId: displayBrandId(organisations, cookies.get(ACTIVE_BRAND_COOKIE) ?? null)
	};
};
