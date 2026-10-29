import { describe, expect, it, vi } from "vitest";
import { createStrategyAccess } from "../../access";
import { methodReleaseManifests } from "../../system.generated";
import { createM04Worker } from "../worker";
import type { DurableJob } from "../../data/jobs";

const m04Release = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["04-Viability-Check/04-Prompt.md"]),
)?.[0]!;

function setup(methodRelease: string) {
  const job = {
    id: "m04-job",
    organisationId: "org",
    brandId: "brand",
    engagementId: "engagement",
    sessionId: "session",
    expectedRevision: 1,
    commandId: "command",
    command: { stage: "context" },
    pins: [],
    methodRelease,
    actorId: "actor",
    action: "generate",
    status: "pending",
    fence: 0,
    attempts: 0,
    leaseUntil: null,
    result: null,
  } as DurableJob;
  const trustedScope = createStrategyAccess(async (request) => ({
    actorId: "actor",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["generate"],
  })).authorize({ organisationId: "org", brandId: "brand", engagementId: "engagement", action: "generate" });
  const jobs = {
    load: vi.fn(async () => job),
    claim: vi.fn(async () => ({ job, fence: 1 })),
    heartbeat: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  const execute = vi.fn(async (_scope, _job, _lease, beforePublish: () => Promise<void>) => {
    await beforePublish();
    return { completed: true };
  });
  const worker = createM04Worker({
    jobs: jobs as never,
    authorize: async () => await trustedScope,
    policy: vi.fn(async () => {}),
    execute,
  });
  return { job, jobs, execute, worker };
}

describe("M04 durable worker regression", () => {
  it("loads the persisted M04 method release and retains the shared lease/publication runner", async () => {
    expect(m04Release).toBeTruthy();
    const state = setup(m04Release);
    await expect(state.worker.run("m04-job")).resolves.toBe("succeeded");
    expect(state.execute).toHaveBeenCalledOnce();
    expect(state.jobs.complete).toHaveBeenCalledOnce();
  });

  it("rejects a method release that is not present in the packaged resources", async () => {
    const state = setup("missing-release");
    await expect(state.worker.run("m04-job")).rejects.toThrow("Persisted method release unavailable in this worker");
    expect(state.jobs.claim).toHaveBeenCalledOnce();
    expect(state.jobs.fail).toHaveBeenCalledOnce();
    expect(state.execute).not.toHaveBeenCalled();
  });
});
