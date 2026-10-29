import { createM07Service, type M07ServicePorts } from "../stages/m07/service";
import { m07GenerationSchema } from "../stages/m07/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M07_METHOD_KEYS = [
  "07-Sales-Strategy/07-Prompt.md",
  "07-Sales-Strategy/07_01-Sales-Foundation.md",
  "07-Sales-Strategy/07_02-Belief-Readiness-Qualification.md",
  "07-Sales-Strategy/07_03-Sales-Narrative.md",
  "07-Sales-Strategy/07_04-Objection-Diagnosis.md",
  "07-Sales-Strategy/07_05-Claims-Boundaries.md",
  "07-Sales-Strategy/07_06-Transfer-Metrics.md",
  "07-Sales-Strategy/07_07-Implementation-Plan.md",
  "07-Sales-Strategy/07_10-Gap-Research-Framework.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M07ServicePorts["validateSource"];
  generate?: M07ServicePorts["generate"];
};

export function createM07Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M07 method release unavailable in this worker");
      for (const key of M07_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m07" || bindingStage !== "m07") throw new Error("Wrong M07 command binding");
      const command = m07GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M07 generation provider is not configured");

      const service = createM07Service({
        repository: ports.repository,
        methodRelease: job.methodRelease,
        validateSource: ports.validateSource,
        generate: async (request) => {
          const generated = await ports.generate!(request);
          await beforePublish();
          return generated;
        },
      });
      return command.action === "review"
        ? service.review(scope, { ...command, jobLease: lease })
        : service.draft(scope, { ...command, jobLease: lease });
    },
  });

  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      if ((await ports.jobs.moduleForJob(jobId)) !== "m07")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
