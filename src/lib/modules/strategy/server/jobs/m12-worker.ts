import { createM12Service, type M12ServicePorts } from "../stages/m12/service";
import { m12GenerationSchema } from "../stages/m12/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M12_METHOD_KEYS = [
  "12-Work-Coordination/12-Prompt.md",
  "12-Work-Coordination/12-Quality-Gates.md",
  "12-Work-Coordination/12-Strategy-Schema.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M12ServicePorts["validateSource"];
  generate?: M12ServicePorts["generate"];
};

export function createM12Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M12 method release unavailable in this worker");
      for (const key of M12_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m12" || bindingStage !== "m12") throw new Error("Wrong M12 command binding");
      const command = m12GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("Working Cycle generation provider is not configured");

      const service = createM12Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m12")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
