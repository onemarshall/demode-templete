/**
 * Onboarding (spec §7.2): a self-registering user who needs their own
 * brand creates a personal organisation through an idempotent operation.
 *
 * IDs and slugs use the same deterministic convention as the backfill
 * migration (0002), so a user who was backfilled and later hits onboarding
 * converges on the same rows — the operation is a no-op for them.
 */

import { createHash } from "crypto";
import { APIError } from "better-auth/api";
import { getDB, withTransaction } from "#lib/platform/database/db.js";
import { writeAuditEvent } from "./audit.js";

export interface PersonalOrganisation {
  organisationId: string;
  brandId: string;
}

function deterministicId(kind: string, userId: string): string {
  return createHash("md5").update(`montsel-${kind}:${userId}`).digest("hex");
}

export async function findPersonalOrganisation(
  userId: string,
): Promise<PersonalOrganisation | null> {
  const db = await getDB();
  const { rows } = await db.query<{ organisationId: string; brandId: string }>(
    `SELECT p."organisation_id" AS "organisationId", w."id" AS "brandId"
		 FROM "personal_organisation_owner" p
		 JOIN "member" m ON m."organizationId" = p."organisation_id" AND m."userId" = p."owner_user_id"
		 JOIN "brand" w ON w."organisation_id" = p."organisation_id" AND w."slug" = 'main' AND w."status" = 'active'
		 JOIN "brand_member" wm ON wm."brand_id" = w."id" AND wm."user_id" = p."owner_user_id"
		 WHERE p."owner_user_id" = $1 AND wm."status" = 'active'
		 AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function ensurePersonalOrganisation(params: {
  userId: string;
  name: string | null;
  email: string;
}): Promise<PersonalOrganisation> {
  const existing = await findPersonalOrganisation(params.userId);
  if (existing) return existing;

  const organisationId = deterministicId("org", params.userId);
  const brandId = deterministicId("brand", params.userId);
  const memberId = deterministicId("member", params.userId);
  const assignmentId = deterministicId("ws-member", params.userId);
  const slug = `personal-${deterministicId("org-slug", params.userId)}`;
  const displayName = `${(params.name && params.name.trim()) || params.email.split("@")[0]}'s Organisation`;

  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [organisationId]);
    // Never resurrect a former membership or assignment on repeated onboarding.
    const retained = await client.query('SELECT 1 FROM "organization" WHERE "id" = $1', [
      organisationId,
    ]);
    if (retained.rows.length) {
      const current = await client.query(
        `SELECT 1 FROM "brand_member" wm
				JOIN "member" m ON m."userId" = wm."user_id" AND m."organizationId" = $2
				JOIN "brand" w ON w."id" = wm."brand_id" AND w."organisation_id" = $2
				WHERE wm."brand_id" = $1 AND wm."user_id" = $3 AND wm."status" = 'active'
				AND w."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())`,
        [brandId, organisationId, params.userId],
      );
      if (current.rows.length) return { organisationId, brandId };
      throw new APIError("CONFLICT", {
        message: "Your personal organisation already exists. Ask its owner to restore access.",
      });
    }
    await client.query(
      `INSERT INTO "organization" ("id", "name", "slug", "metadata", "createdAt")
			 VALUES ($1, $2, $3, $4, now())
			 ON CONFLICT ("id") DO NOTHING`,
      [organisationId, displayName, slug, '{"montsel":{"type":"personal"}}'],
    );
    await client.query(
      `INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt")
			 VALUES ($1, $2, $3, 'owner', now())
			 ON CONFLICT DO NOTHING`,
      [memberId, organisationId, params.userId],
    );
    await client.query(
      `INSERT INTO "brand" ("id", "organisation_id", "name", "slug", "created_by", "status")
			 VALUES ($1, $2, 'Main', 'main', $3, 'active')
			 ON CONFLICT ("id") DO NOTHING`,
      [brandId, organisationId, params.userId],
    );
    await client.query(
      `INSERT INTO "brand_member"
				("id", "brand_id", "user_id", "role", "status", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, 'brand_admin', 'active', 'backfill', $3)
			 ON CONFLICT ("brand_id", "user_id") DO NOTHING`,
      [assignmentId, brandId, params.userId],
    );
    await client.query(
      'INSERT INTO "personal_organisation_owner" ("organisation_id", "owner_user_id") VALUES ($1, $2)',
      [organisationId, params.userId],
    );
    await writeAuditEvent(
      {
        organisationId,
        actorUserId: params.userId,
        action: "organisation.personal_created",
        resourceType: "organisation",
        resourceId: organisationId,
        metadata: { onboarding: true },
      },
      client,
    );
    return { organisationId, brandId };
  });
}
