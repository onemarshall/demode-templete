import { createM02Service, type M02ServicePorts } from "../stages/m02/service";
import { m02CommandSchema } from "../stages/m02/commands";
import type { StrategyRepository } from "../data/repository";
import { hasStrategyMethodRelease, loadStrategyMethod } from "../resources";
import { createStrategyJobRunner, type StrategyJobRunnerPorts } from "./runner";

const M02_METHOD_KEYS = [
  "02-Market-Reality-Check/02-Prompt.md",
  "02-Market-Reality-Check/02_01-Market-Reconnaissance.md",
  "02-Market-Reality-Check/02-Quality-Gates.md",
  "02-Market-Reality-Check/02-Handoff-Pack.md",
] as const;

type WorkerPorts = Omit<StrategyJobRunnerPorts, "execute"> & {
  repository: StrategyRepository;
  validateSource: M02ServicePorts["validateSource"];
  generate?: M02ServicePorts["generate"];
  collect?: M02ServicePorts["collect"];
};

/** Stage-specific M02 generation over the shared scoped SQL lease/publication runner. */
export function createM02Worker(ports: WorkerPorts) {
  const runner = createStrategyJobRunner({
    ...ports,
    execute: async (scope, job, lease, beforePublish) => {
      if (!hasStrategyMethodRelease(job.methodRelease))
        throw new Error("Persisted M02 method release unavailable in this worker");
      for (const key of M02_METHOD_KEYS) loadStrategyMethod(key, job.methodRelease);


      const { module, stage, ...raw } = job.command;
      if (module !== "m02" || stage !== "m02") throw new Error("Wrong M02 command binding");
      const command = m02CommandSchema.parse(raw);
      if (command.action !== "draft" && command.action !== "collect-url") throw new Error("M02 worker accepts generation and collection commands only");
      if(command.action==='collect-url') {
        if(!ports.collect)throw new Error('M02 collection is not configured');
        const service=createM02Service({repository:ports.repository,methodRelease:job.methodRelease,validateSource:ports.validateSource,
          collect:async request=>{const result=await ports.collect!(request);await beforePublish();return result;}});
        return service.collectUrl(scope,{...command,jobLease:lease});
      }
      if(!ports.generate)throw new Error('M02 generation provider is not configured');
      const draftCommand = {
        sessionId: command.sessionId,
        expectedRevision: command.expectedRevision,
        commandId: command.commandId,
        gate: command.gate,
      };

      const service = createM02Service({
        repository: ports.repository,
        methodRelease: job.methodRelease,
        validateSource: ports.validateSource,
        generate: async (request) => {
          const generated = await ports.generate!(request);
          await beforePublish();
          return generated;
        },
      });
      return service.draft(scope, { ...draftCommand, jobLease: lease });
    },
  });

  return {
    async run(jobId: string): Promise<"succeeded" | "unavailable"> {
      if (await ports.jobs.moduleForJob(jobId) !== "m02")
        throw new Error("Job belongs to a different Strategy worker");
      return runner.run(jobId);
    },
  };
}
