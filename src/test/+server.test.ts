import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInfrastructureHealth } from "#lib/remote/monitoring.remote.js";

const { mockQuery, mockPing, mockFetch } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockPing: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("$app/server", () => ({
  query: (handler: object) => Object.assign(handler, { __: { type: "query" } }),
  getRequestEvent: vi.fn().mockReturnValue({
    request: new Request("http://localhost:7101/_app/remote/monitoring", {
      method: "POST",
      headers: { cookie: "" },
    }),
  }),
}));

vi.mock("#lib/auth/shared/env/index.js", async () => {
  // Reuse the shared env mock's full export set ($test → src/test alias),
  // then override getServerEnv to inject the BDC key this test asserts on.
  const actual = await import("$test/mocks/env");
  return {
    ...actual,
    getServerEnv: vi.fn().mockImplementation(async () => ({
      ...(await actual.getServerEnv()),
      REDIS_URL: "redis://localhost:6379",
      BIGDATACLOUD_API_KEY: "test-key",
    })),
  };
});
vi.mock("#lib/auth/server/database/db.js", () => ({
  getDB: vi.fn().mockResolvedValue({ query: mockQuery }),
}));

vi.mock("#lib/auth/shared/redis/index.js", () => ({
  getSharedRedisClient: vi.fn().mockResolvedValue({ ping: mockPing }),
}));

vi.mock("#lib/monitoring/apm.js", () => ({
  emitSystemHealth: vi.fn().mockResolvedValue(undefined),
}));

// The query resolves an optional session for admin-only detail.
// Mock the config module so the real Better Auth instance (and its
// Postgres adapter) never initializes in this unit test.
vi.mock("#lib/auth/server/config.js", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

global.fetch = mockFetch as unknown as typeof fetch;

describe("getInfrastructureHealth remote query", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPing.mockReset();
    mockFetch.mockReset();
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    mockPing.mockResolvedValueOnce("PONG");
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));
  });

  it("returns operational when dependencies are healthy", async () => {
    const body = await (
      getInfrastructureHealth as unknown as () => Promise<{
        overallStatus: string;
        checks: Array<{ name: string; status: string }>;
      }>
    )();

    expect(body.overallStatus).toBe("operational");
    expect(body.checks.map((c) => c.status)).toContain("operational");
  });

  it("returns critical when database check fails", async () => {
    mockQuery.mockReset();
    mockQuery.mockRejectedValueOnce(new Error("db down"));
    mockPing.mockResolvedValueOnce("PONG");
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const body = await (
      getInfrastructureHealth as unknown as () => Promise<{
        overallStatus: string;
        checks: Array<{ name: string; status: string }>;
      }>
    )();

    expect(body.overallStatus).toBe("critical");
    const dbCheck = body.checks.find((c) => c.name === "database");
    expect(dbCheck?.status).toBe("critical");
  });
});
