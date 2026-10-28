import { defineConfig } from "@trigger.dev/sdk";

const project = process.env.TRIGGER_PROJECT_REF;
if (!project || !/^proj_[A-Za-z0-9]+$/.test(project)) {
  throw new Error("Set TRIGGER_PROJECT_REF to this Auth project's Trigger.dev project ref");
}

export default defineConfig({
  project,
  runtime: "node",
  tsconfig: "./tsconfig.worker.json",
  dirs: ["./src/trigger"],
  ignorePatterns: ["**/__tests__/**", "**/*.test.ts"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 8,
      factor: 2,
      minTimeoutInMs: 5_000,
      maxTimeoutInMs: 120_000,
      randomize: true,
    },
  },
});
