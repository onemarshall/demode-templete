import { APIError } from "better-auth/api";
import { assertOperationAction, type OperationContext } from "./context.js";
import { getDB } from "#lib/auth/server/database/db.js";
import {
  findOrganisationBySlug,
  findMembership,
  membershipIsAdminOrOwner,
} from "./better-auth-adapter.js";

export async function organisationSettings(userId: string, slug: string) {
  const organisation = await findOrganisationBySlug(slug);
  const membership = organisation && (await findMembership(userId, organisation.id));
  if (!organisation || !membership)
    throw new APIError("NOT_FOUND", { message: "Organisation unavailable" });
  const db = await getDB();
  const manager = membershipIsAdminOrOwner(membership);
  const members = manager
    ? (
        await db.query<{
          userId: string;
          name: string;
          email: string;
          role: string;
          emailVerified: boolean;
        }>(
          `SELECT m."userId", m."role", u."name", u."email", u."emailVerified" FROM "member" m JOIN "user" u ON u."id" = m."userId" WHERE m."organizationId" = $1 ORDER BY u."name"`,
          [organisation.id],
        )
      ).rows
    : [];
  const workspaces = manager
    ? (
        await db.query<{ id: string; name: string; slug: string; status: string }>(
          'SELECT "id", "name", "slug", "status" FROM "workspace" WHERE "organisation_id" = $1 ORDER BY "created_at"',
          [organisation.id],
        )
      ).rows
    : [];
  const invitations = manager
    ? (
        await db.query<{
          id: string;
          invitationId: string;
          email: string;
          state: string;
          attempts: number;
          nextRetryAt: Date | null;
        }>(
          `SELECT "id", "invitation_id" AS "invitationId", "recipient_email" AS email, "state", "attempts", "next_retry_at" AS "nextRetryAt" FROM "invitation_provisioning" WHERE "organisation_id" = $1 ORDER BY "created_at" DESC LIMIT 100`,
          [organisation.id],
        )
      ).rows
    : [];
  return {
    organisation: { id: organisation.id, name: organisation.name, slug: organisation.slug },
    role: membership.role,
    manager,
    members,
    workspaces,
    invitations,
  };
}
export async function recipientInvitation(
  user: { id: string; email: string },
  invitationId: string,
) {
  const db = await getDB();
  const { rows } = await db.query<{
    invitationId: string;
    organisationName: string;
    status: string;
    expiresAt: Date;
    provisioningId: string;
    state: string;
    nextRetryAt: Date | null;
  }>(
    `SELECT i."id" AS "invitationId", o."name" AS "organisationName", i."status", i."expiresAt", p."id" AS "provisioningId", p."state", p."next_retry_at" AS "nextRetryAt"
		FROM "invitation" i JOIN "organization" o ON o."id" = i."organizationId"
		JOIN "invitation_provisioning" p ON p."invitation_id" = i."id" AND p."organisation_id" = i."organizationId"
		WHERE i."id" = $1 AND lower(i."email") = lower($2) AND lower(p."recipient_email") = lower($2)
		AND (p."recipient_user_id" IS NULL OR p."recipient_user_id" = $3)`,
    [invitationId, user.email, user.id],
  );
  if (!rows[0])
    throw new APIError("NOT_FOUND", {
      message: "Invitation unavailable. Sign in with the email address that received it.",
    });
  return rows[0];
}

/** Workspace administrators choose existing organisation members by name. */
export async function assignableMembers(ctx: OperationContext) {
  assertOperationAction(ctx, "workspace_members:manage");
  const db = await getDB();
  return (
    await db.query<{ userId: string; name: string; email: string }>(
      `SELECT u."id" AS "userId", u."name", u."email" FROM "member" m
		JOIN "user" u ON u."id" = m."userId" WHERE m."organizationId" = $1 ORDER BY u."name"`,
      [ctx.organisationId],
    )
  ).rows;
}
