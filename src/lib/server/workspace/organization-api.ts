import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { auth } from "#lib/auth.js";

// Core's feature-selected plugin registry erases endpoint inference. Recover
// only the installed organisation plugin API, after checking runtime presence.
const inferOrganisationAuth = () => betterAuth({ plugins: [organization()] });
type OrganisationAuth = ReturnType<typeof inferOrganisationAuth>;
export function organizationApi(): OrganisationAuth["api"] {
  if (!auth.options.plugins?.some((plugin) => plugin.id === "organization")) {
    throw new APIError("SERVICE_UNAVAILABLE", { message: "Organisations are not enabled." });
  }
  return auth.api as unknown as OrganisationAuth["api"];
}
