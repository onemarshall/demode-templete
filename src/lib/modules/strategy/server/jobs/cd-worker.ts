import { createCDService, type CDServicePorts } from "../stages/cd/service";
import { cdGenerationSchema } from "../stages/cd/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const CD_METHOD_KEYS = [
  "framework/FW_24-Commercial-Direction-Contract.md",
  "11-Execution-Planning/11-Prompt.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: CDServicePorts["validateSource"];
  generate?: CDServicePorts["generate"];
};

export function createCDWorker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted CD method release unavailable in this worker");
      for (const key of CD_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "cd" || bindingStage !== "cd") throw new Error("Wrong CD command binding");
      const command = cdGenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("Commercial Direction generation provider is not configured");

      const service = createCDService({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "cd")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
