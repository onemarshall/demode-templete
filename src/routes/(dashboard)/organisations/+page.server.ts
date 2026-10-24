import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireTenancySession, formText, actionFailure } from "#lib/server/brand/request.js";
import { listSwitcherContext, getBrandPreference } from "#lib/server/brand/resolution.js";
import { organizationApi } from "#lib/server/brand/organization-api.js";
import { ensurePersonalOrganisation } from "#lib/server/brand/onboarding.js";
import { createBrand } from "#lib/server/brand/brands.js";

export const load: PageServerLoad = async (event) => {
  const { user } = await requireTenancySession(event);
  return {
    organisations: await listSwitcherContext(user.id),
    preference: await getBrandPreference(user.id),
  };
};
export const actions: Actions = {
  personal: async (event) => {
    const { user } = await requireTenancySession(event);
    try {
      await ensurePersonalOrganisation({ userId: user.id, name: user.name, email: user.email });
    } catch (cause) {
      return actionFailure(cause);
    }
    redirect(303, "/organisations");
  },
  create: async (event) => {
    const { user } = await requireTenancySession(event);
    let slug: string;
    try {
      const form = await event.request.formData();
      slug = formText(form, "slug", 48);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        return { message: "Use lowercase letters, numbers and hyphens for the address." };
      const org = await organizationApi().createOrganization({
        headers: event.request.headers,
        body: { name: formText(form, "name", 120), slug },
      });
      if (!org) throw new Error("Organisation creation failed");
      // If brand setup fails the retained organisation is recoverable in settings.
      await createBrand({ userId: user.id, organisationId: org.id, name: "Main", slug: "main" });
    } catch (cause) {
      return actionFailure(cause);
    }
    redirect(303, `/o/${encodeURIComponent(slug)}/main`);
  },
};
