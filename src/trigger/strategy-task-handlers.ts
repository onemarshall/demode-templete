import { z } from "zod";

export const authStrategyM04SessionV2PayloadSchema = z
  .object({ version: z.literal(1), jobId: z.string().min(1).max(200) })
  .strict();

export async function runAuthStrategyM04SessionV2(
  input: z.infer<typeof authStrategyM04SessionV2PayloadSchema>,
  runtime: { worker: { run(jobId: string): Promise<"succeeded" | "unavailable"> } },
) {
  const status = await runtime.worker.run(input.jobId);
  return { jobId: input.jobId, status };
}

export async function runAuthStrategyRecoveryV1(runtime: {
  recovery: { dispatchRecoverable(): Promise<number> };
  outboxDispatcher: { dispatchOne(): Promise<boolean> };
}) {
  let jobs = 0;
  const errors: unknown[] = [];
  try {
    jobs = await runtime.recovery.dispatchRecoverable();
  } catch (error) {
    errors.push(error);
  }
  let outbox = 0;
  // Bound attempts, and let leased unsupported/failed rows retry later while
  // continuing on to unrelated supported events in this pass.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if (!(await runtime.outboxDispatcher.dispatchOne())) break;
      outbox += 1;
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    throw new AggregateError(
      errors,
      `Strategy recovery processed ${jobs} job(s) and ${outbox} outbox event(s), with ${errors.length} error(s)`,
    );
  }
  return { jobs, outbox, errors: 0 };
}
