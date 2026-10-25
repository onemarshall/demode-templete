/**
 * Context-required brand repositories (decision D2, §6.3).
 *
 * Every brand-scoped exported function takes `ctx: OperationContext` as
 * its first parameter; the branded context is constructible only by
 * `requireBrandAccess`. No brand-scoped pool.query may appear
 * outside this layer — a convention test enforces that (D2).
 */

import { randomUUID } from "crypto";
import { getDB, withTransaction } from "#lib/platform/database/db.js";
import { BrandAccessError } from "./errors.js";
import { writeAuditEvent } from "./audit.js";
import { findMembership, membershipHasRole } from "./better-auth-adapter.js";
import type { OperationContext, BrandAction } from "./context.js";
import { assertOperationAction } from "./context.js";
import { MEMBERS_PER_BRAND } from "./limits.js";

export interface BrandMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | null;
  grantSource: string;
  grantedBy: string | null;
  createdAt: Date;
}

/**
 * Re-check an action against the context's role. Contexts are minted for one
 * action; services performing several actions re-validate per action.
 */
export function requireAction(ctx: OperationContext, action: BrandAction): void {
  assertOperationAction(ctx, action);
}

/** Serializes assignment creation across an organisation and revalidates the actor in-transaction. */
async function lockAndValidateBrandAdmin(
  ctx: OperationContext,
  client: import("pg").PoolClient,
): Promise<void> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [ctx.organisationId]);
  const membership = await findMembership(ctx.userId, ctx.organisationId, client);
  if (!membership) throw new BrandAccessError();
  const { rows } = await client.query<{ organisationId: string; role: string }>(
    `SELECT w."organisation_id" AS "organisationId", wm."role"
		 FROM "brand" w JOIN "brand_member" wm ON wm."brand_id" = w."id"
		 WHERE w."id" = $1 AND w."status" = 'active' AND wm."user_id" = $2
		   AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		 LIMIT 1 FOR UPDATE OF wm`,
    [ctx.brandId, ctx.userId],
  );
  if (rows[0]?.organisationId !== ctx.organisationId || rows[0]?.role !== "brand_admin") {
    throw new BrandAccessError();
  }
}

/** Rejects only when this grant would add an active seat to a full brand. */
async function assertSeatAvailable(
  client: import("pg").PoolClient,
  brandId: string,
  targetUserId: string,
): Promise<void> {
  const { rows } = await client.query<{ count: string; targetActive: boolean }>(
    `SELECT count(*) FILTER (WHERE wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())) AS count,
		        bool_or(wm."user_id" = $2 AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())) AS "targetActive"
		 FROM "brand_member" wm WHERE wm."brand_id" = $1`,
    [brandId, targetUserId],
  );
  if (!rows[0]?.targetActive && Number(rows[0]?.count ?? 0) >= MEMBERS_PER_BRAND) {
    throw new BrandAccessError("Brand member limit reached");
  }
}

export async function updateBrandMetadata(
  ctx: OperationContext,
  updates: { name?: string },
): Promise<void> {
  requireAction(ctx, "brand:update");
  await withTransaction(async (client) => {
    await lockAndValidateBrandAdmin(ctx, client);
    if (updates.name !== undefined) {
      await client.query(
        `UPDATE "brand" SET "name" = $1, "updated_at" = now() WHERE "id" = $2`,
        [updates.name, ctx.brandId],
      );
    }
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        brandId: ctx.brandId,
        actorUserId: ctx.userId,
        action: "brand.metadata_updated",
        resourceType: "brand",
        resourceId: ctx.brandId,
        metadata: { name: updates.name ?? null },
      },
      client,
    );
  });
}

export async function listBrandMembers(
  ctx: OperationContext,
  options: { includeInactive?: boolean } = {},
): Promise<BrandMemberView[]> {
  requireAction(ctx, "brand_members:manage");
  const db = await getDB();
  const statusClause = options.includeInactive
    ? ""
    : ` AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())`;
  const { rows } = await db.query<BrandMemberView>(
    `SELECT wm."id", wm."user_id" AS "userId", u."name", u."email", wm."role", wm."status", wm."expires_at" AS "expiresAt",
		        wm."grant_source" AS "grantSource", wm."granted_by" AS "grantedBy", wm."created_at" AS "createdAt"
		 FROM "brand_member" wm
		 JOIN "user" u ON u."id" = wm."user_id"
		 JOIN "member" m ON m."userId" = wm."user_id" AND m."organizationId" = $2
		 WHERE wm."brand_id" = $1${statusClause}
		 ORDER BY wm."created_at" ASC`,
    [ctx.brandId, ctx.organisationId],
  );
  return rows;
}

export interface GrantAssignmentInput {
  targetUserId: string;
  role: "brand_admin" | "editor" | "contributor" | "viewer";
  expiresAt?: Date | null;
}

/**
 * Managed grant (Appendix D.5): a brand admin grants a brand role to
 * an active organisation member. Audited with actor, target, previous and new
 * role.
 */
export async function grantBrandAssignment(
  ctx: OperationContext,
  input: GrantAssignmentInput,
): Promise<void> {
  requireAction(ctx, "brand_members:manage");

  await withTransaction(async (client) => {
    await lockAndValidateBrandAdmin(ctx, client);
    const membership = await findMembership(input.targetUserId, ctx.organisationId, client);
    if (!membership) throw new BrandAccessError(); // target must be an active organisation member
    await assertSeatAvailable(client, ctx.brandId, input.targetUserId);
    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "brand_member"
			 WHERE "brand_id" = $1 AND "user_id" = $2`,
      [ctx.brandId, input.targetUserId],
    );
    await client.query(
      `INSERT INTO "brand_member"
				("id", "brand_id", "user_id", "role", "status", "expires_at", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, $4, 'active', $5, 'managed', $6)
			 ON CONFLICT ("brand_id", "user_id") DO UPDATE SET
				"role" = EXCLUDED."role",
				"status" = 'active',
				"expires_at" = EXCLUDED."expires_at",
				"grant_source" = 'managed',
				"granted_by" = EXCLUDED."granted_by",
				"provisioning_id" = NULL,
				"updated_at" = now()`,
      [
        randomUUID().replace(/-/g, ""),
        ctx.brandId,
        input.targetUserId,
        input.role,
        input.expiresAt ?? null,
        ctx.userId,
      ],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        brandId: ctx.brandId,
        actorUserId: ctx.userId,
        action: "brand_member.granted",
        resourceType: "brand_member",
        resourceId: input.targetUserId,
        metadata: {
          target: input.targetUserId,
          role: input.role,
          previousRole: previous.rows[0]?.role ?? null,
          previousStatus: previous.rows[0]?.status ?? null,
          expiresAt: input.expiresAt?.toISOString() ?? null,
        },
      },
      client,
    );
  });
}

export async function revokeBrandAssignment(
  ctx: OperationContext,
  targetUserId: string,
): Promise<void> {
  requireAction(ctx, "brand_members:manage");
  await withTransaction(async (client) => {
    await lockAndValidateBrandAdmin(ctx, client);
    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "brand_member"
			 WHERE "brand_id" = $1 AND "user_id" = $2 AND "status" IN ('active', 'pending_provisioning')`,
      [ctx.brandId, targetUserId],
    );
    // Revoke pending invitation lifecycles too: retries cannot restore access
    // withdrawn after acceptance or renew this administrator's authority.
    await client.query(
      `UPDATE "invitation_provisioning" p SET "state" = 'cancelled', "next_retry_at" = NULL, "updated_at" = now()
			WHERE p."organisation_id" = $1 AND p."state" IN ('pending_acceptance', 'provisioning', 'retry_pending')
			AND (p."recipient_user_id" = $2 OR p."created_by" = $2 OR lower(p."recipient_email") = (SELECT lower("email") FROM "user" WHERE "id" = $2))
			AND EXISTS (SELECT 1 FROM "invitation_brand_grant" g WHERE g."provisioning_id" = p."id" AND g."brand_id" = $3)`,
      [ctx.organisationId, targetUserId, ctx.brandId],
    );
    if (previous.rows.length === 0) return; // idempotent
    await client.query(
      `UPDATE "brand_member" SET "status" = 'revoked', "updated_at" = now()
			 WHERE "brand_id" = $1 AND "user_id" = $2`,
      [ctx.brandId, targetUserId],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        brandId: ctx.brandId,
        actorUserId: ctx.userId,
        action: "brand_member.revoked",
        resourceType: "brand_member",
        resourceId: targetUserId,
        metadata: {
          target: targetUserId,
          previousRole: previous.rows[0].role,
          previousStatus: previous.rows[0].status,
        },
      },
      client,
    );
  });
}

export async function updateBrandAssignmentRole(
  ctx: OperationContext,
  targetUserId: string,
  newRole: GrantAssignmentInput["role"],
): Promise<void> {
  requireAction(ctx, "brand_members:manage");
  await withTransaction(async (client) => {
    await lockAndValidateBrandAdmin(ctx, client);
    const previous = await client.query<{ role: string }>(
      `SELECT "role" FROM "brand_member"
			 WHERE "brand_id" = $1 AND "user_id" = $2 AND "status" = 'active'`,
      [ctx.brandId, targetUserId],
    );
    if (previous.rows.length === 0) throw new BrandAccessError();
    await client.query(
      `UPDATE "brand_member" SET "role" = $1, "updated_at" = now()
			 WHERE "brand_id" = $2 AND "user_id" = $3`,
      [newRole, ctx.brandId, targetUserId],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        brandId: ctx.brandId,
        actorUserId: ctx.userId,
        action: "brand_member.role_changed",
        resourceType: "brand_member",
        resourceId: targetUserId,
        metadata: { target: targetUserId, previousRole: previous.rows[0].role, newRole },
      },
      client,
    );
  });
}

/**
 * Administrative grant (Appendix D.5, §6.1): an organisation owner grants
 * brand access to themselves or another active organisation member.
 * Creates a normal assignment — never a bypass of the access service.
 * Caller must be the organisation owner; verified here, not trusted.
 */
export async function grantAdministrativeAssignment(params: {
  actorUserId: string;
  organisationId: string;
  brandId: string;
  targetUserId: string;
  role: GrantAssignmentInput["role"];
  reason: string;
  expiresAt?: Date | null;
}): Promise<void> {
  // The actor needs a context for the brand to act on it at all — an
  // owner without an assignment uses this operation to obtain one, so the
  // authorisation here is organisation-owner status, validated directly.
  await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [params.organisationId]);
    const membership = await findMembership(params.actorUserId, params.organisationId, client);
    if (!membership || !membershipHasRole(membership, "owner")) throw new BrandAccessError();
    const targetMembership = await findMembership(
      params.targetUserId,
      params.organisationId,
      client,
    );
    if (!targetMembership) throw new BrandAccessError();
    const brand = await client.query<{ organisationId: string }>(
      `SELECT "organisation_id" AS "organisationId" FROM "brand" WHERE "id" = $1 AND "status" = 'active' FOR UPDATE`,
      [params.brandId],
    );
    if (brand.rows[0]?.organisationId !== params.organisationId)
      throw new BrandAccessError();
    await assertSeatAvailable(client, params.brandId, params.targetUserId);

    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "brand_member"
			 WHERE "brand_id" = $1 AND "user_id" = $2`,
      [params.brandId, params.targetUserId],
    );
    await client.query(
      `INSERT INTO "brand_member"
				("id", "brand_id", "user_id", "role", "status", "expires_at", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, $4, 'active', $5, 'administrative', $6)
			 ON CONFLICT ("brand_id", "user_id") DO UPDATE SET
				"role" = EXCLUDED."role",
				"status" = 'active',
				"expires_at" = EXCLUDED."expires_at",
				"grant_source" = 'administrative',
				"granted_by" = EXCLUDED."granted_by",
				"provisioning_id" = NULL,
				"updated_at" = now()`,
      [
        randomUUID().replace(/-/g, ""),
        params.brandId,
        params.targetUserId,
        params.role,
        params.expiresAt ?? null,
        params.actorUserId,
      ],
    );
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        brandId: params.brandId,
        actorUserId: params.actorUserId,
        action: "brand_member.administrative_grant",
        resourceType: "brand_member",
        resourceId: params.targetUserId,
        metadata: {
          target: params.targetUserId,
          role: params.role,
          previousRole: previous.rows[0]?.role ?? null,
          previousStatus: previous.rows[0]?.status ?? null,
          reason: params.reason,
          expiresAt: params.expiresAt?.toISOString() ?? null,
        },
      },
      client,
    );
  });
}
