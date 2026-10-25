/**
 * Brand creation and closure (spec §6.1, §7.2, §11.1).
 *
 * Creators receive an explicit initial assignment — never an inferred
 * perpetual bypass. Limits are enforced server-side (D4).
 */

import { randomUUID } from "crypto";
import { APIError } from "better-auth/api";
import { withTransaction } from "#lib/platform/database/db.js";
import { writeAuditEvent } from "./audit.js";
import { findMembership, membershipIsAdminOrOwner } from "./better-auth-adapter.js";
import { BRANDS_PER_ORGANISATION } from "./limits.js";

export interface CreatedBrand {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
}

// Reserved under /o/:organisationSlug/ — a brand with this slug would be
// shadowed by the static settings route.
const RESERVED_SLUGS = new Set(["settings"]);

function normaliseSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!slug) throw new APIError("BAD_REQUEST", { message: "Brand slug is required" });
  if (RESERVED_SLUGS.has(slug))
    throw new APIError("BAD_REQUEST", { message: "That brand address is reserved" });
  return slug;
}

export async function createBrand(params: {
  userId: string;
  organisationId: string;
  name: string;
  slug: string;
}): Promise<CreatedBrand> {
  const slug = normaliseSlug(params.slug);
  const id = randomUUID().replace(/-/g, "");

  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [params.organisationId]);
    const membership = await findMembership(params.userId, params.organisationId, client);
    if (!membership || !membershipIsAdminOrOwner(membership))
      throw new APIError("FORBIDDEN", { message: "Not allowed to create brands here" });
    const { rows: countRows } = await client.query<{ count: string }>(
      `SELECT count(*) AS count FROM "brand" WHERE "organisation_id" = $1 AND "status" = 'active'`,
      [params.organisationId],
    );
    if (Number(countRows[0]?.count ?? 0) >= BRANDS_PER_ORGANISATION)
      throw new APIError("FORBIDDEN", { message: "Brand limit reached" });
    if (!params.name.trim() || params.name.length > 120)
      throw new APIError("BAD_REQUEST", {
        message: "Enter a brand name of 1 to 120 characters.",
      });
    const { rows: existing } = await client.query<{ id: string }>(
      `SELECT "id" FROM "brand" WHERE "organisation_id" = $1 AND "slug" = $2`,
      [params.organisationId, slug],
    );
    if (existing.length > 0) {
      throw new APIError("BAD_REQUEST", { message: "Brand slug already exists" });
    }
    await client.query(
      `INSERT INTO "brand" ("id", "organisation_id", "name", "slug", "created_by", "status")
			 VALUES ($1, $2, $3, $4, $5, 'active')`,
      [id, params.organisationId, params.name, slug, params.userId],
    );
    // Explicit initial assignment (§7.2) — not an inferred bypass.
    await client.query(
      `INSERT INTO "brand_member"
				("id", "brand_id", "user_id", "role", "status", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, 'brand_admin', 'active', 'managed', $3)`,
      [randomUUID().replace(/-/g, ""), id, params.userId],
    );
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        brandId: id,
        actorUserId: params.userId,
        action: "brand.created",
        resourceType: "brand",
        resourceId: id,
        metadata: { name: params.name, slug },
      },
      client,
    );
    return { id, organisationId: params.organisationId, name: params.name, slug };
  });
}

/**
 * Brand closure initially archives (§11.1): resources become restricted,
 * nothing is physically deleted, assignments stop granting access because
 * requireBrandAccess checks brand status.
 */
export async function archiveBrand(params: {
  userId: string;
  organisationId: string;
  brandId: string;
}): Promise<void> {
  const membership = await findMembership(params.userId, params.organisationId);
  if (!membership || !membershipIsAdminOrOwner(membership)) {
    throw new APIError("FORBIDDEN", { message: "Not allowed to archive this brand" });
  }
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [params.organisationId]);
    const current = await findMembership(params.userId, params.organisationId, client);
    if (!current || !membershipIsAdminOrOwner(current))
      throw new APIError("FORBIDDEN", { message: "Not allowed to archive this brand" });
    const { rows } = await client.query<{ organisationId: string }>(
      `SELECT "organisation_id" AS "organisationId" FROM "brand" WHERE "id" = $1`,
      [params.brandId],
    );
    if (rows[0]?.organisationId !== params.organisationId) {
      throw new APIError("FORBIDDEN", {
        message: "Brand does not belong to this organisation",
      });
    }
    await client.query(
      `UPDATE "brand" SET "status" = 'archived', "updated_at" = now() WHERE "id" = $1`,
      [params.brandId],
    );
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        brandId: params.brandId,
        actorUserId: params.userId,
        action: "brand.archived",
        resourceType: "brand",
        resourceId: params.brandId,
      },
      client,
    );
  });
}
