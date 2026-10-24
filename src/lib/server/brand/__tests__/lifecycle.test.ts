import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMembership: vi.fn(),
  membershipHasRole: vi.fn(),
  countOrganisationOwners: vi.fn(),
  withTransaction: vi.fn(),
  getDB: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
vi.mock("#lib/auth/server/database/db.js", () => ({
  getDB: mocks.getDB,
  withTransaction: mocks.withTransaction,
}));
vi.mock("../better-auth-adapter.js", () => ({
  findMembership: mocks.findMembership,
  membershipHasRole: mocks.membershipHasRole,
  countOrganisationOwners: mocks.countOrganisationOwners,
}));
vi.mock("../audit.js", () => ({ writeAuditEvent: mocks.writeAuditEvent }));

import {
  removeOrganisationMember,
  transferOwnership,
  assertNoRetainedMemberships,
} from "../lifecycle.js";

interface MemberRow {
  id: string;
  userId: string;
  role: string;
}
const members = new Map<string, MemberRow>();
const lockTails = new Map<string, Promise<void>>();

async function acquire(key: string): Promise<() => void> {
  const previous = lockTails.get(key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  lockTails.set(key, current);
  await previous;
  return () => {
    releaseCurrent();
    if (lockTails.get(key) === current) lockTails.delete(key);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  members.clear();
  lockTails.clear();
  mocks.findMembership.mockImplementation(async (userId: string) => {
    const row = members.get(userId);
    return row ? { ...row, organizationId: "org-1" } : null;
  });
  mocks.membershipHasRole.mockImplementation((membership: { role: string }, role: string) =>
    membership.role
      .split(",")
      .map((value) => value.trim())
      .includes(role),
  );
  mocks.countOrganisationOwners.mockImplementation(
    async () =>
      [...members.values()].filter(({ role }) =>
        role
          .split(",")
          .map((value) => value.trim())
          .includes("owner"),
      ).length,
  );
  mocks.writeAuditEvent.mockResolvedValue(undefined);
  mocks.withTransaction.mockImplementation(
    async (
      callback: (client: {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
      }) => Promise<unknown>,
    ) => {
      let releaseLock: (() => void) | undefined;
      const client = {
        query: async (sql: string, params: unknown[] = []) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            releaseLock = await acquire(String(params[0]));
            return { rows: [] };
          }
          if (sql.includes('SELECT "emailVerified"')) return { rows: [{ emailVerified: true }] };
          if (sql.startsWith('UPDATE "member" SET "role"')) {
            const row = [...members.values()].find((member) => member.id === params[1]);
            if (row) row.role = String(params[0]);
            return { rows: [] };
          }
          if (sql.startsWith('DELETE FROM "member"')) {
            const row = [...members.values()].find((member) => member.id === params[0]);
            if (row) members.delete(row.userId);
            return { rows: [] };
          }
          return { rows: [] };
        },
      };
      try {
        return await callback(client);
      } finally {
        releaseLock?.();
      }
    },
  );
});

function addMember(userId: string, role: string) {
  members.set(userId, { id: `membership-${userId}`, userId, role });
}

function actor(userId: string) {
  return { userId, organisationId: "org-1", sessionCreatedAt: new Date(), targetUserId: userId };
}

describe("organisation lifecycle invariants", () => {
  it("transfers ownership to a verified current member and audits the transfer", async () => {
    addMember("owner-1", "owner");
    addMember("member-2", "member");
    await transferOwnership({
      userId: "owner-1",
      organisationId: "org-1",
      targetUserId: "member-2",
      sessionCreatedAt: new Date(),
      confirmation: "TRANSFER",
      reason: "Planned succession",
    });
    expect(members.get("member-2")?.role).toBe("owner");
    expect(members.get("owner-1")?.role).toBe("admin");
    expect(mocks.countOrganisationOwners).toHaveBeenCalledWith("org-1", expect.anything());
    expect(mocks.writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "organisation.ownership_transferred",
        metadata: expect.objectContaining({
          targetUserId: "member-2",
          reason: "Planned succession",
        }),
      }),
      expect.anything(),
    );
  });

  it("prevents the last owner from leaving or being removed", async () => {
    addMember("owner-1", "owner");
    await expect(removeOrganisationMember(actor("owner-1"))).rejects.toThrow(/last owner/i);
    expect(members.has("owner-1")).toBe(true);
    expect(mocks.writeAuditEvent).not.toHaveBeenCalled();
  });

  it("serializes concurrent owner departures so one owner always remains", async () => {
    addMember("owner-1", "owner");
    addMember("owner-2", "owner");
    const results = await Promise.allSettled([
      removeOrganisationMember(actor("owner-1")),
      removeOrganisationMember(actor("owner-2")),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect([...members.values()].filter(({ role }) => role === "owner")).toHaveLength(1);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(2);
  });
});

describe("retained tenancy account deletion guard", () => {
  it("blocks retained memberships even while tenancy routes are disabled", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ installed: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    mocks.getDB.mockResolvedValue({ query });
    await expect(assertNoRetainedMemberships("owner")).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('"userId" = $1'), ["owner"]);
  });
  it("permits installations without tenancy and departed members", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ installed: false }] })
      .mockResolvedValueOnce({ rows: [{ installed: true }] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.getDB.mockResolvedValue({ query });
    await expect(assertNoRetainedMemberships("user")).resolves.toBeUndefined();
    await expect(assertNoRetainedMemberships("former-member")).resolves.toBeUndefined();
  });
  it("fails closed with an actionable response when obligations cannot be checked", async () => {
    mocks.getDB.mockRejectedValue(new Error("unavailable"));
    await expect(assertNoRetainedMemberships("user")).rejects.toMatchObject({
      status: "SERVICE_UNAVAILABLE",
    });
  });
});
