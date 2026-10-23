import { json, error } from "@sveltejs/kit";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "#lib/auth/shared/env/index.js";
import { processDueProvisioningRetries } from "#lib/server/workspace/provisioning.js";
import type { RequestHandler } from "./$types";

/** Bounded system recovery; the caller cannot choose a user or workspace. */
export const POST: RequestHandler = async ({ request }) => {
  const env = await getServerEnv();
  if (!env.AUTH_ORGANIZATION_PLUGIN || !env.MONTSEL_RECOVERY_TOKEN) error(404, "Unavailable");
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.MONTSEL_RECOVERY_TOKEN}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    error(404, "Unavailable");
  return json(await processDueProvisioningRetries(25), {
    headers: { "cache-control": "no-store" },
  });
};
