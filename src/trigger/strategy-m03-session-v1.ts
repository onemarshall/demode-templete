import { metadata, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { getStrategyWorkerRuntime } from "../lib/app/strategy-worker.server";

export const authStrategyM03SessionV1PayloadSchema = z
  .object({ version: z.literal(1), jobId: z.uuid() })
  .strict();

/** Thin task entry: durable job IDs are the only caller-supplied authority. */
export const authStrategyM03SessionV1 = schemaTask({
  id: "auth-strategy-m03-session-v1",
  schema: authStrategyM03SessionV1PayloadSchema,
  maxDuration: 1200,
  retry: {
    maxAttempts: 10,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 120_000,
    factor: 2,
    randomize: true,
  },
  run: async ({ jobId }) => {
    metadata.set("schemaVersion", 1);
    const result = await (await getStrategyWorkerRuntime()).m03Worker.run(jobId);
    metadata.set("status", result);
    return { jobId, status: result };
  },
});
