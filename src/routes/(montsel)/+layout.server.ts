import type { LayoutServerLoad } from './$types';
import { requireTenancySession } from '#lib/server/workspace/request.js';
import { listSwitcherContext } from '#lib/server/workspace/resolution.js';
export const load: LayoutServerLoad = async (event) => {
	const session = await requireTenancySession(event);
	return { user: session.user, organisations: await listSwitcherContext(session.user.id) };
};
