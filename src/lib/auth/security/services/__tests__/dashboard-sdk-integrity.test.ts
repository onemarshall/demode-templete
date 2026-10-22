import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SecurityAnalyticsEvent } from "../../analytics/collector";

const mocks = vi.hoisted(() => ({
  events: vi.fn(),
  blockedIPs: vi.fn(),
  db: vi.fn(),
  health: vi.fn(),
}));
vi.mock("#lib/auth.js", () => ({ auth: { api: {} } }));
vi.mock("#lib/auth/server/database/index.js", () => ({ getDB: mocks.db }));
vi.mock("#lib/monitoring/infrastructure-health.js", () => ({
  getDashboardSystemHealth: mocks.health,
  clearInfrastructureHealthCache: vi.fn(),
}));
vi.mock("../blocked-ips", () => ({ getBlockedIPs: mocks.blockedIPs }));
vi.mock("../../analytics", async () => ({
  ...(await import("../../analytics/metrics")),
  getDefaultCollector: () => ({ getRecentEvents: mocks.events }),
}));
vi.mock("../dashboard-config", () => ({
  createSecurityDashboardConfig: (config: object) => ({
    baseUrl: "https://example.test",
    environment: "production",
    ...config,
  }),
  API_ENDPOINTS: { BLOCK_IP: "/block", UNBLOCK_IP: "/unblock" },
  COOKIE_PATTERNS: [],
  twoFactorAdoptionStatsSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
}));
import { securityConfig } from "../../config";
import { SecurityDashboardSDK } from "../sdk";

const context = {
  user: { id: "admin" },
  sessionToken: "",
  cookies: "",
  headers: {},
  isAdmin: true,
  isDev: false,
};
const event = (overrides: Partial<SecurityAnalyticsEvent> = {}): SecurityAnalyticsEvent => ({
  id: "event",
  type: "auth_failure",
  timestamp: Date.now(),
  ip: "192.0.2.1",
  path: "/auth",
  method: "POST",
  riskScore: 80,
  riskLevel: "critical",
  blocked: true,
  captchaRequired: false,
  rateLimited: false,
  factors: ["vpn"],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.blockedIPs.mockResolvedValue({ ips: [], total: 0 });
  mocks.db.mockRejectedValue(new Error("Unavailable"));
  mocks.health.mockResolvedValue(null);
});

describe("SDK coverage and provenance", () => {
  it("discloses the retrieval cap and does not fabricate device, MFA or location data", async () => {
    mocks.events.mockResolvedValue(
      Array.from({ length: 200 }, (_, i) =>
        event({ id: String(i), sessionId: "real-session", metadata: { secret: "do-not-expose" } }),
      ),
    );
    const data = await new SecurityDashboardSDK().loadDashboardData(context);
    expect(data.coverage).toMatchObject({
      sampleLimit: 200,
      sampleSize: 200,
      limitReached: true,
      completeness: "recent-sample",
      timezone: "UTC",
    });
    expect(data.coverage?.sources).toMatchObject({
      events: "available",
      twoFactor: "unavailable",
      devices: "not-connected",
      systemHealth: "not-connected",
    });
    expect(data.devices).toBeNull();
    expect(data.systemHealth).toBeNull();
    expect(data.authStats?.twoFactorAdoptionRate).toBeNull();
    expect(data.authStats?.totalUsersCount).toBeNull();
    expect(data.sessions?.[0]?.sourceEventId).toBe("0");
    expect(data.sessions?.[0]?.countryCode).toBeUndefined();
    expect(data.events?.[0]).not.toHaveProperty("metadata");
  });

  it("reports measured infrastructure health and marks the source available", async () => {
    mocks.events.mockResolvedValue([event()]);
    mocks.health.mockResolvedValue({
      overallStatus: "operational",
      summary: "2 infrastructure checks measured; all operational.",
      updatedAt: Date.now(),
      metrics: [
        {
          id: "database",
          label: "Database",
          value: 3,
          unit: "ms",
          status: "operational",
          updatedAt: Date.now(),
        },
        {
          id: "redis",
          label: "Redis",
          value: 1,
          unit: "ms",
          status: "operational",
          updatedAt: Date.now(),
        },
      ],
    });
    const data = await new SecurityDashboardSDK().loadDashboardData(context);
    expect(data.coverage?.sources.systemHealth).toBe("available");
    expect(data.systemHealth?.metrics.map((metric) => metric.id)).toEqual(["database", "redis"]);
    expect(data.apiStatus?.systemHealth).toBe(200);
  });

  it("exposes the running escalation policy and derives automation actions from recorded events", async () => {
    mocks.events.mockResolvedValue([
      event({ id: "blocked-1", blocked: true, captchaRequired: false, rateLimited: false, timestamp: Date.now() - 1000 }),
      event({ id: "captcha-1", blocked: false, captchaRequired: true, rateLimited: false, riskScore: 45, path: "/sign-up", ip: "192.0.2.10" }),
      event({ id: "clean-1", blocked: false, captchaRequired: false, rateLimited: false, riskScore: 5, path: "/", ip: "192.0.2.11" }),
    ]);
    const data = await new SecurityDashboardSDK().loadDashboardData(context);

    // The policy must describe the running build's real config, not invented values.
    expect(data.escalationPolicy?.tunable).toBe(false);
    expect(data.escalationPolicy?.rules.find((rule) => rule.id === "risk-block")?.trigger).toContain(
      String(securityConfig.abuse.maxRiskScore),
    );
    expect(data.escalationPolicy?.rules.some((rule) => rule.id === "temp-block")).toBe(true);

    // Feed is derived from the same snapshot: blocked first (newest), clean excluded.
    expect(data.automationActions.map((entry) => entry.id)).toEqual(["auto:captcha-1", "auto:blocked-1"]);
    expect(data.automationActions[0]?.label).toBe("Captcha challenge issued");
    expect(data.automationActions[1]?.label).toBe("Request blocked");
  });

  it("filters every calculation to the same period and reports partial source failures", async () => {
    mocks.events.mockResolvedValue([
      event(),
      event({ timestamp: Date.now() - 90000000, sessionId: "old-session" }),
    ]);
    mocks.blockedIPs.mockResolvedValue({ ips: [], error: "Unavailable" });
    const data = await new SecurityDashboardSDK().loadDashboardData(context);
    expect(data.coverage?.sources.blockedIPs).toBe("unavailable");
    expect(data.metrics?.summary.totalRequests).toBe(1);
    expect(data.authStats?.failureCount).toBe(1);
    expect(data.activeSessionsCount).toBe(0);
    expect(data.sessions).toEqual([]);
    expect(data.events).toHaveLength(1);
  });

  it("does not stamp failed refreshes as successfully updated", async () => {
    mocks.events.mockRejectedValue(new Error("Collector unavailable"));
    const data = await new SecurityDashboardSDK().loadDashboardData(context);
    expect(data.error).toBe("Collector unavailable");
    expect(data.lastUpdated).toBeUndefined();
    expect(data.metrics).toBeNull();
  });
});

describe("SDK security action outcomes", () => {
  it("does not report HTTP failures as a successful block", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Forbidden", { status: 403 }));
    try {
      const result = await new SecurityDashboardSDK().blockIp("192.0.2.1", context);
      expect(result.success).toBe(false);
    } finally {
      fetcher.mockRestore();
    }
  });

  it("does not report an explicit backend failure as a successful unblock", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ success: false, error: "Unblock failed" }));
    try {
      const result = await new SecurityDashboardSDK().unblockIp("192.0.2.1", context);
      expect(result.success).toBe(false);
    } finally {
      fetcher.mockRestore();
    }
  });

  it("preserves successful action responses", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ success: true }));
    try {
      const result = await new SecurityDashboardSDK().blockIp("192.0.2.1", context);
      expect(result.success).toBe(true);
    } finally {
      fetcher.mockRestore();
    }
  });
});

it("retains critical evidence beyond the first twenty observations and prioritises flagged sessions", async () => {
  mocks.events.mockResolvedValue([
    ...Array.from({ length: 25 }, (_, index) =>
      event({
        id: `medium-${index}`,
        sessionId: `session-${index}`,
        riskScore: 40,
        riskLevel: "medium",
      }),
    ),
    event({
      id: "critical-later",
      sessionId: "critical-session",
      riskScore: 95,
      riskLevel: "critical",
    }),
  ]);
  const data = await new SecurityDashboardSDK().loadDashboardData(context);
  expect(data.threatFeed).toHaveLength(26);
  expect(data.threatFeed.some((entry) => entry.id === "critical-later")).toBe(true);
  expect(data.sessions?.[0]?.sourceEventId).toBe("critical-later");
});
