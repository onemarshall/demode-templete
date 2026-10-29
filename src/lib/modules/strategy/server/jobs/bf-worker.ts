import { createBFService, type BFServicePorts } from "../stages/bf/service";
import { bfGenerationSchema } from "../stages/bf/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const BF_METHOD_KEYS = [
  "bf-templates/Business-Definition-Input-Assessment-Template.md",
  "bf-templates/Business-Manifesto-Generator-Prompt.md",
  "bf-templates/Business-Foundation-Document-Generator-Prompt.md",
  "bf-templates/Business-Foundation-Document-Template.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: BFServicePorts["validateSource"];
  generate?: BFServicePorts["generate"];
};

/** Stage-specific BF generation over the shared scoped SQL lease/publication runner. */
export function createBFWorker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted BF method release unavailable in this worker");
      for (const key of BF_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "bf" || bindingStage !== "bf") throw new Error("Wrong BF command binding");
      const command = bfGenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("BF generation provider is not configured");

      const service = createBFService({
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
        ...command,
        jobLease: lease,
      });
    },
  });

  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      if ((await ports.jobs.moduleForJob(jobId)) !== "bf")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
