import { createM09Service, type M09ServicePorts } from "../stages/m09/service";
import { m09GenerationSchema } from "../stages/m09/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M09_METHOD_KEYS = [
  "09-Website-Architecture/09-Prompt.md",
  "09-Website-Architecture/09-Quality-Gates.md",
  "09-Website-Architecture/09-Strategy-Schema.md",
  "09-Website-Architecture/09_01-Site-Architecture.md",
  "09-Website-Architecture/09_02-Page-Briefs.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M09ServicePorts["validateSource"];
  generate?: M09ServicePorts["generate"];
};

export function createM09Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M09 method release unavailable in this worker");
      for (const key of M09_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m09" || bindingStage !== "m09") throw new Error("Wrong M09 command binding");
      const command = m09GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M09 generation provider is not configured");

      const service = createM09Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m09")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
