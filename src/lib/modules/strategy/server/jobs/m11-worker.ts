import { createM11Service, type M11ServicePorts } from "../stages/m11/service";
import { m11GenerationSchema } from "../stages/m11/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M11_METHOD_KEYS = [
  "11-Execution-Planning/11-Prompt.md",
  "11-Execution-Planning/11-Strategy-Schema.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M11ServicePorts["validateSource"];
  generate?: M11ServicePorts["generate"];
};

export function createM11Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M11 method release unavailable in this worker");
      for (const key of M11_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m11" || bindingStage !== "m11") throw new Error("Wrong M11 command binding");
      const command = m11GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("Commercial Cycle generation provider is not configured");

      const service = createM11Service({
        repository: ports.repository,
        methodRelease: job.methodRelease,
        validateSource: ports.validateSource,
        generate: async (request) => {
          const generated = await ports.generate!(request);
          await beforePublish();
          return generated;
        },
      });
      return service.draft(scope, { ...command, jobLease: lease });
    },
  });

  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      if ((await ports.jobs.moduleForJob(jobId)) !== "m11")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
