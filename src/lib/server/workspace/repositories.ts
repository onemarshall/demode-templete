/**
 * Context-required workspace repositories (decision D2, §6.3).
 *
 * Every workspace-scoped exported function takes `ctx: OperationContext` as
 * its first parameter; the branded context is constructible only by
 * `requireWorkspaceAccess`. No workspace-scoped pool.query may appear
 * outside this layer — a convention test enforces that (D2).
 */

import { randomUUID } from "crypto";
import { getDB, withTransaction } from "#lib/auth/server/database/db.js";
import { WorkspaceAccessError } from "./errors.js";
import { writeAuditEvent } from "./audit.js";
import { findMembership, membershipHasRole } from "./better-auth-adapter.js";
import type { OperationContext, WorkspaceAction } from "./context.js";
import { assertOperationAction } from "./context.js";
import { MEMBERS_PER_WORKSPACE } from "./limits.js";

export interface WorkspaceMemberView {
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
export function requireAction(ctx: OperationContext, action: WorkspaceAction): void {
  assertOperationAction(ctx, action);
}

/** Serializes assignment creation across an organisation and revalidates the actor in-transaction. */
async function lockAndValidateWorkspaceAdmin(
  ctx: OperationContext,
  client: import("pg").PoolClient,
): Promise<void> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [ctx.organisationId]);
  const membership = await findMembership(ctx.userId, ctx.organisationId, client);
  if (!membership) throw new WorkspaceAccessError();
  const { rows } = await client.query<{ organisationId: string; role: string }>(
    `SELECT w."organisation_id" AS "organisationId", wm."role"
		 FROM "workspace" w JOIN "workspace_member" wm ON wm."workspace_id" = w."id"
		 WHERE w."id" = $1 AND w."status" = 'active' AND wm."user_id" = $2
		   AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		 LIMIT 1 FOR UPDATE OF wm`,
    [ctx.workspaceId, ctx.userId],
  );
  if (rows[0]?.organisationId !== ctx.organisationId || rows[0]?.role !== "workspace_admin") {
    throw new WorkspaceAccessError();
  }
}

/** Rejects only when this grant would add an active seat to a full workspace. */
async function assertSeatAvailable(
  client: import("pg").PoolClient,
  workspaceId: string,
  targetUserId: string,
): Promise<void> {
  const { rows } = await client.query<{ count: string; targetActive: boolean }>(
    `SELECT count(*) FILTER (WHERE wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())) AS count,
		        bool_or(wm."user_id" = $2 AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())) AS "targetActive"
		 FROM "workspace_member" wm WHERE wm."workspace_id" = $1`,
    [workspaceId, targetUserId],
  );
  if (!rows[0]?.targetActive && Number(rows[0]?.count ?? 0) >= MEMBERS_PER_WORKSPACE) {
    throw new WorkspaceAccessError("Workspace member limit reached");
  }
}

export async function updateWorkspaceMetadata(
  ctx: OperationContext,
  updates: { name?: string },
): Promise<void> {
  requireAction(ctx, "workspace:update");
  await withTransaction(async (client) => {
    await lockAndValidateWorkspaceAdmin(ctx, client);
    if (updates.name !== undefined) {
      await client.query(
        `UPDATE "workspace" SET "name" = $1, "updated_at" = now() WHERE "id" = $2`,
        [updates.name, ctx.workspaceId],
      );
    }
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.userId,
        action: "workspace.metadata_updated",
        resourceType: "workspace",
        resourceId: ctx.workspaceId,
        metadata: { name: updates.name ?? null },
      },
      client,
    );
  });
}

export async function listWorkspaceMembers(
  ctx: OperationContext,
  options: { includeInactive?: boolean } = {},
): Promise<WorkspaceMemberView[]> {
  requireAction(ctx, "workspace_members:manage");
  const db = await getDB();
  const statusClause = options.includeInactive
    ? ""
    : ` AND wm."status" = 'active' AND (wm."expires_at" IS NULL OR wm."expires_at" > now())`;
  const { rows } = await db.query<WorkspaceMemberView>(
    `SELECT wm."id", wm."user_id" AS "userId", u."name", u."email", wm."role", wm."status", wm."expires_at" AS "expiresAt",
		        wm."grant_source" AS "grantSource", wm."granted_by" AS "grantedBy", wm."created_at" AS "createdAt"
		 FROM "workspace_member" wm
		 JOIN "user" u ON u."id" = wm."user_id"
		 JOIN "member" m ON m."userId" = wm."user_id" AND m."organizationId" = $2
		 WHERE wm."workspace_id" = $1${statusClause}
		 ORDER BY wm."created_at" ASC`,
    [ctx.workspaceId, ctx.organisationId],
  );
  return rows;
}

export interface GrantAssignmentInput {
  targetUserId: string;
  role: "workspace_admin" | "editor" | "contributor" | "viewer";
  expiresAt?: Date | null;
}

/**
 * Managed grant (Appendix D.5): a workspace admin grants a workspace role to
 * an active organisation member. Audited with actor, target, previous and new
 * role.
 */
export async function grantWorkspaceAssignment(
  ctx: OperationContext,
  input: GrantAssignmentInput,
): Promise<void> {
  requireAction(ctx, "workspace_members:manage");

  await withTransaction(async (client) => {
    await lockAndValidateWorkspaceAdmin(ctx, client);
    const membership = await findMembership(input.targetUserId, ctx.organisationId, client);
    if (!membership) throw new WorkspaceAccessError(); // target must be an active organisation member
    await assertSeatAvailable(client, ctx.workspaceId, input.targetUserId);
    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "workspace_member"
			 WHERE "workspace_id" = $1 AND "user_id" = $2`,
      [ctx.workspaceId, input.targetUserId],
    );
    await client.query(
      `INSERT INTO "workspace_member"
				("id", "workspace_id", "user_id", "role", "status", "expires_at", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, $4, 'active', $5, 'managed', $6)
			 ON CONFLICT ("workspace_id", "user_id") DO UPDATE SET
				"role" = EXCLUDED."role",
				"status" = 'active',
				"expires_at" = EXCLUDED."expires_at",
				"grant_source" = 'managed',
				"granted_by" = EXCLUDED."granted_by",
				"provisioning_id" = NULL,
				"updated_at" = now()`,
      [
        randomUUID().replace(/-/g, ""),
        ctx.workspaceId,
        input.targetUserId,
        input.role,
        input.expiresAt ?? null,
        ctx.userId,
      ],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.userId,
        action: "workspace_member.granted",
        resourceType: "workspace_member",
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

export async function revokeWorkspaceAssignment(
  ctx: OperationContext,
  targetUserId: string,
): Promise<void> {
  requireAction(ctx, "workspace_members:manage");
  await withTransaction(async (client) => {
    await lockAndValidateWorkspaceAdmin(ctx, client);
    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "workspace_member"
			 WHERE "workspace_id" = $1 AND "user_id" = $2 AND "status" IN ('active', 'pending_provisioning')`,
      [ctx.workspaceId, targetUserId],
    );
    // Revoke pending invitation lifecycles too: retries cannot restore access
    // withdrawn after acceptance or renew this administrator's authority.
    await client.query(
      `UPDATE "invitation_provisioning" p SET "state" = 'cancelled', "next_retry_at" = NULL, "updated_at" = now()
			WHERE p."organisation_id" = $1 AND p."state" IN ('pending_acceptance', 'provisioning', 'retry_pending')
			AND (p."recipient_user_id" = $2 OR p."created_by" = $2 OR lower(p."recipient_email") = (SELECT lower("email") FROM "user" WHERE "id" = $2))
			AND EXISTS (SELECT 1 FROM "invitation_workspace_grant" g WHERE g."provisioning_id" = p."id" AND g."workspace_id" = $3)`,
      [ctx.organisationId, targetUserId, ctx.workspaceId],
    );
    if (previous.rows.length === 0) return; // idempotent
    await client.query(
      `UPDATE "workspace_member" SET "status" = 'revoked', "updated_at" = now()
			 WHERE "workspace_id" = $1 AND "user_id" = $2`,
      [ctx.workspaceId, targetUserId],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.userId,
        action: "workspace_member.revoked",
        resourceType: "workspace_member",
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

export async function updateWorkspaceAssignmentRole(
  ctx: OperationContext,
  targetUserId: string,
  newRole: GrantAssignmentInput["role"],
): Promise<void> {
  requireAction(ctx, "workspace_members:manage");
  await withTransaction(async (client) => {
    await lockAndValidateWorkspaceAdmin(ctx, client);
    const previous = await client.query<{ role: string }>(
      `SELECT "role" FROM "workspace_member"
			 WHERE "workspace_id" = $1 AND "user_id" = $2 AND "status" = 'active'`,
      [ctx.workspaceId, targetUserId],
    );
    if (previous.rows.length === 0) throw new WorkspaceAccessError();
    await client.query(
      `UPDATE "workspace_member" SET "role" = $1, "updated_at" = now()
			 WHERE "workspace_id" = $2 AND "user_id" = $3`,
      [newRole, ctx.workspaceId, targetUserId],
    );
    await writeAuditEvent(
      {
        organisationId: ctx.organisationId,
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.userId,
        action: "workspace_member.role_changed",
        resourceType: "workspace_member",
        resourceId: targetUserId,
        metadata: { target: targetUserId, previousRole: previous.rows[0].role, newRole },
      },
      client,
    );
  });
}

/**
 * Administrative grant (Appendix D.5, §6.1): an organisation owner grants
 * workspace access to themselves or another active organisation member.
 * Creates a normal assignment — never a bypass of the access service.
 * Caller must be the organisation owner; verified here, not trusted.
 */
export async function grantAdministrativeAssignment(params: {
  actorUserId: string;
  organisationId: string;
  workspaceId: string;
  targetUserId: string;
  role: GrantAssignmentInput["role"];
  reason: string;
  expiresAt?: Date | null;
}): Promise<void> {
  // The actor needs a context for the workspace to act on it at all — an
  // owner without an assignment uses this operation to obtain one, so the
  // authorisation here is organisation-owner status, validated directly.
  await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [params.organisationId]);
    const membership = await findMembership(params.actorUserId, params.organisationId, client);
    if (!membership || !membershipHasRole(membership, "owner")) throw new WorkspaceAccessError();
    const targetMembership = await findMembership(
      params.targetUserId,
      params.organisationId,
      client,
    );
    if (!targetMembership) throw new WorkspaceAccessError();
    const workspace = await client.query<{ organisationId: string }>(
      `SELECT "organisation_id" AS "organisationId" FROM "workspace" WHERE "id" = $1 AND "status" = 'active' FOR UPDATE`,
      [params.workspaceId],
    );
    if (workspace.rows[0]?.organisationId !== params.organisationId)
      throw new WorkspaceAccessError();
    await assertSeatAvailable(client, params.workspaceId, params.targetUserId);

    const previous = await client.query<{ role: string; status: string }>(
      `SELECT "role", "status" FROM "workspace_member"
			 WHERE "workspace_id" = $1 AND "user_id" = $2`,
      [params.workspaceId, params.targetUserId],
    );
    await client.query(
      `INSERT INTO "workspace_member"
				("id", "workspace_id", "user_id", "role", "status", "expires_at", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, $4, 'active', $5, 'administrative', $6)
			 ON CONFLICT ("workspace_id", "user_id") DO UPDATE SET
				"role" = EXCLUDED."role",
				"status" = 'active',
				"expires_at" = EXCLUDED."expires_at",
				"grant_source" = 'administrative',
				"granted_by" = EXCLUDED."granted_by",
				"provisioning_id" = NULL,
				"updated_at" = now()`,
      [
        randomUUID().replace(/-/g, ""),
        params.workspaceId,
        params.targetUserId,
        params.role,
        params.expiresAt ?? null,
        params.actorUserId,
      ],
    );
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        workspaceId: params.workspaceId,
        actorUserId: params.actorUserId,
        action: "workspace_member.administrative_grant",
        resourceType: "workspace_member",
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
