import { describe, expect, it, vi } from "vitest";
import { createStrategyAccess } from "../../access";
import { createM03Worker } from "../m03-worker";

const ids = {
  jobId: "9b1b5c0e-1f2a-4a4a-8a4a-1b1b1b1b1b1b",
  organisationId: "org",
  brandId: "brand",
  engagementId: "engagement",
  actorId: "authenticated-actor",
  sessionId: "95b22dbd-326d-478a-9d69-6ebba7db0918",
};

function setup(overrides: { module?: string; release?: string } = {}) {
  const access = createStrategyAccess(async (request) => ({
    actorId: ids.actorId,
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export"] as const,
    approvalEngagementId: ids.engagementId,
  }));
  const job = {
    id: ids.jobId,
    organisationId: ids.organisationId,
    brandId: ids.brandId,
    engagementId: ids.engagementId,
    actorId: ids.actorId,
    sessionId: ids.sessionId,
    status: "pending",
    methodRelease: overrides.release ?? "0".repeat(64),
    command: {
      module: "m03",
      stage: "m03",
      action: "draft",
      step: "challenge",
      sessionId: ids.sessionId,
      expectedRevision: 3,
      commandId: "synthetic-draft-command",
    },
  };
  const jobs = {
    moduleForJob: vi.fn(async () => overrides.module ?? "m03"),
    load: vi.fn(async () => job),
    claim: vi.fn(async () => ({ job, fence: 1 })),

    heartbeat: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  const worker = createM03Worker({
    jobs: jobs as never,
    repository: {} as never,
    validateSource: async () => {},
    generate: async () => ({ candidate: {}, model: "synthetic-model" }),
    authorize: async () =>
      access.authorize({
        organisationId: ids.organisationId,
        brandId: ids.brandId,
        engagementId: ids.engagementId,
        action: "generate",
      }),
    policy: async () => {},
  });
  return { worker, jobs };
}

describe("M03 durable worker", () => {
  it("rejects another module's task before claiming its job", async () => {
    const { worker, jobs } = setup({ module: "m02" });
    await expect(worker.run(ids.jobId)).rejects.toThrow(
      "Job belongs to a different Strategy worker",
    );
    expect(jobs.claim).not.toHaveBeenCalled();
  });

  it("fails the durable job before provider execution when the pinned M03 method release is unavailable", async () => {
    const { worker, jobs } = setup();
    await expect(worker.run(ids.jobId)).rejects.toThrow(
      "Persisted M03 method release unavailable in this worker",
    );
    expect(jobs.complete).not.toHaveBeenCalled();
  });
});
