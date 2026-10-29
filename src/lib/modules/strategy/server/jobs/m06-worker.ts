import { createM06Service, type M06ServicePorts } from "../stages/m06/service";
import { m06GenerationSchema } from "../stages/m06/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M06_METHOD_KEYS = [
  "06-Marketing-Strategy/06_01-Brand-Grounded-Executive-Summary.md",
  "06-Marketing-Strategy/06_02-Brand-Foundation.md",
  "06-Marketing-Strategy/06_03-Belief-Ready-Audience-Analysis.md",
  "06-Marketing-Strategy/06_04-Brand-Positioning.md",
  "06-Marketing-Strategy/06_05-Belief-Shift-Messaging.md",
  "06-Marketing-Strategy/06_06-Channel-Strategy.md",
  "06-Marketing-Strategy/06_07-Implementation-Plan.md",
  "06-Marketing-Strategy/06_08-Vital-3-Measurement-Long-Term.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M06ServicePorts["validateSource"];
  generate?: M06ServicePorts["generate"];
};

export function createM06Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M06 method release unavailable in this worker");
      for (const key of M06_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);

      const { module, stage: bindingStage, ...raw } = job.command;
      if (module !== "m06" || bindingStage !== "m06") throw new Error("Wrong M06 command binding");
      const command = m06GenerationSchema.parse(raw);
      if (!ports.generate) throw new Error("M06 generation provider is not configured");

      const service = createM06Service({
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
      if ((await ports.jobs.moduleForJob(jobId)) !== "m06")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
