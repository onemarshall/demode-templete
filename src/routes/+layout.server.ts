import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    session: locals.auth?.session,
    user: locals.auth?.user,
  };
};
