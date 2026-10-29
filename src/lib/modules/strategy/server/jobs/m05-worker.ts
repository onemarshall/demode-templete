import { createM05Service, type M05ServicePorts } from "../stages/m05/service";
import { m05GenerationSchema } from "../stages/m05/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M05_METHOD_KEYS = [
  "05-Brand-Strategy/05_01-Purpose.md",
  "05-Brand-Strategy/05_02-Vision.md",
  "05-Brand-Strategy/05_03-Values.md",
  "05-Brand-Strategy/05_04-Audience.md",
  "05-Brand-Strategy/05_05-Awareness.md",
  "05-Brand-Strategy/05_06-Personality.md",
  "05-Brand-Strategy/05_07-Voice.md",
  "05-Brand-Strategy/05_08-Attributes.md",
  "05-Brand-Strategy/05_09-Filter.md",
  "05-Brand-Strategy/05_10-Tagline.md",
  "05-Brand-Strategy/05_11-Visual-Identity.md",
  "05-Brand-Strategy/05_12-Copywriting.md",
  "05-Brand-Strategy/05_13-Brand-Story.md",
  "05-Brand-Strategy/05_14-Brand-Strategy.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M05ServicePorts["validateSource"];
  generate?: M05ServicePorts["generate"];
};

/** Stage-specific M05 generation and Gate 7 review over the shared SQL lease/publication runner. */
export function createM05Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M05 method release unavailable in this worker");
      for (const key of M05_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m05" || bindingStage !== "m05") throw new Error("Wrong M05 command binding");
      const command = m05GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M05 generation provider is not configured");

      const service = createM05Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m05")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
