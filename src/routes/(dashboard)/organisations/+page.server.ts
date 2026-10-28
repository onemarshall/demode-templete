import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  requireTenancySession,
  formText,
  actionFailure,
} from "#lib/modules/tenancy/server/request.js";
import { listSwitcherContext, getBrandPreference } from "#lib/modules/tenancy/server/resolution.js";
import { organizationApi } from "#lib/modules/tenancy/server/organization-api.js";
import {
  uniqueOrganisationSlug,
  findOrganisationBySlug,
} from "#lib/modules/tenancy/server/better-auth-adapter.js";
import { ensurePersonalOrganisation } from "#lib/modules/tenancy/server/onboarding.js";
import { createBrand } from "#lib/modules/tenancy/server/brands.js";

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
  // Creating an organisation also creates its first brand. The two names are
  // separate inputs: an organisation owns brands, it is not itself a brand.
  create: async (event) => {
    const { user } = await requireTenancySession(event);
    let path: string;
    try {
      const form = await event.request.formData();
      const name = formText(form, "name", 120);
      const brandName = formText(form, "brandName", 120);
      const slug = await uniqueOrganisationSlug(name);
      if (!slug)
        return { message: "That organisation name is already taken. Try a different name." };
      const org = await organizationApi().createOrganization({
        headers: event.request.headers,
        body: { name, slug },
      });
      if (!org) throw new Error("Organisation creation failed");
      // If brand setup fails the retained organisation is recoverable in settings.
      const brand = await createBrand({
        userId: user.id,
        organisationId: org.id,
        name: brandName,
      });
      path = `/o/${encodeURIComponent(slug)}/${encodeURIComponent(brand.slug)}`;
    } catch (cause) {
      return actionFailure(cause);
    }
    redirect(303, path);
  },
  // Adds a brand to an existing organisation. createBrand enforces the
  // admin/owner membership and the per-organisation limit server-side.
  createBrand: async (event) => {
    const { user } = await requireTenancySession(event);
    try {
      const form = await event.request.formData();
      const organisation = await findOrganisationBySlug(formText(form, "organisationSlug"));
      if (!organisation) error(404, "Organisation unavailable");
      const brand = await createBrand({
        userId: user.id,
        organisationId: organisation.id,
        name: formText(form, "name", 120),
      });
      return { message: `${brand.name} is ready.` };
    } catch (cause) {
      return actionFailure(cause);
    }
  },
};
