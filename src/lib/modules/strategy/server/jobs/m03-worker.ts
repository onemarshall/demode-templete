import { createM03Service, type M03ServicePorts } from "../stages/m03/service";
import { m03DraftCommandSchema } from "../stages/m03/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M03_METHOD_KEYS = [
  "03-Business-Commitments/03-Prompt.md",
  "03-Business-Commitments/03_01-Conviction-Frontier.md",
  "03-Business-Commitments/03-Quality-Gates.md",
  "03-Business-Commitments/03-Handoff-Pack.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M03ServicePorts["validateSource"];
  generate?: M03ServicePorts["generate"];
};

/** Stage-specific M03 generation over the shared scoped SQL lease/publication runner. */
export function createM03Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M03 method release unavailable in this worker");
      for (const key of M03_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage, ...raw } = job.command;
      if (module !== "m03" || stage !== "m03") throw new Error("Wrong M03 command binding");
      const command = m03DraftCommandSchema.parse(raw);
      if (command.action !== "draft") throw new Error("M03 worker accepts draft commands only");
      if (!ports.generate) throw new Error("M03 generation provider is not configured");

      const service = createM03Service({
        repository: ports.repository,
        methodRelease: job.methodRelease,
        validateSource: ports.validateSource,
        generate: async (request) => {
          const generated = await ports.generate!(request);
          await beforePublish();
          return generated;
        },
      });
      return service.draft(scope, {
        sessionId: command.sessionId,
        expectedRevision: command.expectedRevision,
        commandId: command.commandId,
        action: command.action,
        step: command.step,
        jobLease: lease,
      });
    },
  });

  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      if ((await ports.jobs.moduleForJob(jobId)) !== "m03")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
