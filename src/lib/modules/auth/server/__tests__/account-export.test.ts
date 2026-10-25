import { configureAuthIntegrations } from '../integrations';
import { billingAuthPolicies } from '#lib/app/billing-auth-policy.server.js';
const configureTestIntegrations = () => configureAuthIntegrations({
  ...billingAuthPolicies,
  assertNoRetainedMemberships: async () => {},
  organizationHooks: {}, additionalPlugins: () => [], getDashboardSystemHealth: async () => null,
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  billingEnabled: false,
  getSession: vi.fn(),
  listUserAccounts: vi.fn(),
  listSessions: vi.fn(),
  query: vi.fn(),
  publicEnv: vi.fn(),
}));
vi.mock("../config.js", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
      listUserAccounts: mocks.listUserAccounts,
      listSessions: mocks.listSessions,
    },
  },
}));
vi.mock("#lib/platform/database/db.js", () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock("#lib/platform/config/index.js", () => ({ publicEnv: { get PUBLIC_CREEM_ENABLED() { return mocks.billingEnabled; } }, getPublicEnv: mocks.publicEnv }));

import { createAccountExport } from "../account-export";

const now = Date.parse("2026-10-22T12:00:00.000Z");

beforeEach(() => { configureTestIntegrations(); mocks.billingEnabled = false;
  vi.clearAllMocks();
  mocks.publicEnv.mockResolvedValue({ PUBLIC_CREEM_ENABLED: false });
  mocks.getSession.mockResolvedValue({
    user: {
      id: "user-a",
      name: "Alex",
      email: "alex@example.com",
      emailVerified: true,
      createdAt: new Date(now - 10_000),
      password: "must-not-export",
      secret: "private",
      twoFactorEnabled: true,
    },
    session: { id: "session-a", createdAt: new Date(now - 10_000) },
  });
  mocks.listUserAccounts.mockResolvedValue([
    {
      providerId: "google",
      accountId: "google-123",
      createdAt: new Date(now),
      accessToken: "token",
      refreshToken: "refresh",
      password: "hash",
    },
  ]);
  mocks.listSessions.mockResolvedValue([
    {
      id: "session-a",
      userId: "user-a",
      createdAt: new Date(now),
      expiresAt: new Date(now + 100_000),
      ipAddress: "127.0.0.1",
      userAgent: "Browser",
      token: "session-token",
    },
  ]);
  mocks.query.mockResolvedValue({
    rows: [
      {
        productId: "pro",
        status: "active",
        periodStart: new Date(now),
        periodEnd: new Date(now + 100_000),
        cancelAtPeriodEnd: false,
        creemSubscriptionId: "private-provider-id",
      },
    ],
  });
});

describe("account data export", () => {
  it("exports allowlisted data for only the authenticated account", async () => {
    const result = await createAccountExport(new Headers(), now);
    expect(result.profile).toEqual({
      id: "user-a",
      name: "Alex",
      email: "alex@example.com",
      emailVerified: true,
      createdAt: new Date(now - 10_000).toISOString(),
      twoFactorEnabled: true,
    });
    expect(result.linkedAccounts).toEqual([
      {
        providerId: "google",
        accountId: "google-123",
        createdAt: new Date(now).toISOString(),
        updatedAt: null,
      },
    ]);
    expect(result.sessions).toEqual([
      {
        id: "session-a",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 100_000).toISOString(),
        ipAddress: "127.0.0.1",
        userAgent: "Browser",
        updatedAt: null,
        isCurrent: true,
      },
    ]);
    expect(result.subscriptions).toEqual([
      {
        productId: "pro",
        status: "active",
        cancelAtPeriodEnd: false,
        periodStart: new Date(now).toISOString(),
        periodEnd: new Date(now + 100_000).toISOString(),
      },
    ]);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "referenceId" = $1'), [
      "user-a",
      101,
    ]);
    const serialized = JSON.stringify(result);
    for (const secret of [
      "must-not-export",
      "private",
      "token",
      "refresh",
      "hash",
      "session-token",
      "private-provider-id",
    ])
      expect(serialized).not.toContain(secret);
    expect(result.scope).toContain("connected providers");
    expect(result.scope).toContain("Activity history");
    expect(result.limits).toMatchObject({
      linkedAccounts: { limit: 50, truncated: false },
      sessions: { limit: 100, truncated: false },
      subscriptions: { limit: 100, truncated: false },
    });
  });

  it("rejects missing or stale authentication before reading user records", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    await expect(createAccountExport(new Headers(), now)).rejects.toMatchObject({ status: 401 });
    mocks.getSession.mockResolvedValueOnce({
      user: { id: "user-a" },
      session: { id: "session-a", createdAt: new Date(now - 3_600_001) },
    });
    await expect(createAccountExport(new Headers(), now)).rejects.toMatchObject({ status: 403 });
    expect(mocks.listUserAccounts).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("never requests broad database rows and bounds exported collections", async () => {
    mocks.listUserAccounts.mockResolvedValue(
      Array.from({ length: 55 }, (_, i) => ({ providerId: `provider-${i}`, accountId: `${i}` })),
    );
    mocks.listSessions.mockResolvedValue(
      Array.from({ length: 105 }, (_, i) => ({ id: `${i}`, createdAt: new Date(now) })),
    );
    const result = await createAccountExport(new Headers(), now);
    expect(result.linkedAccounts as unknown[]).toHaveLength(50);
    expect(result.sessions as unknown[]).toHaveLength(100);
    expect(result.limits).toMatchObject({
      linkedAccounts: { truncated: true },
      sessions: { truncated: true },
      subscriptions: { truncated: false },
    });
    expect(mocks.query.mock.calls[0][0]).toContain('SELECT "productId", status');
    expect(mocks.query.mock.calls[0][0]).not.toMatch(/SELECT\s+\*/i);
    expect(mocks.query.mock.calls[0][0]).not.toMatch(/createdAt|updatedAt/);
    expect(mocks.query.mock.calls[0][0]).toContain(
      'ORDER BY "periodStart" DESC NULLS LAST, id DESC',
    );
    expect(mocks.query.mock.calls[0][1]).toEqual(["user-a", 101]);
  });

  it("tolerates a missing subscription table only when billing is disabled", async () => {
    mocks.query.mockRejectedValueOnce(Object.assign(new Error("missing table"), { code: "42P01" }));
    const result = await createAccountExport(new Headers(), now);
    expect(result.subscriptions).toEqual([]);

    mocks.billingEnabled = true;
    mocks.publicEnv.mockResolvedValue({ PUBLIC_CREEM_ENABLED: true });
    mocks.query.mockRejectedValueOnce(Object.assign(new Error("missing table"), { code: "42P01" }));
    await expect(createAccountExport(new Headers(), now)).rejects.toThrow("missing table");
  });

  it("does not hide database failures unrelated to an absent optional table", async () => {
    mocks.query.mockRejectedValueOnce(
      Object.assign(new Error("database unavailable"), { code: "08006" }),
    );
    await expect(createAccountExport(new Headers(), now)).rejects.toThrow("database unavailable");
  });

  it("reports subscription truncation when there are more than the export limit", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: Array.from({ length: 101 }, () => ({ productId: "pro", status: "active" })),
    });
    const result = await createAccountExport(new Headers(), now);
    expect(result.subscriptions as unknown[]).toHaveLength(100);
    expect(result.limits).toMatchObject({ subscriptions: { limit: 100, truncated: true } });
  });
});
