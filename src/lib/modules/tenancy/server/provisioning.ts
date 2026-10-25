/**
 * Invitation provisioning lifecycle (spec §7.1, Appendix D.1).
 *
 * The installed plugin never shares a transaction with membership writes
 * (Appendix B.2), so the durable state machine is mandatory. The plugin's
 * own partial state (invitation accepted, no member row) is reconciled here.
 *
 * Email delivery is Montsel's responsibility AFTER the provisioning record
 * is persisted (§7.1 "persist before delivery"); the plugin's
 * sendInvitationEmail is a no-op. Delivery failure never grants access.
 */

import { APIError } from "better-auth/api";
import { auth } from "#lib/modules/auth/server/config.js";
import { getDB, withTransaction } from "#lib/platform/database/db.js";
import { logger } from "#lib/platform/logger.js";
import { randomUUID } from "crypto";
import { writeAuditEvent } from "./audit.js";
import {
  findMembership,
  countOrganisationMembers,
  countOrganisationOwners,
} from "./better-auth-adapter.js";
import {
  MEMBERS_PER_BRAND,
  ORGANISATION_MEMBERS,
  PROVISIONING_MAX_ATTEMPTS,
  PROVISIONING_RETRY_BACKOFF_MS,
} from "./limits.js";

type PoolClient = import("pg").PoolClient;

export type ProvisioningState =
  | "pending_acceptance"
  | "provisioning"
  | "retry_pending"
  | "active"
  | "cancelled"
  | "expired"
  | "permanently_failed";

export interface ProvisioningRecord {
  id: string;
  invitationId: string;
  organisationId: string;
  recipientEmail: string;
  recipientUserId: string | null;
  state: ProvisioningState;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  lastError: string | null;
  createdBy: string;
}

export interface GrantRow {
  brandId: string;
  role: "brand_admin" | "editor" | "contributor" | "viewer";
}

interface InvitationLike {
  id: string;
  email: string;
  status: string;
  expiresAt: Date | string;
  organizationId: string;
  inviterId?: string;
}

function toRecord(row: Record<string, unknown>): ProvisioningRecord {
  const nextRetryAt = row.next_retry_at ?? row.nextRetryAt ?? null;
  return {
    id: row.id as string,
    invitationId: (row.invitation_id ?? row.invitationId) as string,
    organisationId: (row.organisation_id ?? row.organisationId) as string,
    recipientEmail: (row.recipient_email ?? row.recipientEmail) as string,
    recipientUserId: (row.recipient_user_id ?? row.recipientUserId ?? null) as string | null,
    state: row.state as ProvisioningState,
    idempotencyKey: (row.idempotency_key ?? row.idempotencyKey) as string,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? row.maxAttempts ?? PROVISIONING_MAX_ATTEMPTS),
    nextRetryAt:
      nextRetryAt === null
        ? null
        : nextRetryAt instanceof Date
          ? nextRetryAt
          : new Date(String(nextRetryAt)),
    lastError: (row.last_error ?? row.lastError ?? null) as string | null,
    createdBy: (row.created_by ?? row.createdBy) as string,
  };
}

export function mapProvisioningRow(row: Record<string, unknown>): ProvisioningRecord {
  return toRecord(row);
}

async function findProvisioningByInvitation(
  invitationId: string,
): Promise<ProvisioningRecord | null> {
  const db = await getDB();
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT * FROM "invitation_provisioning" WHERE "invitation_id" = $1 LIMIT 1`,
    [invitationId],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

// ============================================
// Plugin hooks (wired in the organization module)
// ============================================

/**
 * afterCreateInvitation: persist the provisioning record before delivery.
 * Idempotent on the invitation ID. Grants are attached separately by the
 * invitation service, so a plugin-native invitation creates a grant-less
 * record — acceptance then activates nothing (default deny).
 */
export async function onInvitationCreated(data: {
  invitation: InvitationLike;
  inviter: { id: string };
  organization: { id: string };
}): Promise<void> {
  const db = await getDB();
  await db.query(
    `INSERT INTO "invitation_provisioning"
			("id", "invitation_id", "organisation_id", "recipient_email", "state", "idempotency_key", "created_by")
		 VALUES ($1, $2, $3, $4, 'pending_acceptance', $2, $5)
		 ON CONFLICT ("idempotency_key") DO NOTHING`,
    [
      randomUUID().replace(/-/g, ""),
      data.invitation.id,
      data.organization.id,
      normalizeEmail(data.invitation.email),
      data.inviter.id,
    ],
  );
  const record = await findProvisioningByInvitation(data.invitation.id);
  if (
    !record ||
    record.organisationId !== data.organization.id ||
    normalizeEmail(record.recipientEmail) !== normalizeEmail(data.invitation.email) ||
    record.createdBy !== data.inviter.id
  )
    throw new Error("Invitation provisioning identity conflicts with the organisation invitation");
}

/**
 * beforeAcceptInvitation: expired, cancelled, replaced or already-consumed
 * invitations cannot create fresh grants (§7). Defense in depth — the plugin
 * checks status/expiry too; we re-check the provisioning record.
 */
export async function guardInvitationAcceptance(data: {
  invitation: InvitationLike;
  user: { id: string; email: string; emailVerified?: boolean };
  organization: { id: string };
}): Promise<void> {
  if (data.user.emailVerified !== true || data.invitation.status !== "pending") {
    throw new APIError("FORBIDDEN", { message: "Invitation recipient could not be verified" });
  }
  if (!isFutureDate(data.invitation.expiresAt))
    throw new APIError("FORBIDDEN", { message: "Invitation has expired" });
  await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [data.organization.id]);
    const { rows: provisioningRows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM "invitation_provisioning" WHERE "invitation_id" = $1 FOR UPDATE`,
      [data.invitation.id],
    );
    const record = provisioningRows[0] ? toRecord(provisioningRows[0]) : null;
    if (!record) throw new APIError("FORBIDDEN", { message: "Invitation is not provisionable" });
    const { rows: invitationRows } = await client.query<{
      email: string;
      status: string;
      organizationId: string;
      expiresAt: Date | string;
    }>(
      `SELECT "email", "status", "organizationId", "expiresAt"
			 FROM "invitation" WHERE "id" = $1 FOR SHARE`,
      [data.invitation.id],
    );
    const invitation = invitationRows[0];
    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.organizationId !== data.organization.id ||
      data.invitation.organizationId !== data.organization.id ||
      record.organisationId !== data.organization.id ||
      normalizeEmail(invitation.email) !== normalizeEmail(record.recipientEmail) ||
      normalizeEmail(data.invitation.email) !== normalizeEmail(record.recipientEmail) ||
      normalizeEmail(data.user.email) !== normalizeEmail(record.recipientEmail) ||
      (data.invitation.inviterId && data.invitation.inviterId !== record.createdBy)
    )
      throw new APIError("FORBIDDEN", { message: "Invitation recipient could not be verified" });
    if (!isFutureDate(invitation.expiresAt))
      throw new APIError("FORBIDDEN", { message: "Invitation has expired" });

    const existingClaim =
      record.state === "provisioning" && record.recipientUserId === data.user.id;
    if (!existingClaim && record.state !== "pending_acceptance") {
      throw new APIError("FORBIDDEN", { message: "Invitation is no longer available" });
    }
    if (!existingClaim) {
      const memberCount = await countOrganisationMembers(data.organization.id, client);
      const { rows: reservations } = await client.query<{ count: string }>(
        `SELECT count(*) AS count
				 FROM "invitation_provisioning" p
				 JOIN "invitation" i ON i."id" = p."invitation_id"
				 WHERE p."organisation_id" = $1 AND p."state" = 'provisioning'
				   AND p."recipient_user_id" IS NOT NULL AND i."status" IN ('pending', 'accepted')
				   AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."organizationId" = p."organisation_id" AND m."userId" = p."recipient_user_id")
				   AND i."expiresAt" > now()`,
        [data.organization.id],
      );
      if (memberCount + Number(reservations[0]?.count ?? 0) + 1 > ORGANISATION_MEMBERS) {
        throw new APIError("FORBIDDEN", { message: "Organisation member limit reached" });
      }
    }
    await client.query(
      `UPDATE "invitation_provisioning"
			 SET "state" = 'provisioning', "recipient_user_id" = $1, "updated_at" = now()
			 WHERE "id" = $2 AND "state" = 'pending_acceptance'`,
      [data.user.id, record.id],
    );
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * afterAcceptInvitation: transition pending_acceptance → provisioning →
 * active, or schedule a bounded retry. Never throws — the member row already
 * exists at this point (B.2); failing the accept API would strand the user.
 */
export async function onInvitationAccepted(data: {
  invitation: InvitationLike;
  member: { id: string };
  user: { id: string; email: string; emailVerified?: boolean };
  organization: { id: string };
}): Promise<void> {
  const record = await findProvisioningByInvitation(data.invitation.id);
  if (!record) {
    logger.error("[provisioning] accepted invitation without provisioning record", {
      invitationId: data.invitation.id,
    });
    await writeAuditEvent({
      organisationId: data.organization.id,
      actorType: "system",
      action: "provisioning.record_missing",
      resourceType: "invitation",
      resourceId: data.invitation.id,
      outcome: "error",
      metadata: { recipient: data.user.id },
    });
    return;
  }

  try {
    await bindAcceptedRecipient(record, data.invitation, data.user, data.organization.id);
    await activateProvisioning(record, data.user.id);
  } catch (error) {
    await scheduleRetry(record, error);
  }
}

/** Persist recipient identity before activation so a failed hook is recoverable. */
async function bindAcceptedRecipient(
  record: ProvisioningRecord,
  invitation: InvitationLike,
  user: { id: string; email: string; emailVerified?: boolean },
  organisationId: string,
): Promise<void> {
  if (
    invitation.status !== "accepted" ||
    invitation.organizationId !== organisationId ||
    record.organisationId !== organisationId ||
    normalizeEmail(invitation.email) !== normalizeEmail(record.recipientEmail) ||
    (invitation.inviterId && invitation.inviterId !== record.createdBy) ||
    normalizeEmail(user.email) !== normalizeEmail(record.recipientEmail) ||
    user.emailVerified !== true
  )
    throw new Error("Accepted invitation does not match its verified recipient");
  const db = await getDB();
  const { rows } = await db.query(
    `UPDATE "invitation_provisioning"
		 SET "recipient_user_id" = $1,
		     "state" = CASE WHEN "state" = 'pending_acceptance' THEN 'provisioning' ELSE "state" END,
	     "updated_at" = now()
		 WHERE "id" = $2
		   AND "invitation_id" = $3
		   AND "organisation_id" = $4
		   AND "recipient_email" = $5
		   AND ("recipient_user_id" IS NULL OR "recipient_user_id" = $1)
		   AND "state" IN ('pending_acceptance', 'provisioning', 'retry_pending')
		RETURNING "id"`,
    [user.id, record.id, invitation.id, organisationId, record.recipientEmail],
  );
  if (rows.length === 0)
    throw new Error("Invitation provisioning was cancelled or bound to another recipient");
}

// ============================================
// Activation (the only transition that grants access)
// ============================================

async function activateProvisioning(
  record: ProvisioningRecord,
  recipientUserId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    // Serialise concurrent acceptances/limit checks for this organisation (B.3 #5).
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [record.organisationId]);

    // Re-load the record inside the transaction; state must still be enterable.
    const current = await client.query<Record<string, unknown>>(
      `SELECT * FROM "invitation_provisioning" WHERE "id" = $1 FOR UPDATE`,
      [record.id],
    );
    const currentRecord = current.rows[0] ? toRecord(current.rows[0]) : null;
    const state = currentRecord?.state;
    if (!state || !["pending_acceptance", "retry_pending", "provisioning"].includes(state)) {
      return; // cancelled/expired/failed/already active — stale activation is a no-op
    }
    // Recheck the retry budget and delay under the lock, including stale
    // batch workers that selected this row before another attempt completed.
    if (
      currentRecord &&
      (currentRecord.attempts >= currentRecord.maxAttempts ||
        (currentRecord.nextRetryAt && currentRecord.nextRetryAt.getTime() > Date.now()))
    )
      return;
    if (!currentRecord?.recipientUserId || currentRecord.recipientUserId !== recipientUserId) {
      throw new Error("Provisioning recipient is not bound to this user");
    }
    const inviteResult = await client.query<{
      email: string;
      organizationId: string;
      status: string;
      expiresAt: Date | string;
    }>(
      `SELECT "email", "organizationId", "status", "expiresAt"
			 FROM "invitation" WHERE "id" = $1 FOR SHARE`,
      [currentRecord.invitationId],
    );
    const acceptedInvitation = inviteResult.rows[0];
    if (
      !acceptedInvitation ||
      acceptedInvitation.status !== "accepted" ||
      acceptedInvitation.organizationId !== currentRecord.organisationId ||
      normalizeEmail(acceptedInvitation.email) !== normalizeEmail(currentRecord.recipientEmail) ||
      !isFutureDate(acceptedInvitation.expiresAt)
    )
      throw new Error("Invitation is no longer valid for provisioning");
    const recipient = await client.query<{ email: string; emailVerified: boolean }>(
      `SELECT "email", "emailVerified" FROM "user" WHERE "id" = $1`,
      [recipientUserId],
    );
    if (
      !recipient.rows[0] ||
      recipient.rows[0].emailVerified !== true ||
      normalizeEmail(recipient.rows[0].email) !== normalizeEmail(currentRecord.recipientEmail)
    )
      throw new Error("Recipient email verification no longer matches the invitation");

    // Recipient must hold active organisation membership (validate-both, §5).
    const membership = await findMembership(recipientUserId, record.organisationId, client);
    if (!membership) throw new Error("Recipient organisation membership is missing");

    // Inviter authority revalidated before assignments activate (§7).
    const inviterMembership = await findMembership(
      currentRecord.createdBy,
      currentRecord.organisationId,
      client,
    );
    if (!inviterMembership) {
      throw new Error("Inviter no longer holds invitation authority");
    }

    // Grants: revalidated — each brand must belong to the invited organisation.
    const { rows: grants } = await client.query<
      GrantRow & { actualOrganisationId: string; brandStatus: string }
    >(
      `SELECT g."brand_id" AS "brandId", g."role",
		        w."organisation_id" AS "actualOrganisationId", w."status" AS "brandStatus"
			 FROM "invitation_brand_grant" g
			 JOIN "brand" w ON w."id" = g."brand_id"
			 WHERE g."provisioning_id" = $1`,
      [record.id],
    );
    if (grants.length === 0) throw new Error("Invitation has no authorised brand assignments");
    for (const grant of grants) {
      if (grant.brandStatus !== "active")
        throw new Error("An intended brand is no longer active");
      if (grant.actualOrganisationId !== record.organisationId) {
        throw new Error("Grant brand does not belong to the invited organisation");
      }
      const brandAuthority = await client.query<{ allowed: boolean }>(
        `SELECT EXISTS (
					SELECT 1 FROM "brand_member"
					WHERE "brand_id" = $1 AND "user_id" = $2
					  AND "role" = 'brand_admin' AND "status" = 'active'
					  AND ("expires_at" IS NULL OR "expires_at" > now())
				) AS allowed`,
        [grant.brandId, currentRecord.createdBy],
      );
      if (!brandAuthority.rows[0]?.allowed && !membershipHasOwnerRole(inviterMembership)) {
        throw new Error("Inviter has no authority to grant this brand");
      }
    }

    // Server-side limits, inside the lock (§11.2, B.3 #5).
    const memberCount = await countOrganisationMembers(record.organisationId, client);
    if (memberCount > ORGANISATION_MEMBERS) {
      throw new Error("Organisation member limit reached");
    }
    for (const grant of grants) {
      const { rows: capacity } = await client.query<{ count: string }>(
        `SELECT count(*) AS count FROM "brand_member"
				 WHERE "brand_id" = $1
				   AND ("status" = 'pending_provisioning' OR ("status" = 'active' AND ("expires_at" IS NULL OR "expires_at" > now())))`,
        [grant.brandId],
      );
      const alreadyActive = await client.query<{ active: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM "brand_member"
				 WHERE "brand_id" = $1 AND "user_id" = $2 AND "status" = 'active'
				   AND ("expires_at" IS NULL OR "expires_at" > now())) AS active`,
        [grant.brandId, recipientUserId],
      );
      if (
        !alreadyActive.rows[0]?.active &&
        Number(capacity[0]?.count ?? 0) + 1 > MEMBERS_PER_BRAND
      ) {
        throw new Error("Brand member limit reached");
      }
    }

    // Activate the complete assignment set in this one transaction (§7.1).
    for (const grant of grants) {
      await client.query(
        `INSERT INTO "brand_member"
					("id", "brand_id", "user_id", "role", "status", "grant_source", "granted_by", "provisioning_id")
				 VALUES ($1, $2, $3, $4, 'active', 'invitation', $5, $6)
				 ON CONFLICT ("brand_id", "user_id") DO UPDATE SET
					"role" = EXCLUDED."role",
					"status" = 'active',
					"grant_source" = 'invitation',
					"granted_by" = EXCLUDED."granted_by",
					"provisioning_id" = EXCLUDED."provisioning_id",
					"expires_at" = NULL,
					"updated_at" = now()
				 WHERE "brand_member"."status" IN ('revoked', 'expired')
				    OR ("brand_member"."status" = 'active' AND "brand_member"."expires_at" <= now())`,
        [
          randomUUID().replace(/-/g, ""),
          grant.brandId,
          recipientUserId,
          grant.role,
          record.createdBy,
          record.id,
        ],
      );
    }

    await client.query(
      `UPDATE "invitation_provisioning"
			 SET "state" = 'active', "recipient_user_id" = $1, "last_error" = NULL,
			     "next_retry_at" = NULL, "updated_at" = now()
			 WHERE "id" = $2`,
      [recipientUserId, currentRecord.id],
    );

    await writeAuditEvent(
      {
        organisationId: currentRecord.organisationId,
        actorUserId: recipientUserId,
        action: "provisioning.activated",
        resourceType: "invitation_provisioning",
        resourceId: currentRecord.id,
        metadata: {
          invitationId: currentRecord.invitationId,
          brands: grants.map((g) => g.brandId),
        },
      },
      client,
    );
  });
}

function membershipHasOwnerRole(membership: { role: string }): boolean {
  return membership.role
    .split(",")
    .map((role) => role.trim())
    .includes("owner");
}

async function scheduleRetry(record: ProvisioningRecord, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message : String(cause);
  const attempts = await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [record.organisationId]);
    const { rows } = await client.query<{
      state: ProvisioningState;
      attempts: number;
      maxAttempts: number;
    }>(
      `SELECT "state", "attempts" AS "attempts", "max_attempts" AS "maxAttempts"
			 FROM "invitation_provisioning" WHERE "id" = $1 FOR UPDATE`,
      [record.id],
    );
    const current = rows[0];
    if (
      !current ||
      !["pending_acceptance", "provisioning", "retry_pending"].includes(current.state)
    )
      return null;
    const nextAttempt = current.attempts + 1;
    const nextState = nextAttempt >= current.maxAttempts ? "permanently_failed" : "retry_pending";
    await client.query(
      `UPDATE "invitation_provisioning"
			 SET "state" = $1, "attempts" = $2, "last_error" = $3,
			     "next_retry_at" = CASE WHEN $1 = 'retry_pending' THEN now() + make_interval(secs => $4) ELSE NULL END,
			     "updated_at" = now()
			 WHERE "id" = $5`,
      [nextState, nextAttempt, message, PROVISIONING_RETRY_BACKOFF_MS / 1000, record.id],
    );
    return { attempts: nextAttempt, maxAttempts: current.maxAttempts };
  });
  if (!attempts) return;
  logger.error(`[provisioning] activation failed (${attempts.attempts}/${attempts.maxAttempts})`, {
    provisioningId: record.id,
    error: message,
  });
  await writeAuditEvent({
    organisationId: record.organisationId,
    actorType: "system",
    action: "provisioning.activation_failed",
    resourceType: "invitation_provisioning",
    resourceId: record.id,
    outcome: "error",
    metadata: { attempts: attempts.attempts, error: message },
  });
}

// ============================================
// Grant attachment (called by the invitation service)
// ============================================

/**
 * Attach intended brand grants to a provisioning record. Brands must
 * belong to the invited organisation; the inviter must be an organisation
 * owner acting explicitly or a brand admin for each grant target.
 */
export async function addGrantsToProvisioning(params: {
  invitationId: string;
  organisationId: string;
  inviterUserId: string;
  grants: GrantRow[];
}): Promise<void> {
  const record = await findProvisioningByInvitation(params.invitationId);
  if (!record || record.organisationId !== params.organisationId) {
    throw new APIError("BAD_REQUEST", {
      message: "Provisioning record not found for this invitation",
    });
  }
  if (record.createdBy !== params.inviterUserId) {
    throw new APIError("FORBIDDEN", {
      message: "Only the original inviter can attach invitation grants",
    });
  }
  if (record.state !== "pending_acceptance" || params.grants.length === 0) {
    throw new APIError("FORBIDDEN", {
      message: "Invitation is no longer accepting brand grants",
    });
  }
  if (new Set(params.grants.map((grant) => grant.brandId)).size !== params.grants.length) {
    throw new APIError("BAD_REQUEST", {
      message: "A brand can only appear once in an invitation",
    });
  }
  const inviterMembership = await findMembership(params.inviterUserId, params.organisationId);
  if (!inviterMembership) {
    throw new APIError("FORBIDDEN", { message: "Not allowed to invite to this organisation" });
  }

  const db = await getDB();
  const { rows: brands } = await db.query<{ id: string }>(
    `SELECT "id" FROM "brand"
		 WHERE "id" = ANY($1) AND "organisation_id" = $2 AND "status" = 'active'`,
    [params.grants.map((g) => g.brandId), params.organisationId],
  );
  const validBrands = new Set(brands.map((b) => b.id));
  for (const grant of params.grants) {
    if (!validBrands.has(grant.brandId)) {
      throw new APIError("FORBIDDEN", {
        message: "Brand does not belong to this organisation",
      });
    }
    if (
      !(await canGrantBrand(params.inviterUserId, params.organisationId, grant.brandId))
    ) {
      throw new APIError("FORBIDDEN", { message: "Not allowed to grant access to this brand" });
    }
  }

  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [params.organisationId]);
    const locked = await client.query<{ state: ProvisioningState }>(
      `SELECT "state" FROM "invitation_provisioning" WHERE "id" = $1 FOR UPDATE`,
      [record.id],
    );
    if (locked.rows[0]?.state !== "pending_acceptance") {
      throw new APIError("FORBIDDEN", {
        message: "Invitation is no longer accepting brand grants",
      });
    }
    const existing = await client.query<{ count: string }>(
      `SELECT count(*) AS count FROM "invitation_brand_grant" WHERE "provisioning_id" = $1`,
      [record.id],
    );
    if (Number(existing.rows[0]?.count ?? 0) > 0) {
      throw new APIError("CONFLICT", {
        message: "Brand grants are already attached to this invitation",
      });
    }
    for (const grant of params.grants) {
      const brand = await client.query<{ id: string }>(
        `SELECT "id" FROM "brand"
				 WHERE "id" = $1 AND "organisation_id" = $2 AND "status" = 'active' FOR SHARE`,
        [grant.brandId, params.organisationId],
      );
      if (
        !brand.rows[0] ||
        !(await canGrantBrand(
          params.inviterUserId,
          params.organisationId,
          grant.brandId,
          client,
        ))
      ) {
        throw new APIError("FORBIDDEN", {
          message: "Brand grant authority changed before invitation was saved",
        });
      }
      await client.query(
        `INSERT INTO "invitation_brand_grant" ("id", "provisioning_id", "brand_id", "role")
				 VALUES ($1, $2, $3, $4)
				 ON CONFLICT ("provisioning_id", "brand_id") DO NOTHING`,
        [randomUUID().replace(/-/g, ""), record.id, grant.brandId, grant.role],
      );
    }
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        actorUserId: params.inviterUserId,
        action: "invitation.grants_attached",
        resourceType: "invitation_provisioning",
        resourceId: record.id,
        metadata: { invitationId: params.invitationId, grants: params.grants },
      },
      client,
    );
  });
}

export async function canGrantBrand(
  actorUserId: string,
  organisationId: string,
  brandId: string,
  client?: PoolClient,
): Promise<boolean> {
  const membership = await findMembership(actorUserId, organisationId, client);
  if (!membership) return false;
  if (membershipHasOwnerRole(membership)) return true;
  const db = client ?? (await getDB());
  const { rows } = await db.query<{ allowed: boolean }>(
    `SELECT EXISTS (
			SELECT 1 FROM "brand_member" wm
			JOIN "brand" w ON w."id" = wm."brand_id"
			WHERE wm."brand_id" = $1 AND wm."user_id" = $2
			  AND w."organisation_id" = $3 AND w."status" = 'active'
			  AND wm."role" = 'brand_admin' AND wm."status" = 'active'
			  AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		) AS allowed`,
    [brandId, actorUserId, organisationId],
  );
  return Boolean(rows[0]?.allowed);
}

function isFutureDate(value: Date | string): boolean {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > Date.now();
}

// ============================================
// Authorised recovery (§7.1: bounded retry, visibility, recovery action)
// ============================================

/**
 * Retry a failed provisioning. Callable by the recipient (lazy retry on
 * viewing status) or an org admin (explicit recovery). All guards re-run;
 * a stale retry never recreates access after removal.
 */
export async function retryProvisioning(params: {
  provisioningId: string;
  actorUserId: string;
  headers: Headers;
}): Promise<ProvisioningState> {
  const session = await auth.api.getSession({ headers: params.headers });
  if (!session?.user || session.user.id !== params.actorUserId) {
    throw new APIError("UNAUTHORIZED", {
      message: "Retry actor does not match the authenticated session",
    });
  }
  const db = await getDB();
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT * FROM "invitation_provisioning" WHERE "id" = $1 LIMIT 1`,
    [params.provisioningId],
  );
  const record = rows[0] ? toRecord(rows[0]) : null;
  if (!record) throw new APIError("NOT_FOUND", { message: "Provisioning unavailable" });
  const actorMembership = await findMembership(params.actorUserId, record.organisationId);
  if (
    params.actorUserId !== record.recipientUserId &&
    (!actorMembership ||
      (!membershipHasOwnerRole(actorMembership) &&
        !actorMembership.role.split(",").includes("admin")))
  )
    throw new APIError("NOT_FOUND", { message: "Provisioning unavailable" });
  if (!["active", "retry_pending", "provisioning"].includes(record.state)) {
    throw new APIError("FORBIDDEN", { message: "Provisioning is not retryable" });
  }
  if (record.state === "active") return record.state;
  if (record.attempts >= record.maxAttempts) {
    throw new APIError("FORBIDDEN", { message: "Retry limit reached" });
  }
  if (record.nextRetryAt && record.nextRetryAt.getTime() > Date.now()) {
    throw new APIError("FORBIDDEN", { message: "Provisioning retry backoff has not elapsed" });
  }

  try {
    if (!record.recipientUserId) throw new Error("Recipient user not recorded");
    return await attemptProvisioningRetry(record);
  } catch (error) {
    await scheduleRetry(record, error);
    const { rows: updated } = await db.query<{ state: ProvisioningState }>(
      `SELECT "state" FROM "invitation_provisioning" WHERE "id" = $1`,
      [record.id],
    );
    return updated[0]?.state ?? "retry_pending";
  }
}

async function attemptProvisioningRetry(record: ProvisioningRecord): Promise<ProvisioningState> {
  if (!record.recipientUserId) throw new Error("Recipient user not recorded");
  await assertInvitationStillAccepted(record);
  await activateProvisioning(record, record.recipientUserId);
  const db = await getDB();
  const { rows } = await db.query<{ state: ProvisioningState }>(
    `SELECT "state" FROM "invitation_provisioning" WHERE "id" = $1`,
    [record.id],
  );
  return rows[0]?.state ?? "retry_pending";
}

/** Process a bounded batch of eligible retries from a scheduled worker. */
export async function processDueProvisioningRetries(
  limit = 25,
): Promise<{ processed: number; active: number; failed: number }> {
  const batchSize = Math.max(1, Math.min(100, Math.floor(limit)));
  const db = await getDB();
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT * FROM "invitation_provisioning"
		 WHERE "recipient_user_id" IS NOT NULL AND "attempts" < "max_attempts"
		   AND (("state" = 'retry_pending' AND "next_retry_at" <= now())
		     OR ("state" = 'provisioning' AND "updated_at" < now() - interval '60 seconds'
		       AND EXISTS (SELECT 1 FROM "invitation" i WHERE i."id" = "invitation_id" AND i."status" = 'accepted')))
		 ORDER BY "next_retry_at" ASC
		 LIMIT $1`,
    [batchSize],
  );
  let active = 0;
  for (const row of rows) {
    const record = toRecord(row);
    try {
      if ((await attemptProvisioningRetry(record)) === "active") active += 1;
    } catch (error) {
      await scheduleRetry(record, error);
    }
  }
  return { processed: rows.length, active, failed: rows.length - active };
}

async function assertInvitationStillAccepted(
  record: ProvisioningRecord,
  client?: PoolClient,
): Promise<void> {
  const db = client ?? (await getDB());
  const { rows } = await db.query<{ status: string; expiresAt: Date | string }>(
    `SELECT "status", "expiresAt" FROM "invitation" WHERE "id" = $1 AND "organizationId" = $2`,
    [record.invitationId, record.organisationId],
  );
  const invitation = rows[0];
  if (!invitation || invitation.status !== "accepted" || !isFutureDate(invitation.expiresAt)) {
    throw new Error("Invitation was cancelled, expired, or is not accepted");
  }
}

/**
 * Cancel a pending provisioning (invitation cancelled/rejected, or inviter
 * withdrawing). Idempotent; never touches already-active access beyond
 * recording the event (§7.1: existing authorised access is not revoked
 * because an unrelated invitation is cancelled).
 */
export async function cancelProvisioning(params: {
  invitationId: string;
  organisationId: string;
  actorUserId: string | null;
  reason: string;
}): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [params.organisationId]);
    await client.query(
      `SELECT "id" FROM "invitation_provisioning"
			 WHERE "invitation_id" = $1 AND "organisation_id" = $2 FOR UPDATE`,
      [params.invitationId, params.organisationId],
    );
    await client.query(
      `UPDATE "invitation_provisioning"
			 SET "state" = 'cancelled', "updated_at" = now()
			 WHERE "invitation_id" = $1 AND "organisation_id" = $2
			   AND "state" IN ('pending_acceptance', 'provisioning', 'retry_pending')`,
      [params.invitationId, params.organisationId],
    );
    await client.query(
      `DELETE FROM "invitation_brand_grant" g
			 USING "invitation_provisioning" p
			 WHERE g."provisioning_id" = p."id"
			   AND p."invitation_id" = $1
			   AND p."state" = 'cancelled'`,
      [params.invitationId],
    );
    await writeAuditEvent(
      {
        organisationId: params.organisationId,
        actorUserId: params.actorUserId,
        action: "provisioning.cancelled",
        resourceType: "invitation",
        resourceId: params.invitationId,
        metadata: { reason: params.reason },
      },
      client,
    );
  });
}

/**
 * Reconciliation sweep for the plugin's partial state (B.2): invitations
 * marked accepted with no activated provisioning. Called from the
 * invitation-status surface; visible, idempotent, bounded.
 */
export async function reconcileAcceptedInvitation(
  invitationId: string,
  userId: string,
): Promise<void> {
  const record = await findProvisioningByInvitation(invitationId);
  if (!record || !["pending_acceptance", "provisioning"].includes(record.state)) return;
  try {
    const db = await getDB();
    const { rows } = await db.query<{
      id: string;
      email: string;
      userEmail: string;
      emailVerified: boolean;
      organizationId: string;
      status: string;
      expiresAt: Date | string;
    }>(
      `SELECT i."id", i."email", i."organizationId", i."status", i."expiresAt",
			       u."email" AS "userEmail", u."emailVerified"
			 FROM "invitation" i CROSS JOIN "user" u
			 WHERE i."id" = $1 AND u."id" = $2`,
      [invitationId, userId],
    );
    const accepted = rows[0];
    if (
      !accepted ||
      accepted.status !== "accepted" ||
      accepted.emailVerified !== true ||
      !isFutureDate(accepted.expiresAt)
    )
      return;
    await bindAcceptedRecipient(
      record,
      { ...accepted },
      { id: userId, email: accepted.userEmail, emailVerified: accepted.emailVerified },
      accepted.organizationId,
    );
    await activateProvisioning(record, userId);
  } catch (error) {
    await scheduleRetry(record, error);
  }
}

/** Owner-count re-validation for ownership flows (Appendix D.3). */
export async function assertNotLastOwner(
  organisationId: string,
  client?: PoolClient,
): Promise<void> {
  const owners = await countOrganisationOwners(organisationId, client);
  if (owners <= 1) {
    throw new APIError("BAD_REQUEST", {
      message: "Cannot remove the last owner of an organisation",
    });
  }
}
