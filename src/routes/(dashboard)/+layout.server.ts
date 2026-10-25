import type { LayoutServerLoad } from "./$types";
import { requireTenancySession } from "#lib/modules/tenancy/server/request.js";
import { listSwitcherContext } from "#lib/modules/tenancy/server/resolution.js";

export const load: LayoutServerLoad = async (event) => {
  const session = await requireTenancySession(event);

  return { user: session.user, organisations: await listSwitcherContext(session.user.id) };
};
