import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  redis: vi.fn(),
  env: vi.fn(),
  cms: vi.fn(),
}));

vi.mock("#lib/platform/database/db.js", () => ({ getDB: mocks.db }));
vi.mock("#lib/platform/redis/index.js", () => ({ getSharedRedisClient: mocks.redis }));
vi.mock("#lib/platform/config/server.server.js", () => ({ getServerEnv: mocks.env }));
vi.mock("#lib/platform/config/index.js", () => ({ getServerEnv: mocks.env }));
vi.mock("#lib/platform/cms/service.js", () => ({ healthCheck: mocks.cms }));

import {
  clearInfrastructureHealthCache,
  getDashboardSystemHealth,
  runInfrastructureChecks,
} from "../infrastructure-health.js";

function dbPool() {
  return { query: vi.fn().mockResolvedValue({ rows: [] }) };
}

function redisClient() {
  return { ping: vi.fn().mockResolvedValue("PONG") };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearInfrastructureHealthCache();
  mocks.env.mockResolvedValue({
    REDIS_URL: "redis://localhost:6379",
    BIGDATACLOUD_API_KEY: undefined,
    CMS_PROVIDER: "none",
  });
  mocks.db.mockResolvedValue(dbPool());
  mocks.redis.mockResolvedValue(redisClient());
  mocks.cms.mockResolvedValue(true);
});

describe("runInfrastructureChecks", () => {
  it("measures configured dependencies and marks unconfigured ones as placeholders", async () => {
    const result = await runInfrastructureChecks();
    const byName = new Map(result.checks.map((check) => [check.name, check]));
    expect(byName.get("database")).toMatchObject({ status: "operational", configured: true });
    expect(byName.get("redis")).toMatchObject({ status: "operational", configured: true });
    expect(byName.get("bigdatacloud")).toMatchObject({ status: "degraded", configured: false });
    expect(byName.get("cms")).toBeUndefined();
    expect(byName.get("database")?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports a failing probe as critical with its error", async () => {
    mocks.db.mockRejectedValue(new Error("Connection refused"));
    const result = await runInfrastructureChecks();
    const database = result.checks.find((check) => check.name === "database");
    expect(database).toMatchObject({ status: "critical", error: "Connection refused" });
    expect(result.overallStatus).toBe("critical");
  });

  it("probes the CMS only when a provider is configured", async () => {
    mocks.env.mockResolvedValue({
      REDIS_URL: undefined,
      BIGDATACLOUD_API_KEY: "key",
      CMS_PROVIDER: "directus",
    });
    const result = await runInfrastructureChecks();
    expect(mocks.cms).toHaveBeenCalledTimes(1);
    expect(result.checks.find((check) => check.name === "cms")).toMatchObject({
      status: "operational",
      configured: true,
    });
  });
});

describe("getDashboardSystemHealth", () => {
  it("maps only measured checks into the dashboard shape", async () => {
    const status = await getDashboardSystemHealth();
    expect(status?.overallStatus).toBe("operational");
    expect(status?.summary).toBe("2 infrastructure checks measured; all operational.");
    expect(status?.metrics.map((metric) => metric.id)).toEqual(["database", "redis"]);
    expect(status?.metrics[0]).toMatchObject({ unit: "ms", status: "operational" });
  });

  it("caches probes within the TTL", async () => {
    await getDashboardSystemHealth();
    await getDashboardSystemHealth();
    expect(mocks.db).toHaveBeenCalledTimes(1);
    clearInfrastructureHealthCache();
    await getDashboardSystemHealth();
    expect(mocks.db).toHaveBeenCalledTimes(2);
  });

  it("summarises failing checks with recommendations", async () => {
    mocks.redis.mockRejectedValue(new Error("Redis timeout"));
    const status = await getDashboardSystemHealth();
    expect(status?.overallStatus).toBe("critical");
    expect(status?.summary).toBe("1 of 2 infrastructure checks needs attention.");
    expect(status?.recommendations).toEqual(["Check Redis: Redis timeout."]);
  });
});
