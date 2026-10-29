import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createStrategyAccess } from "../../access";
import { methodReleaseManifests } from "../../system.generated";
import { CollectionRecord, M02Session, ReconLog } from "../../stages/m02/session";
import { M02Record, type M02ServicePorts } from "../../stages/m02/service";
import { createM02Worker } from "../m02-worker";
import type { DurableJob } from "../../data/jobs";

const m02Release = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["02-Market-Reality-Check/02-Prompt.md"]),
)?.[0]!;
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

function setup(options: { module?: string; release?: string; generate?: M02ServicePorts["generate"] } = {}) {
  const sessionId = "a6ff9f31-f6af-49ca-b6e7-6c0e52eb2f4c";
  const sourceVersionId = "1f138ab7-9e69-4fc7-8a4b-002e6dadf9f4";
  const now = "2026-10-29T12:00:00.000Z";
  const outputs = {
    anchors: [
      { key: "The Broken Thing", sentence: "Teams rely on informal referrals." },
      { key: "The Hidden Truth", sentence: "Trust grows through demonstrated care." },
      { key: "Market-Deployable Hidden Truth", sentence: "Buyers seek trustworthy support." },
      { key: "The Non-Negotiable", sentence: "Make support visible." },
      { key: "The Hard-Won Teaching", sentence: "Reliability is learned through practice." },
      { key: "The Legacy", sentence: "Leave stronger local services." },
      { key: "Core Belief", sentence: "I believe trust grows through care, therefore make support visible." },
    ],
    claimsBoundaryInputs: {
      canClaim: ["We provide local support."],
      mustQualify: ["Support is reliable."],
      cannotClaim: ["We are the market leader."],
    },
  };
  const canonical = JSON.stringify({ outputs });
  const inputs = {
    sessionId,
    sealedAt: now,
    coreBelief: outputs.anchors[6]!.sentence,
    brokenThing: outputs.anchors[0]!.sentence,
    hiddenTruth: outputs.anchors[1]!.sentence,
    marketDeployableHiddenTruth: outputs.anchors[2]!.sentence,
    nonNegotiable: outputs.anchors[3]!.sentence,
    hardWonTeaching: outputs.anchors[4]!.sentence,
    legacy: outputs.anchors[5]!.sentence,
    claimsBoundaryInputs: outputs.claimsBoundaryInputs,
  };
  const body = {
    sessionId,
    sealedAt: now,
    outputsHash: sha256(canonical),
    inputs,
    originVersionId: sourceVersionId,
    originRevision: 3,
    originCanonicalPayload: canonical,
    originApproval: { approved: true },
  };
  const source = {
    id: sourceVersionId,
    slot: "m02-m01",
    body,
    hash: sha256(JSON.stringify(body)),
  };
  const session = M02Session.parse({
    module: "02",
    sessionId,
    folder: "brand",
    createdAt: now,
    updatedAt: now,
    stage: "setup",
    m01: { sessionId, sealedAt: now, outputsHash: body.outputsHash },
    route: "full",
    routeStatus: "proposed",
    research: {},
  });
  const recon = ReconLog.parse({ module: "02", sessionId, producedAt: now, updatedAt: now, m01Inputs: inputs });
  const collection = CollectionRecord.parse({ collectionId: "collection-1", state: "not_started", updatedAt: now });
  const record = M02Record.parse({
    revision: 1,
    session,
    recon,
    artifacts: { artifacts: [] },
    collection,
    seal: null,
    sourceVersionId,
    sourceHash: source.hash,
    history: [],
  });
  const job = {
    id: "5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a",
    organisationId: "org",
    brandId: "brand",
    engagementId: "engagement",
    sessionId,
    expectedRevision: 1,
    commandId: "draft-gate2",
    command: {
      action: "draft",
      module: "m02",
      stage: "m02",
      gate: "setup",
      sessionId,
      expectedRevision: 1,
      commandId: "draft-gate2",
    },
    pins: [{ slot: "m02-m01", versionId: source.id, hash: source.hash }],
    methodRelease: options.release ?? m02Release,
    actorId: "actor",
    action: "generate",
    status: "pending",
    fence: 0,
    attempts: 0,
    leaseUntil: null,
    result: null,
  } as DurableJob;
  let authorityActive = true;
  const trustedScope = createStrategyAccess(async (request) => ({
    actorId: "actor",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: authorityActive,
    activeBrandAssignment: true,
    actions: ["generate"],
  })).authorize({ organisationId: "org", brandId: "brand", engagementId: "engagement", action: "generate" });
  const jobs = {
    load: vi.fn(async (_jobId?: string) => job),
    moduleForJob: vi.fn(async () => options.module ?? "m02"),
    claim: vi.fn(async () => { job.status = "running"; job.fence += 1; return { job, fence: job.fence }; }),
    heartbeat: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  const repository = {
    getSession: vi.fn(async () => ({ stage: "m02", revision: 1, payload: record })),
    getSource: vi.fn(async () => source),
    mutateSession: vi.fn(async (_scope, id, expectedRevision, commandId, update, commandInput) => {
      if (id !== sessionId || expectedRevision !== record.revision) throw new Error("Revision conflict");
      const draft = structuredClone(record);
      let publicationLease: { jobId: string; fence: number } | undefined;
      const result = await update({ id, stage: "m02", revision: record.revision, payload: draft }, {
        getSource: async (slot: string) => slot === source.slot ? source : null,
        query: async () => ({ rows: [] }),
        assertJobLease: async (jobId: string, fence: number) => {
          if (jobId !== job.id || fence !== job.fence || job.status !== "running") throw new Error("Strategy job lease lost");
          publicationLease = { jobId, fence };
        },
      });
      Object.assign(record, result.payload);
      if (publicationLease) {
        job.status = "succeeded";
        job.leaseUntil = null;
        job.result = { id, stage: "m02", revision: record.revision, payload: record };
      }
      return { id, stage: "m02", revision: record.revision, payload: record, commandId, commandInput };
    }),
  };
  const generate = options.generate ?? vi.fn(async () => ({ candidate: { competitors: [{ name: "Example market participant" }], cohort: "Independent repair shops", geography: "North West England" }, model: "test-model" }));
  const validateSource = vi.fn(async () => {});
  const events: string[] = [];
  const policy = vi.fn(async (_job: DurableJob, phase: "execute" | "publish") => { events.push(phase); });
  const provider = async (request: Parameters<NonNullable<M02ServicePorts["generate"]>>[0]) => {
    events.push("provider");
    return generate(request);
  };
  const worker = createM02Worker({
    jobs: jobs as never,
    repository: repository as never,
    validateSource,
    generate: provider,
    authorize: async () => await trustedScope,
    policy,
  });
  return { worker, jobs, repository, generate, validateSource, source, body, inputs, events, policy, revokeAuthority: () => { authorityActive = false; } };
}

describe("M02 durable worker", () => {
  it("validates the pinned M01 source, generates only a draft, and completes through the shared lease runner", async () => {
    expect(m02Release).toBeTruthy();
    const state = setup();
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).resolves.toBe("succeeded");
    expect(state.repository.getSession).toHaveBeenCalledOnce();
    expect(state.repository.getSource).toHaveBeenCalledWith(expect.anything(), "m02-m01");
    expect(state.validateSource).toHaveBeenCalledWith(expect.anything(), state.source);
    expect(state.generate).toHaveBeenCalledOnce();
    expect(state.events).toEqual(["execute", "provider", "publish"]);
    expect(state.policy).toHaveBeenCalledTimes(2);
    expect(state.policy).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a" }), "execute");
    expect(state.policy).toHaveBeenNthCalledWith(2, expect.anything(), "publish");
    expect(state.generate).toHaveBeenCalledWith(expect.objectContaining({
      gate: "setup",
      methodRelease: m02Release,
      state: expect.objectContaining({ upstream: state.inputs }),
    }));
    expect(state.repository.mutateSession).toHaveBeenCalledOnce();
    expect(state.jobs.complete).not.toHaveBeenCalled();
    expect(state.jobs.fail).not.toHaveBeenCalled();
    expect(state.repository.getSession).toHaveBeenCalledOnce();
    await expect(state.jobs.load("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).resolves.toMatchObject({ status: "succeeded" });
  });

  it("rejects another module's task before claiming its job", async () => {
    const state = setup({ module: "m01" });
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).rejects.toThrow(
      "Job belongs to a different Strategy worker",
    );
    expect(state.jobs.claim).not.toHaveBeenCalled();
  });

  it("fails the durable job before provider execution when the pinned M02 method release is unavailable", async () => {
    const state = setup({ release: "missing-release" });
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).rejects.toThrow(
      "Persisted M02 method release unavailable in this worker",
    );
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.jobs.fail).toHaveBeenCalledOnce();
  });

  it("fails closed when the pinned M01 source cannot be verified", async () => {
    const state = setup();
    state.repository.getSource.mockResolvedValueOnce({ ...state.source, hash: "0".repeat(64) });
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).rejects.toThrow();
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.jobs.fail).toHaveBeenCalledOnce();
  });

  it("does not publish a provider result if authority is revoked while generation is in flight", async () => {
    const state = setup({ generate: vi.fn(async () => {
      state.revokeAuthority();
      return { candidate: { competitors: [{ name: "Synthetic participant" }], cohort: "Independent repair shops", geography: "North West England" }, model: "test-model" };
    }) });
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).rejects.toThrow("Strategy access denied");
    expect(state.repository.mutateSession).not.toHaveBeenCalled();
    expect(state.jobs.fail).toHaveBeenCalledOnce();
    expect(state.generate).toHaveBeenCalledOnce();
  });

  it("returns a persisted success without calling the provider on duplicate delivery", async () => {
    const state = setup();
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).resolves.toBe("succeeded");
    await expect(state.worker.run("5cbf4074-4b19-4b14-bbe8-8ba4737e1e2a")).resolves.toBe("succeeded");
    expect(state.generate).toHaveBeenCalledOnce();
    expect(state.repository.mutateSession).toHaveBeenCalledOnce();
  });
});
