import { error, redirect, fail, isRedirect, isHttpError } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { APIError } from "better-auth/api";
import { auth } from "#lib/modules/auth/server/config.js";
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { requireBrandAccess, type BrandAction } from "./context.js";
import { resolveRouteBrand } from "./resolution.js";
import { isBrandAccessError } from "./errors.js";

export async function requireTenancySession(event: Pick<RequestEvent, "request" | "url">) {
  if (!(await getServerEnv()).AUTH_ORGANIZATION_PLUGIN) error(404, "Page unavailable");
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (!session?.user)
    redirect(
      303,
      `/auth/sign-in?redirectTo=${encodeURIComponent(event.url.pathname + event.url.search)}`,
    );
  return session;
}
export async function brandRequest(event: RequestEvent, action: BrandAction) {
  const session = await requireTenancySession(event);
  const route = await resolveRouteBrand(
    event.params.organisationSlug!,
    event.params.brandSlug!,
  );
  if (!route) error(404, "Brand unavailable");
  try {
    const ctx = await requireBrandAccess(session.user.id, route.brand.id, action);
    return { session, route, ctx };
  } catch (cause) {
    if (isBrandAccessError(cause)) error(404, "Brand unavailable");
    throw cause;
  }
}
export function formText(form: FormData, key: string, max = 160): string {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new APIError("BAD_REQUEST", { message: `Enter a valid ${key}.` });
  return value.trim();
}
export function actionFailure(cause: unknown) {
  if (isRedirect(cause) || isHttpError(cause)) throw cause;
  if (cause instanceof APIError)
    return fail(400, { message: cause.body?.message ?? "This action is unavailable." });
  if (isBrandAccessError(cause)) return fail(403, { message: "This action is unavailable." });
  console.error("[Montsel action]", cause instanceof Error ? cause.message : "Unknown failure");
  return fail(500, { message: "We could not complete this action. Please try again." });
}
