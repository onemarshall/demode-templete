import { schedules } from "@trigger.dev/sdk";
import { getStrategyRecoveryRuntime } from "../lib/app/strategy-worker.server";
import { runAuthStrategyRecoveryV1 } from "./strategy-task-handlers";

export const authStrategyRecoveryV1 = schedules.task({
  id: "auth-strategy-recovery-v1",
  cron: {
    pattern: "* * * * *",
    window: "1m",
    environments: ["STAGING", "PRODUCTION"],
  },
  run: async () => runAuthStrategyRecoveryV1(await getStrategyRecoveryRuntime()),
});
