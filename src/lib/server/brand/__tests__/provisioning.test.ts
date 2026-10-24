import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  query,
  transactionQuery,
  withTransaction,
  findMembershipMock,
  countOrganisationMembersMock,
  authGetSession,
} = vi.hoisted(() => ({
  query: vi.fn(),
  transactionQuery: vi.fn(),
  withTransaction: vi.fn(),
  findMembershipMock: vi.fn(),
  countOrganisationMembersMock: vi.fn(),
  authGetSession: vi.fn(),
}));
vi.mock("#lib/auth.js", () => ({ auth: { api: { getSession: authGetSession } } }));
vi.mock("#lib/auth/server/database/db.js", () => ({
  getDB: async () => ({ query }),
  withTransaction,
}));
vi.mock("#lib/auth/shared/logger.js", () => ({ logger: { error: vi.fn() } }));
vi.mock("../audit.js", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("../better-auth-adapter.js", () => ({
  findMembership: findMembershipMock,
  countOrganisationMembers: countOrganisationMembersMock,
  countOrganisationOwners: vi.fn(),
}));

import {
  canGrantBrand,
  guardInvitationAcceptance,
  mapProvisioningRow,
  onInvitationAccepted,
  retryProvisioning,
} from "../provisioning.js";

const row = {
  id: "provisioning-1",
  invitation_id: "invitation-1",
  organisation_id: "org-1",
  recipient_email: "person@example.com",
  recipient_user_id: null,
  state: "pending_acceptance",
  idempotency_key: "invitation-1",
  attempts: 2,
  max_attempts: 5,
  next_retry_at: "2026-10-23T12:00:00.000Z",
  last_error: "temporary failure",
  created_by: "inviter-1",
};

describe("invitation provisioning", () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue({ rows: [row] });
    transactionQuery.mockReset().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "invitation_provisioning"')) return { rows: [row] };
      if (sql.includes('FROM "invitation"') && sql.includes("FOR SHARE")) {
        return {
          rows: [
            {
              email: "person@example.com",
              status: "pending",
              organizationId: "org-1",
              expiresAt: new Date(Date.now() + 60_000),
            },
          ],
        };
      }
      if (sql.includes("count(*)")) return { rows: [{ count: "0" }] };
      return { rows: [] };
    });
    withTransaction
      .mockReset()
      .mockImplementation(async (callback) => callback({ query: transactionQuery }));
    authGetSession.mockResolvedValue({ user: { id: "recipient-1" } });
    findMembershipMock.mockImplementation(async (userId: string) => ({
      id: `member-${userId}`,
      organizationId: "org-1",
      userId,
      role: userId === "inviter-1" ? "owner" : "member",
      createdAt: new Date(),
    }));
    countOrganisationMembersMock.mockResolvedValue(2);
  });

  it("maps PostgreSQL snake_case rows to the service record", () => {
    expect(mapProvisioningRow(row)).toEqual({
      id: "provisioning-1",
      invitationId: "invitation-1",
      organisationId: "org-1",
      recipientEmail: "person@example.com",
      recipientUserId: null,
      state: "pending_acceptance",
      idempotencyKey: "invitation-1",
      attempts: 2,
      maxAttempts: 5,
      nextRetryAt: new Date("2026-10-23T12:00:00.000Z"),
      lastError: "temporary failure",
      createdBy: "inviter-1",
    });
  });

  it("requires a verified session matching the pending invitation recipient", async () => {
    const input = {
      invitation: {
        id: "invitation-1",
        email: " PERSON@example.com ",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
        organizationId: "org-1",
      },
      user: { id: "recipient-1", email: "person@example.com", emailVerified: true },
      organization: { id: "org-1" },
    };

    await expect(guardInvitationAcceptance(input)).resolves.toBeUndefined();
    await expect(
      guardInvitationAcceptance({ ...input, user: { ...input.user, email: "other@example.com" } }),
    ).rejects.toThrow("Invitation recipient could not be verified");
    await expect(
      guardInvitationAcceptance({ ...input, user: { ...input.user, emailVerified: false } }),
    ).rejects.toThrow("Invitation recipient could not be verified");
    await expect(
      guardInvitationAcceptance({
        ...input,
        invitation: { ...input.invitation, status: "accepted" },
      }),
    ).rejects.toThrow("Invitation recipient could not be verified");
  });

  it("refuses expired or malformed invitation expiry values", async () => {
    const input = {
      invitation: {
        id: "invitation-1",
        email: "person@example.com",
        status: "pending",
        expiresAt: new Date(Date.now() - 60_000),
        organizationId: "org-1",
      },
      user: { id: "recipient-1", email: "person@example.com", emailVerified: true },
      organization: { id: "org-1" },
    };
    await expect(guardInvitationAcceptance(input)).rejects.toThrow("Invitation has expired");
    await expect(
      guardInvitationAcceptance({
        ...input,
        invitation: { ...input.invitation, expiresAt: "invalid" },
      }),
    ).rejects.toThrow("Invitation has expired");
  });

  it("does not treat organisation admin as brand grant authority", async () => {
    findMembershipMock.mockImplementation(async () => ({
      id: "org-member-1",
      organizationId: "org-1",
      userId: "admin-1",
      role: "admin",
      createdAt: new Date(),
    }));
    query.mockResolvedValue({ rows: [{ allowed: false }] });
    await expect(canGrantBrand("admin-1", "org-1", "brand-1")).resolves.toBe(false);
  });

  it("persists the accepted recipient before entering activation", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE "invitation_provisioning"'))
        return { rows: [{ id: "provisioning-1" }] };
      return { rows: [row] };
    });
    transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "invitation_provisioning"')) {
        return {
          rows: [
            {
              ...row,
              state: "provisioning",
              recipient_user_id: "recipient-1",
              next_retry_at: null,
              attempts: 0,
            },
          ],
        };
      }
      if (sql.includes('FROM "invitation"')) {
        return {
          rows: [
            {
              email: "person@example.com",
              organizationId: "org-1",
              status: "accepted",
              expiresAt: new Date(Date.now() + 60_000),
            },
          ],
        };
      }
      if (sql.includes('FROM "user"'))
        return { rows: [{ email: "person@example.com", emailVerified: true }] };
      if (sql.includes("invitation_brand_grant")) {
        return {
          rows: [
            {
              brandId: "brand-1",
              role: "editor",
              actualOrganisationId: "org-1",
              brandStatus: "active",
            },
          ],
        };
      }
      if (sql.includes("SELECT EXISTS") && sql.includes("brand_admin"))
        return { rows: [{ allowed: true }] };
      if (sql.includes("SELECT EXISTS")) return { rows: [{ active: false }] };
      if (sql.includes("count(*)")) return { rows: [{ count: "0" }] };
      return { rows: [] };
    });

    await onInvitationAccepted({
      invitation: {
        id: "invitation-1",
        email: "person@example.com",
        status: "accepted",
        expiresAt: new Date(Date.now() + 60_000),
        organizationId: "org-1",
        inviterId: "inviter-1",
      },
      member: { id: "org-member-1" },
      user: { id: "recipient-1", email: "person@example.com", emailVerified: true },
      organization: { id: "org-1" },
    });

    const recipientBindIndex = query.mock.calls.findIndex(([sql]) =>
      sql.includes('UPDATE "invitation_provisioning"'),
    );
    const activationLockIndex = transactionQuery.mock.calls.findIndex(([sql]) =>
      sql.includes("pg_advisory_xact_lock"),
    );
    expect(recipientBindIndex).toBeGreaterThanOrEqual(0);
    expect(activationLockIndex).toBeGreaterThanOrEqual(0);
    expect(query.mock.calls[recipientBindIndex]?.[1]).toEqual([
      "recipient-1",
      "provisioning-1",
      "invitation-1",
      "org-1",
      "person@example.com",
    ]);
  });
});

describe("provisioning status disclosure", () => {
  it("hides another recipient record just like an unknown record", async () => {
    authGetSession.mockResolvedValue({ user: { id: "recipient-1" } });
    findMembershipMock.mockResolvedValue(null);
    query.mockResolvedValueOnce({
      rows: [{ ...row, state: "active", recipient_user_id: "someone-else" }],
    });
    await expect(
      retryProvisioning({
        provisioningId: "known-private-id",
        actorUserId: "recipient-1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: "NOT_FOUND", body: { message: "Provisioning unavailable" } });
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      retryProvisioning({
        provisioningId: "unknown-id",
        actorUserId: "recipient-1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: "NOT_FOUND", body: { message: "Provisioning unavailable" } });
  });
});
