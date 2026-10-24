/** Organisation lifecycle writes share the provisioning/assignment lock. */
import { APIError } from "better-auth/api";
import { withTransaction, getDB } from "#lib/auth/server/database/db.js";
import {
  findMembership,
  membershipHasRole,
  countOrganisationOwners,
} from "./better-auth-adapter.js";
import { writeAuditEvent } from "./audit.js";

type Actor = { userId: string; sessionCreatedAt: Date | string };
function requireRecentSession(actor: Actor) {
  const created = new Date(actor.sessionCreatedAt).getTime();
  if (!Number.isFinite(created) || created > Date.now() || Date.now() - created > 60 * 60 * 1000) {
    throw new APIError("FORBIDDEN", {
      message: "Sign in again before changing ownership or membership.",
    });
  }
}

export async function transferOwnership(
  params: Actor & {
    organisationId: string;
    targetUserId: string;
    confirmation: string;
    reason: string;
  },
): Promise<void> {
  requireRecentSession(params);
  if (
    params.confirmation !== "TRANSFER" ||
    !params.reason.trim() ||
    params.targetUserId === params.userId
  ) {
    throw new APIError("BAD_REQUEST", {
      message: "Confirm the transfer and provide a reason and another member.",
    });
  }
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [params.organisationId]);
    const actor = await findMembership(params.userId, params.organisationId, client);
    const target = await findMembership(params.targetUserId, params.organisationId, client);
    if (!actor || !membershipHasRole(actor, "owner") || !target)
      throw new APIError("FORBIDDEN", { message: "Ownership transfer is unavailable." });
    const verified = await client.query<{ emailVerified: boolean }>(
      'SELECT "emailVerified" FROM "user" WHERE "id" = $1 FOR UPDATE',
      [params.targetUserId],
    );
    if (!verified.rows[0]?.emailVerified)
      throw new APIError("BAD_REQUEST", {
        message: "The new owner must verify their email first.",
      });
    // Personal subscriptions remain purchaser-scoped. Transfer does not replicate them.
    await client.query('UPDATE "member" SET "role" = $1 WHERE "id" = $2', ["owner", target.id]);
    await client.query('UPDATE "member" SET "role" = $1 WHERE "id" = $2', ["admin", actor.id]);
    if ((await countOrganisationOwners(params.organisationId, client)) < 1)
      throw new Error("Organisation must retain an owner");
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        actorUserId: params.userId,
        action: "organisation.ownership_transferred",
        resourceType: "member",
        resourceId: target.id,
        metadata: {
          targetUserId: params.targetUserId,
          previousRole: target.role,
          newRole: "owner",
          transferorRole: "admin",
          reason: params.reason.trim(),
        },
      },
      client,
    );
  });
}

export async function removeOrganisationMember(
  params: Actor & { organisationId: string; targetUserId: string },
): Promise<void> {
  requireRecentSession(params);
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [params.organisationId]);
    const actor = await findMembership(params.userId, params.organisationId, client);
    const target = await findMembership(params.targetUserId, params.organisationId, client);
    if (!actor || !target)
      throw new APIError("FORBIDDEN", { message: "Membership change is unavailable." });
    const self = params.userId === params.targetUserId;
    const owner = membershipHasRole(actor, "owner");
    if (!self && !owner && !(membershipHasRole(actor, "admin") && target.role === "member"))
      throw new APIError("FORBIDDEN", { message: "Membership change is unavailable." });
    if (
      membershipHasRole(target, "owner") &&
      (await countOrganisationOwners(params.organisationId, client)) <= 1
    ) {
      throw new APIError("BAD_REQUEST", {
        message: "Transfer ownership before leaving or removing the last owner.",
      });
    }
    await client.query(
      `UPDATE "brand_member" SET "status" = 'revoked', "updated_at" = now()
			WHERE "user_id" = $1 AND "brand_id" IN (SELECT "id" FROM "brand" WHERE "organisation_id" = $2)`,
      [params.targetUserId, params.organisationId],
    );
    await client.query(
      `UPDATE "invitation_provisioning" SET "state" = 'cancelled', "next_retry_at" = NULL, "updated_at" = now()
			WHERE "organisation_id" = $1 AND "state" IN ('pending_acceptance', 'provisioning', 'retry_pending')
			AND ("recipient_user_id" = $2 OR "created_by" = $2 OR lower("recipient_email") = (SELECT lower("email") FROM "user" WHERE "id" = $2))`,
      [params.organisationId, params.targetUserId],
    );
    await client.query('DELETE FROM "member" WHERE "id" = $1', [target.id]);
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        actorUserId: params.userId,
        action: self ? "membership.left" : "membership.removed",
        resourceType: "member",
        resourceId: target.id,
        metadata: { targetUserId: params.targetUserId, previousRole: target.role },
      },
      client,
    );
  });
}

/** Foreground guard precedes Better Auth's destructive session/account steps. */
export async function assertNoRetainedMemberships(userId: string): Promise<void> {
  try {
    const db = await getDB();
    const installed = await db.query<{ installed: boolean }>(
      "SELECT to_regclass('public.member') IS NOT NULL AS installed",
    );
    if (!installed.rows[0]?.installed) return;
    const { rows } = await db.query('SELECT 1 FROM "member" WHERE "userId" = $1 LIMIT 1', [userId]);
    if (rows.length)
      throw new APIError("FORBIDDEN", {
        code: "ORGANISATION_MEMBERSHIP_RETAINED",
        message:
          "Leave your organisations, transferring ownership where necessary, before deleting your account.",
      });
  } catch (cause) {
    if (cause instanceof APIError) throw cause;
    throw new APIError("SERVICE_UNAVAILABLE", {
      message:
        "We could not verify organisation obligations. Try again before deleting your account.",
    });
  }
}
