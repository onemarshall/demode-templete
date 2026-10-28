/**
 * Route resolution and switcher queries (spec §8).
 *
 * These are pre-context, membership-scoped reads: they return only routing
 * and display metadata for resources the user is already authorised to see
 * (their own memberships and active assignments). Brand *content* access
 * always goes through requireBrandAccess + the context-required
 * repositories (D2). Slugs are routing identifiers, not permission evidence.
 */

import type { RouteResolution, SwitcherOrganisation, BrandPreference } from "../shared/types.js";
export type {
  RouteResolution,
  SwitcherBrand,
  SwitcherOrganisation,
  BrandPreference,
} from "../shared/types.js";

import { getDB } from "#lib/platform/database/db.js";
import { listUserOrganisations } from "./better-auth-adapter.js";

/**
 * Resolve /o/:organisationSlug/:brandSlug server-side to stable IDs.
 * Verifies the brand belongs to the organisation in the route (§8).
 * Returns null when either slug is unknown — the caller then denies without
 * disclosing which part failed (§6.3).
 */
export async function resolveRouteBrand(
  organisationSlug: string,
  brandSlug: string,
): Promise<RouteResolution | null> {
  const db = await getDB();
  const { rows } = await db.query<{
    organisationId: string;
    organisationName: string;
    organisationSlug: string;
    brandId: string;
    brandName: string;
    brandSlug: string;
  }>(
    `SELECT o."id" AS "organisationId", o."name" AS "organisationName", o."slug" AS "organisationSlug",
		        w."id" AS "brandId", w."name" AS "brandName", w."slug" AS "brandSlug"
		 FROM "brand" w
		 JOIN "organization" o ON o."id" = w."organisation_id"
		 WHERE o."slug" = $1 AND w."slug" = $2 AND w."organisation_id" = o."id"
		   AND w."status" = 'active'
		 LIMIT 1`,
    [organisationSlug, brandSlug],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    organisation: {
      id: row.organisationId,
      name: row.organisationName,
      slug: row.organisationSlug,
    },
    brand: { id: row.brandId, name: row.brandName, slug: row.brandSlug },
  };
}

/**
 * Everything the global header switcher needs: the user's organisations
 * (live membership read) and, per organisation, the brands holding an
 * active, unexpired assignment. Organisations with no assigned brands
 * still appear (ordinary members with no brand assignment, §13.2).
 */
export async function listSwitcherContext(userId: string): Promise<SwitcherOrganisation[]> {
  const organisations = await listUserOrganisations(userId);
  if (organisations.length === 0) return [];

  const db = await getDB();
  const { rows } = await db.query<{
    organisationId: string;
    brandId: string;
    brandName: string;
    brandSlug: string;
    role: string;
  }>(
    `SELECT w."organisation_id" AS "organisationId",
		        w."id" AS "brandId", w."name" AS "brandName", w."slug" AS "brandSlug",
		        wm."role"
		 FROM "brand_member" wm
		 JOIN "brand" w ON w."id" = wm."brand_id"
		 WHERE wm."user_id" = $1
		   AND wm."status" = 'active'
		   AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		   AND w."status" = 'active'
		   AND w."organisation_id" = ANY($2)
		 ORDER BY w."created_at" ASC`,
    [userId, organisations.map((o) => o.id)],
  );

  return organisations.map((o) => ({
    organisationId: o.id,
    organisationName: o.name,
    organisationSlug: o.slug,
    role: o.role,
    brands: rows
      .filter((r) => r.organisationId === o.id)
      .map((r) => ({
        brandId: r.brandId,
        brandName: r.brandName,
        brandSlug: r.brandSlug,
        role: r.role,
      })),
  }));
}

/** Landing-page preference only (§5) — never an authority for access. */
export async function getBrandPreference(userId: string): Promise<BrandPreference> {
  const db = await getDB();
  const { rows } = await db.query<BrandPreference>(
    `SELECT "last_organisation_id" AS "lastOrganisationId",
		        "last_brand_id" AS "lastBrandId"
		 FROM "user_brand_preference" WHERE "user_id" = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? { lastOrganisationId: null, lastBrandId: null };
}

export async function setBrandPreference(
  userId: string,
  organisationId: string,
  brandId: string,
): Promise<void> {
  const db = await getDB();
  await db.query(
    `INSERT INTO "user_brand_preference" ("user_id", "last_organisation_id", "last_brand_id")
		 VALUES ($1, $2, $3)
		 ON CONFLICT ("user_id") DO UPDATE SET
			"last_organisation_id" = EXCLUDED."last_organisation_id",
			"last_brand_id" = EXCLUDED."last_brand_id",
			"updated_at" = now()`,
    [userId, organisationId, brandId],
  );
}
