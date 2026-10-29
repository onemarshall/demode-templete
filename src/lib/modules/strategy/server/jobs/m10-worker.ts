import { createM10Service, type M10ServicePorts } from "../stages/m10/service";
import { m10GenerationSchema } from "../stages/m10/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M10_METHOD_KEYS = [
  "10-Visual-Identity/10-Prompt.md",
  "10-Visual-Identity/10-Quality-Gates.md",
  "10-Visual-Identity/10-Strategy-Schema.md",
  "10-Visual-Identity/10-Visual-Style-Framework.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M10ServicePorts["validateSource"];
  generate?: M10ServicePorts["generate"];
};

export function createM10Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M10 method release unavailable in this worker");
      for (const key of M10_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m10" || bindingStage !== "m10") throw new Error("Wrong M10 command binding");
      const command = m10GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M10 generation provider is not configured");

      const service = createM10Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m10")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
