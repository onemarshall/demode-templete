import { metadata, schemaTask } from "@trigger.dev/sdk";
import { getStrategyWorkerRuntime } from "../lib/app/strategy-worker.server";
import {
  authStrategyM04SessionV2PayloadSchema,
  runAuthStrategyM04SessionV2,
} from "./strategy-task-handlers";

export const authStrategyM04SessionV2 = schemaTask({
  id: "auth-strategy-m04-session-v2",
  schema: authStrategyM04SessionV2PayloadSchema,
  // A bounded long-form section can take longer than the introductory context.
  // The provider's 900s ceiling leaves five minutes for persistence/cleanup.
  maxDuration: 1200,
  retry: {
    maxAttempts: 10,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 120_000,
    factor: 2,
    randomize: true,
  },
  run: async (input) => {
    metadata.set("schemaVersion", 1);
    const output = await runAuthStrategyM04SessionV2(input, await getStrategyWorkerRuntime());
    metadata.set("status", output.status);
    return output;
  },
});
