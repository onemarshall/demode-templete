import { query, getRequestEvent } from "$app/server";
import { auth } from "#lib/auth/server/config.js";
import { isAdminUser, type UserWithRoles } from "#lib/auth/shared/roles.js";
import { logger } from "#lib/auth/shared/logger.js";
import { emitSystemHealth } from "#lib/monitoring/apm.js";
import { runInfrastructureChecks } from "#lib/monitoring/infrastructure-health.js";
import * as os from "node:os";

type CheckStatus = "operational" | "degraded" | "critical";

type HealthCheckResult = {
  name: string;
  status: CheckStatus;
  latencyMs: number;
  error?: string;
};

export type InfrastructureHealthPayload = {
  overallStatus: CheckStatus;
  timestamp: string;
  latencyMs: number;
  checks: Array<{
    name: string;
    status: CheckStatus;
    latencyMs: number;
    error?: string;
  }>;
  system?: {
    memory: { rssMb: number; heapUsedMb: number };
    cpu: { load1m: number; load5m: number; load15m: number };
    uptimeSec: number;
  };
};

export const getInfrastructureHealth = query(async (): Promise<InfrastructureHealthPayload> => {
  const { request } = getRequestEvent();
  const startedAt = performance.now();

  // Detailed output (error messages, memory/CPU) leaks internals —
  // only expose it to admin sessions.
  let detailed = false;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    detailed = !!session?.user && isAdminUser(session.user as UserWithRoles);
  } catch {
    detailed = false;
  }

  const health = await runInfrastructureChecks();
  const checks: HealthCheckResult[] = health.checks.map((check) => ({
    name: check.name,
    status: check.status,
    latencyMs: check.latencyMs,
    ...(check.error ? { error: check.error } : {}),
  }));
  const overallStatus: CheckStatus = health.overallStatus;

  const [load1m = 0, load5m = 0, load15m = 0] = os.loadavg();

  // Internal payload — full detail for logging/APM (never sent to clients)
  const payload = {
    overallStatus,
    timestamp: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - startedAt),
    checks,
    system: {
      memory: {
        rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
      },
      cpu: {
        load1m: Math.round(load1m * 100) / 100,
        load5m: Math.round(load5m * 100) / 100,
        load15m: Math.round(load15m * 100) / 100,
      },
      uptimeSec: Math.round(process.uptime()),
    },
  };

  // Monitoring hook: log and emit to APM
  if (overallStatus !== "operational") {
    logger.warn("[SystemHealth] Degraded", payload);
  } else {
    logger.info("[SystemHealth] OK", { latencyMs: payload.latencyMs });
  }
  await emitSystemHealth(payload);

  // Response — error messages and system metrics only for admins
  return {
    overallStatus: payload.overallStatus,
    timestamp: payload.timestamp,
    latencyMs: payload.latencyMs,
    checks: checks.map((c) => ({
      name: c.name,
      status: c.status,
      latencyMs: Math.round(c.latencyMs),
      ...(detailed && c.error ? { error: c.error } : {}),
    })),
    ...(detailed ? { system: payload.system } : {}),
  };
});
