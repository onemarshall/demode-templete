import { Pool } from "pg";
import { createStrategyAccess } from "../../../src/lib/modules/strategy/server/access";
import { StrategyJobs } from "../../../src/lib/modules/strategy/server/data/jobs";
import { StrategyRepository } from "../../../src/lib/modules/strategy/server/data/repository";
import { createStrategyJobRunner } from "../../../src/lib/modules/strategy/server/jobs/runner";
import { readConnection } from "./local-stack";

const [schema, jobId, mode = "before-publish"] = process.argv.slice(2);
if (!schema || !jobId || !/^strategy_m04_recovery_[a-f0-9]+$/.test(schema)) {
  throw new Error("Expected isolated schema and job ID");
}
if (mode !== "before-publish" && mode !== "after-commit") {
  throw new Error("Unknown interruption mode");
}
const config = await readConnection();
const pool = new Pool({
  connectionString: config.databaseUrl,
  options: `-c search_path=${schema}`,
});
const jobs = new StrategyJobs(pool);
const repository = new StrategyRepository(pool);
const runner = createStrategyJobRunner({
  jobs,
  authorize: async (job) => {
    const access = createStrategyAccess(async (request) => ({
      actorId: job.actorId,
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: [request.action],
    }));
    return access.authorize({
      organisationId: job.organisationId,
      brandId: job.brandId,
      engagementId: job.engagementId,
      action: "generate",
    });
  },
  policy: async () => undefined,
  execute: async (scope, job, lease, beforePublish) => {
    if (mode === "before-publish") {
      // The parent kills this process after observing the claim. This fixture
      // pauses at execute entry, before simulating any provider response or publish.
      process.stdout.write("CLAIMED_BEFORE_PUBLISH\n");
      await new Promise<never>(() => undefined);
    }
    const generated = { viability: "synthetic-committed", source: "local-provider-stub" };
    await beforePublish();
    await repository.mutateSession(
      scope,
      job.sessionId,
      job.expectedRevision,
      job.commandId,
      async (_current, tx) => {
        await tx.assertJobLease(job.id, lease.fence);
        return {
          payload: generated,
          outbox: [{ kind: "m04.checkpoint", payload: { stage: "context", jobId: job.id } }],
        };
      },
      job.command,
    );
    if (mode === "after-commit") {
      // The fenced session revision, checkpoint outbox event, and succeeded job
      // state have committed. Pause before execute returns to the task runner.
      process.stdout.write("COMMITTED_BEFORE_ACK\n");
      await new Promise<never>(() => undefined);
    }
    return generated;
  },
});

try {
  await runner.run(jobId);
} finally {
  await pool.end();
}
