import type { LayoutServerLoad } from './$types';
import { requireTenancySession } from '#lib/modules/tenancy/server/request.js';
import { listSwitcherContext } from '#lib/modules/tenancy/server/resolution.js';
import { ACTIVE_BRAND_COOKIE } from '#lib/modules/tenancy/shared/types.js';
import { displayBrandId } from '#lib/app/navigation/config.js';
import { toShellUser } from '#lib/app/shell/shell-user.server.js';

export const load: LayoutServerLoad = async (event) => {
	const session = await requireTenancySession(event);
	const organisations = await listSwitcherContext(session.user.id);

	return {
		user: toShellUser(session.user),
		organisations,
		// Display only: the switcher re-validates the chosen brand server-side.
		activeBrandId: displayBrandId(organisations, event.cookies.get(ACTIVE_BRAND_COOKIE) ?? null)
	};
};
