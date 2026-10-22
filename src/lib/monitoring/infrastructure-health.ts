/**
 * Infrastructure health probes.
 *
 * Measures the auth stack's real dependencies (database, Redis, geo
 * intelligence, CMS sync) instead of asserting their health. Shared by:
 * - `GET /api/system-health` (ops endpoint, fresh probes per request)
 * - the admin security dashboard SDK (cached, see `getDashboardSystemHealth`)
 */

import { logger } from "#lib/auth/shared/logger.js";
import { getServerEnv } from "#lib/auth/shared/env/index.js";
import { getDB } from "#lib/auth/server/database/db.js";
import { getSharedRedisClient } from "#lib/auth/shared/redis/index.js";
import { healthCheck as cmsHealthCheck } from "#lib/auth/server/cms/service.js";
import type { SystemHealthStatus } from "#lib/auth/security/services/dashboard-types.js";

export type CheckStatus = "operational" | "degraded" | "critical";

export interface InfrastructureCheck {
  name: string;
  status: CheckStatus;
  /** False when the dependency is optional and not configured for this deployment. */
  configured: boolean;
  latencyMs: number;
  error?: string;
}

export interface InfrastructureHealthResult {
  checks: InfrastructureCheck[];
  overallStatus: CheckStatus;
  latencyMs: number;
  measuredAt: number;
}

const CHECK_LABELS: Record<string, string> = {
  database: "Database",
  redis: "Redis",
  bigdatacloud: "Geo intelligence (BigDataCloud)",
  cms: "CMS sync",
};

const PROBE_TIMEOUT_MS = 2500;
const DASHBOARD_HEALTH_CACHE_TTL_MS = 30_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function raceWithTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS)),
  ]);
}

/**
 * Run every configured dependency probe once. Unconfigured optional
 * dependencies are reported as `configured: false` placeholders so callers can
 * distinguish "measured and failing" from "not part of this deployment".
 */
export async function runInfrastructureChecks(): Promise<InfrastructureHealthResult> {
  const startedAt = performance.now();
  const env = await getServerEnv();
  const checks: InfrastructureCheck[] = [];

  const dbStart = performance.now();
  try {
    const db = await getDB();
    await db.query("SELECT 1");
    checks.push({
      name: "database",
      status: "operational",
      configured: true,
      latencyMs: performance.now() - dbStart,
    });
  } catch (error) {
    logger.error("[SystemHealth] Database check failed", { error });
    checks.push({
      name: "database",
      status: "critical",
      configured: true,
      latencyMs: performance.now() - dbStart,
      error: errorMessage(error),
    });
  }

  const redisStart = performance.now();
  if (env.REDIS_URL) {
    try {
      const redis = await getSharedRedisClient("SystemHealth");
      await redis.ping();
      checks.push({
        name: "redis",
        status: "operational",
        configured: true,
        latencyMs: performance.now() - redisStart,
      });
    } catch (error) {
      logger.error("[SystemHealth] Redis check failed", { error });
      checks.push({
        name: "redis",
        status: "critical",
        configured: true,
        latencyMs: performance.now() - redisStart,
        error: errorMessage(error),
      });
    }
  } else {
    checks.push({
      name: "redis",
      status: "degraded",
      configured: false,
      latencyMs: 0,
      error: "not configured (using in-memory/postgres storage)",
    });
  }

  const bdcStart = performance.now();
  if (env.BIGDATACLOUD_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.bigdatacloud.net/data/client-ip", {
        method: "GET",
        signal: controller.signal,
        headers: { "X-Api-Key": String(env.BIGDATACLOUD_API_KEY) },
      });
      clearTimeout(timeout);
      checks.push({
        name: "bigdatacloud",
        status: res.ok ? "operational" : "degraded",
        configured: true,
        latencyMs: performance.now() - bdcStart,
        error: res.ok ? undefined : `status ${res.status}`,
      });
    } catch (error) {
      clearTimeout(timeout);
      logger.error("[SystemHealth] BigDataCloud check failed", { error });
      checks.push({
        name: "bigdatacloud",
        status: "critical",
        configured: true,
        latencyMs: performance.now() - bdcStart,
        error: errorMessage(error),
      });
    }
  } else {
    checks.push({
      name: "bigdatacloud",
      status: "degraded",
      configured: false,
      latencyMs: performance.now() - bdcStart,
      error: "BIGDATACLOUD_API_KEY not set",
    });
  }

  if (env.CMS_PROVIDER && env.CMS_PROVIDER !== "none") {
    const cmsStart = performance.now();
    try {
      const ok = await raceWithTimeout(cmsHealthCheck(), false);
      checks.push({
        name: "cms",
        status: ok ? "operational" : "critical",
        configured: true,
        latencyMs: performance.now() - cmsStart,
        error: ok ? undefined : `${env.CMS_PROVIDER} health check failed`,
      });
    } catch (error) {
      logger.error("[SystemHealth] CMS check failed", { error });
      checks.push({
        name: "cms",
        status: "critical",
        configured: true,
        latencyMs: performance.now() - cmsStart,
        error: errorMessage(error),
      });
    }
  }

  const overallStatus: CheckStatus = checks.some((check) => check.status === "critical")
    ? "critical"
    : checks.some((check) => check.status === "degraded")
      ? "degraded"
      : "operational";

  return {
    checks,
    overallStatus,
    latencyMs: performance.now() - startedAt,
    measuredAt: Date.now(),
  };
}

let dashboardHealthCache: { value: SystemHealthStatus | null; expiresAt: number } | null = null;

/**
 * Measured infrastructure health for the admin security dashboard.
 *
 * Probes are cached briefly because the dashboard auto-refreshes every 30
 * seconds. Returns `null` when no dependency is configured — the dashboard
 * then reports the source as not connected instead of inventing a status.
 */
export async function getDashboardSystemHealth(): Promise<SystemHealthStatus | null> {
  if (dashboardHealthCache && Date.now() < dashboardHealthCache.expiresAt) {
    return dashboardHealthCache.value;
  }

  const result = await runInfrastructureChecks();
  const measured = result.checks.filter((check) => check.configured);
  const failing = measured.filter((check) => check.status !== "operational");
  const overallStatus: SystemHealthStatus["overallStatus"] = measured.some(
    (check) => check.status === "critical",
  )
    ? "critical"
    : measured.some((check) => check.status === "degraded")
      ? "degraded"
      : "operational";

  const status: SystemHealthStatus | null =
    measured.length === 0
      ? null
      : {
          overallStatus,
          summary:
            failing.length === 0
              ? `${measured.length} infrastructure ${measured.length === 1 ? "check" : "checks"} measured; all operational.`
              : `${failing.length} of ${measured.length} infrastructure checks ${failing.length === 1 ? "needs" : "need"} attention.`,
          updatedAt: result.measuredAt,
          recommendations:
            failing.length > 0
              ? failing.map(
                  (check) =>
                    `Check ${CHECK_LABELS[check.name] ?? check.name}${check.error ? `: ${check.error}` : ""}.`,
                )
              : undefined,
          metrics: measured.map((check) => ({
            id: check.name,
            label: CHECK_LABELS[check.name] ?? check.name,
            value: Math.round(check.latencyMs),
            unit: "ms",
            status: check.status,
            description: check.error,
            updatedAt: result.measuredAt,
          })),
        };

  dashboardHealthCache = { value: status, expiresAt: Date.now() + DASHBOARD_HEALTH_CACHE_TTL_MS };
  return status;
}

export function clearInfrastructureHealthCache(): void {
  dashboardHealthCache = null;
}
