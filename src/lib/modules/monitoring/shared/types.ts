export type CheckStatus = "operational" | "degraded" | "critical";

export type HealthCheckResult = {
  name: string;
  status: CheckStatus;
  latencyMs: number;
  error?: string;
};

export type InfrastructureHealthPayload = {
  overallStatus: CheckStatus;
  timestamp: string;
  latencyMs: number;
  checks: HealthCheckResult[];
  system?: {
    memory: { rssMb: number; heapUsedMb: number };
    cpu: { load1m: number; load5m: number; load15m: number };
    uptimeSec: number;
  };
};

