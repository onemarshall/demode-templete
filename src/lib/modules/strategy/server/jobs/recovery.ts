import { randomUUID } from "node:crypto";
import type { StrategyJobGateway } from "./gateway";
import type { StrategyJobs } from "../data/jobs";

/**
 * Recovery reads only durable job identifiers. A fresh delivery key is used
 * for every recovery dispatch, because Trigger may already have completed an
 * earlier run while the SQL lease/job still needs attention. Execution always
 * re-loads and re-authorizes the job through the normal worker.
 */
export function createStrategyRecovery(ports: {
  jobs: Pick<StrategyJobs, "recoverable">;
  gateway: StrategyJobGateway;
  limit?: number;
  /** The Trigger gateway is M04-specific; other stages remain for their own worker. */
  stage?: string;
}) {
  const stage = ports.stage ?? "m04";
  return {
    async dispatchRecoverable(): Promise<number> {
      const jobIds = await ports.jobs.recoverable(ports.limit ?? 50, stage);
      let dispatched = 0;
      const failures: unknown[] = [];
      for (const jobId of jobIds) {
        try {
          await ports.gateway.dispatch({
            jobId,
            idempotencyKey: `strategy-recovery:${jobId}:${randomUUID()}`,
          });
          dispatched += 1;
        } catch (error) {
          failures.push(new Error(`Recovery dispatch failed for ${jobId}`, { cause: error }));
        }
      }
      if (failures.length)
        throw new AggregateError(
          failures,
          `Recovery dispatch attempted ${jobIds.length} job(s); dispatched ${dispatched}, failed ${failures.length}`,
        );
      return dispatched;
    },
  };
}
