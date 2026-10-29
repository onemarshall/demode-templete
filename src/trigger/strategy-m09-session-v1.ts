import { metadata, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { getStrategyWorkerRuntime } from "../lib/app/strategy-worker.server";

export const authStrategyM09SessionV1PayloadSchema = z
  .object({ version: z.literal(1), jobId: z.uuid() })
  .strict();

/** Thin task entry: durable job IDs are the only caller-supplied authority. */
export const authStrategyM09SessionV1 = schemaTask({
  id: "auth-strategy-m09-session-v1",
  schema: authStrategyM09SessionV1PayloadSchema,
  maxDuration: 1800,
  retry: {
    maxAttempts: 10,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 120_000,
    factor: 2,
    randomize: true,
  },
  run: async ({ jobId }) => {
    metadata.set("schemaVersion", 1);
    const result = await (await getStrategyWorkerRuntime()).m09Worker.run(jobId);
    metadata.set("status", result);
    return { jobId, status: result };
  },
});
