import type { LayoutServerLoad } from './$types';
import { resolveActiveBrand, routeOf } from '#lib/modules/products/server/brand-context.js';
import { toShellUser } from '#lib/app/shell/shell-user.server.js';

export const load: LayoutServerLoad = async (event) => {
	const { session, ctx, organisations } = await resolveActiveBrand(event);
	const route = routeOf(ctx, organisations);
	return {
		user: toShellUser(session.user),
		organisations,
		organisation: route.organisation,
		brand: route.brand,
		brandRole: ctx.brandRole
	};
};
