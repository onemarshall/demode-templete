import {
  recheckStrategyScope,
  grantStrategyPublication,
  revokeStrategyPublication,
  bindStrategyJobAttempt,
  type StrategyScope,
} from "../access";
import { StrategyJobs, StrategyLeaseLost, type DurableJob, type JobLease } from "../data/jobs";
export interface StrategyJobRunnerPorts {
  jobs: StrategyJobs;
  /** Must bind the persisted actor, current organisation membership and brand assignment.
   * The caller's task payload contains only a job ID, never a serialized scope.
   */
  authorize(job: DurableJob): Promise<StrategyScope>;
  /** Billable execution policy is independent of checkpoint mirror delivery. */
  policy(job: DurableJob, phase: "execute" | "publish"): Promise<void>;
  execute(
    scope: StrategyScope,
    job: DurableJob,
    lease: JobLease,
    beforePublish: () => Promise<void>,
  ): Promise<unknown>;
}
export function createStrategyJobRunner(ports: StrategyJobRunnerPorts) {
  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      const job = await ports.jobs.load(jobId);
      if (!job) throw new Error("Strategy job not found");
      if (job.status === "succeeded") return "succeeded";
      if (job.status === "cancelled" || job.status === "failed") return "unavailable";
      const scope = await ports.authorize(job);
      if (
        scope.actorId !== job.actorId ||
        scope.organisationId !== job.organisationId ||
        scope.brandId !== job.brandId ||
        scope.engagementId !== job.engagementId ||
        scope.action !== "generate"
      )
        throw new Error("Job authority binding mismatch");
      await ports.policy(job, "execute");
      const claimed = await ports.jobs.claim(scope, jobId);
      if (!claimed) {
        const latest = await ports.jobs.load(jobId);
        if (latest?.status === "succeeded") return "succeeded";
        if (latest?.status === "failed" || latest?.status === "cancelled") return "unavailable";
        // Returning normally here would acknowledge a retry while a crashed
        // attempt's lease is still live and strand the durable job afterwards.
        throw new Error("Strategy job is leased or awaiting its retry time");
      }
      const lease = { jobId, fence: claimed.fence };
      bindStrategyJobAttempt(scope, lease);
      let heartbeatFailure: unknown;
      let publicationChecked = false;
      const heartbeat = setInterval(() => {
        void ports.jobs.heartbeat(scope, lease).catch((error) => {
          heartbeatFailure = error;
        });
      }, 30_000);
      const beforePublish = async () => {
        if (heartbeatFailure) throw heartbeatFailure;
        await recheckStrategyScope(scope);
        await ports.policy(claimed.job, "publish");
        grantStrategyPublication(scope, lease);
        publicationChecked = true;
      };
      try {
        // execute must call beforePublish AFTER its provider completes but BEFORE the
        // repository mutation; that mutation must assertJobLease on the same lease.
        const result = await ports.execute(scope, claimed.job, lease, beforePublish);
        if (!publicationChecked) throw new Error("Job executor omitted publication policy check");
        if ((await ports.jobs.load(jobId))?.status === "succeeded") return "succeeded";
        await ports.jobs.complete(scope, lease, result);
        return "succeeded";
      } catch (error) {
        // Revoked users cannot write a fresh failure state. The lease expires and an
        // operator/reconciler sees the stranded job without publishing its result.
        try {
          await ports.jobs.fail(
            scope,
            lease,
            error instanceof Error ? error.name : "Job failed",
            null,
          );
        } catch (failure) {
          if (!(failure instanceof StrategyLeaseLost)) {
            /* host denial leaves durable recovery state */
          }
        }
        throw error;
      } finally {
        revokeStrategyPublication(scope, lease);
        clearInterval(heartbeat);
      }
    },
  };
}
