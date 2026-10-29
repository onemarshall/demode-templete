import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";
/** Node composition supplies current identity/permission/billing and provider ports.
 * There is deliberately no environment-derived admin or serialized-scope fallback.
 */
export function createM04Worker(ports: StrategyJobRunnerPorts) {
  return createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted method release unavailable in this worker");
      loadStrategyMethod("04-Viability-Check/04-Prompt.md", job.methodRelease);
      return ports.execute(scope, job, lease, beforePublish);
    },
  });
}
let configured: ReturnType<typeof createM04Worker> | undefined;
export function configureM04Worker(ports: StrategyJobRunnerPorts): void {
  if (configured) throw new Error("M04 worker already configured");
  configured = createM04Worker(ports);
}
export async function runConfiguredM04Job(jobId: string) {
  if (!configured)
    throw new Error("Trusted Strategy worker authority and billing adapters are not configured");
  return configured.run(jobId);
}
