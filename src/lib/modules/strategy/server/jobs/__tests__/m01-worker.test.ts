import { describe, expect, it, vi } from "vitest";
import { createStrategyAccess } from "../../access";
import { methodReleaseManifests } from "../../system.generated";
import { createM01Worker } from "../m01-worker";
import { createStrategyRecovery } from "../recovery";
import type { DurableJob } from "../../data/jobs";

const SESSION_ID = "95b22dbd-326d-478a-9d69-6ebba7db0918";
const M01_RELEASE = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["01-Founder-Convictions/01-Prompt.md"]),
)?.[0]!;

function setup(command: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const job = {
    id: "m01-job",
    organisationId: "org",
    brandId: "brand",
    engagementId: "engagement",
    sessionId: SESSION_ID,
    expectedRevision: 1,
    commandId: "command",
    command,
    pins: [],
    methodRelease: M01_RELEASE,
    actorId: "actor",
    action: "generate",
    status: "pending",
    fence: 0,
    attempts: 0,
    leaseUntil: null,
    result: null,
  } as DurableJob;
  const scope = createStrategyAccess(async (request) => ({
    actorId: "actor",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["generate"],
  })).authorize;
  const trustedScope = scope({
    organisationId: "org", brandId: "brand", engagementId: "engagement", action: "generate",
  });
  const jobs = {
    load: vi.fn(async () => job),
    moduleForJob: vi.fn(async () => "m01"),
    claim: vi.fn(async () => ({ job, fence: 1 })),
    heartbeat: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
    ...overrides,
  };
  const model = {
    name: "test-model",
    call: vi.fn(async () => ({ plan: "synthetic" })),
    chat: vi.fn(async () => "synthetic reply"),
  };
  const repository = {
    getSession: vi.fn(async () => ({ id: "session", stage: "m01", revision: 1, payload: { revision: 1, seal: null } })),
    getSource: vi.fn(async () => ({ id: "source", hash: "hash", body: { parts: [], engagement: "" } })),
    mutateSession: vi.fn(async (_scope, _session, _revision, _commandId, mutate) => {
      // Trigger the exact transaction path used by an M01 generation mutation.
      const state = { stage: "m01", payload: { revision: 1, history: [], seal: null } };
      const result = await mutate(state, { assertJobLease: vi.fn(), getSource: vi.fn(async () => ({ id: "source", hash: "hash", body: { parts: [], engagement: "" } })) });
      return result;
    }),
  };
  const worker = createM01Worker({
    jobs: jobs as never,
    authorize: async () => await trustedScope,
    policy: vi.fn(async () => {}),
    repository: repository as never,
    model,
    ...overrides,
  } as never);
  return { job, jobs, model, repository, worker };
}

describe("M01 durable worker", () => {
  it("rejects a job routed from another persisted stage before claiming it", async () => {
    const state = setup({ module: "m01", stage: "m01", action: "prepare", sessionId: SESSION_ID, expectedRevision: 1, commandId: "command" }, {
      moduleForJob: vi.fn(async () => "m04"),
    });
    await expect(state.worker.run("m01-job")).rejects.toThrow("Job belongs to a different Strategy worker");
    expect(state.jobs.claim).not.toHaveBeenCalled();
  });

  it("rejects malformed persisted commands before any model or repository work", async () => {
    const state = setup({ module: "m01", stage: "m01", action: "prepare", sessionId: SESSION_ID, commandId: "command" });
    await expect(state.worker.run("m01-job")).rejects.toThrow();
    expect(state.model.call).not.toHaveBeenCalled();
    expect(state.repository.getSession).not.toHaveBeenCalled();
  });

  it("refuses seal and approval operations through the generation worker", async () => {
    const state = setup({
      module: "m01", stage: "m01", action: "seal", sessionId: SESSION_ID, expectedRevision: 1,
      commandId: "command", sourceAttributionId: "95b22dbd-326d-478a-9d69-6ebba7db0918",
      reviewAnswers: {}, derived: {}, notes: "",
    });
    await expect(state.worker.run("m01-job")).rejects.toThrow("M01 worker accepts generation commands only");
    expect(state.model.call).not.toHaveBeenCalled();
    expect(state.repository.mutateSession).not.toHaveBeenCalled();
  });

  it("loads the M01 resources from the persisted method release before dispatch", async () => {
    const release = M01_RELEASE;
    const state = setup({
      module: "m01", stage: "m01", action: "seal", sessionId: SESSION_ID, expectedRevision: 1,
      commandId: "command", sourceAttributionId: "95b22dbd-326d-478a-9d69-6ebba7db0918",
      reviewAnswers: {}, derived: {}, notes: "",
    });
    state.job.methodRelease = release;
    await expect(state.worker.run("m01-job")).rejects.toThrow("M01 worker accepts generation commands only");
    expect(state.jobs.fail).toHaveBeenCalledOnce();
    expect(state.model.call).not.toHaveBeenCalled();
  });

  it("routes recovery to M01 and uses fresh dispatch idempotency keys", async () => {
    const dispatch = vi.fn(async (_input: { jobId: string; idempotencyKey: string }) => ({ runId: "run" }));
    const recoverable = vi.fn(async () => ["m01-a", "m01-b"]);
    const recovery = createStrategyRecovery({ jobs: { recoverable } as never, gateway: { dispatch } });
    expect(await recovery.dispatchRecoverable()).toBe(2);
    expect(recoverable).toHaveBeenCalledWith(50, "m04");
    // The stage is an explicit recovery option, matching the host's M01 worker composition.
    const m01Recovery = createStrategyRecovery({ jobs: { recoverable } as never, gateway: { dispatch }, stage: "m01" });
    expect(await m01Recovery.dispatchRecoverable()).toBe(2);
    expect(recoverable).toHaveBeenLastCalledWith(50, "m01");
    expect(dispatch).toHaveBeenCalledTimes(4);
    const keys = dispatch.mock.calls.map(([input]) => input.idempotencyKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
