import { createM08Service, type M08ServicePorts } from "../stages/m08/service";
import { m08GenerationSchema } from "../stages/m08/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M08_METHOD_KEYS = [
  "08-Content-Strategy/08-Prompt.md",
  "08-Content-Strategy/08-Strategy-Schema.md",
  "08-Content-Strategy/08B-Content-Generator.md",
  "08-Content-Strategy/08_02-Brand-Derived-Pillars.md",
  "08-Content-Strategy/08_03-Proof-Hierarchy.md",
  "08-Content-Strategy/08_04-Proof-Gap-Analysis.md",
  "08-Content-Strategy/08_05-Content-to-Objection-Map.md",
  "08-Content-Strategy/08_06-Claims-Boundaries-for-Content.md",
  "08-Content-Strategy/08_07-Proof-Distribution-Channels.md",
  "08-Content-Strategy/08_09-Proof-Metrics-Transfer-Indicators.md",
  "08-Content-Strategy/08_10-Production-Process.md",
  "08-Content-Strategy/08_11-Resources-Constraints.md",
  "08-Content-Strategy/08_12-Claims-Compliance-Review.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M08ServicePorts["validateSource"];
  generate?: M08ServicePorts["generate"];
};

export function createM08Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M08 method release unavailable in this worker");
      for (const key of M08_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m08" || bindingStage !== "m08") throw new Error("Wrong M08 command binding");
      const command = m08GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M08 generation provider is not configured");

      const service = createM08Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m08")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
