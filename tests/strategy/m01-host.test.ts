import { describe, expect, it, vi } from "vitest";
import { createM01Host, type M01HostPorts, type M01VoicePort } from "../../src/lib/app/strategy-m01-host.server";
import { sourceHash } from "../../src/lib/modules/strategy/server/stages/m01/session";

const sessionId = "95b22dbd-326d-478a-9d69-6ebba7db0918";
const jobId = "37bc85ad-ae76-4f3a-aa13-efeb4ea1a48c";
const attributionId = "15f9b418-7e2a-4c61-9a98-ed3e9a5ce593";
const input = { eligible: true, folder: "founder", engagement: "new venture", entry: {}, parts: [{ file: "brief.md", text: "Founder's own words." }] };
const voicePlan = { summary: "Interview plan", elements: [{ element: "The Broken Thing", coverage: "None", feedback: "", evidence: [], questions: [] }] };

function harness(options: {
  stage?: string;
  revision?: number;
  plan?: unknown;
  outputs?: unknown;
  afterVoice?: () => void;
  generationPolicy?: (call: number) => Promise<void>;
} = {}) {
  let currentInput: typeof input = structuredClone(input);
  const sessionSourceHash = sourceHash(currentInput);
  let revision = options.revision ?? 1;
  let stage = options.stage ?? "m01";
  const session = () => ({
    sessionId, stage: "m01", revision, sourceHash: sessionSourceHash, plan: options.plan ?? null,
    note: "", chat: [], transcript: [], outputs: options.outputs ?? null, seal: null, handoff: null,
  });
  const repository = {
    getSource: vi.fn(async () => ({ id: "source-v1", hash: "trusted-hash", body: currentInput })),
    getSession: vi.fn(async () => ({ id: sessionId, stage, revision, payload: session() })),
    listSessions: vi.fn(async () => []),
    listDocuments: vi.fn(async () => []),
  };
  const jobs = {
    enqueue: vi.fn(async (scope, job) => ({ id: job.id, sessionId: job.sessionId, status: "pending" })),
    get: vi.fn(async () => ({ id: jobId, sessionId, status: "pending" })),
  };
  const validate = vi.fn(async () => {});
  const sourceAuthority = {
    validate,
    get: vi.fn(async () => null),
    attest: vi.fn(async (_scope, value) => value),
    revoke: vi.fn(async () => {}),
    list: vi.fn(async () => []),
  };
  const target = vi.fn(async () => ({ organisationId: "org", brandId: "brand", engagementId: "engagement" }));
  const authority = vi.fn(async (_event, request) => ({
    actorId: "actor", organisationId: request.organisationId, brandId: request.brandId,
    activeMembership: true, activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: "engagement",
  }));
  let policyCalls = 0;
  const generationPolicy = vi.fn(async () => {
    policyCalls += 1;
    await options.generationPolicy?.(policyCalls);
  });
  const voiceFn = Object.assign(vi.fn(async () => {
    options.afterVoice?.();
    return { session: { id: "voice-session" }, transport: { sdp: "answer" } };
  }), { hangup: vi.fn(async () => {}) }) as M01VoicePort;
  const host = createM01Host({
    repository: repository as never, target, authority, jobs: jobs as never,
    generationPolicy, dispatchJob: vi.fn(async () => {}), sourceAuthority: sourceAuthority as never,
    voice: voiceFn,
  } as M01HostPorts);

  function event(path: string, method = "GET", body?: unknown, origin = "https://host.test") {
    const url = new URL(path, "https://host.test");
    const request = new Request(url, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(origin === "" ? {} : { origin }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { request, url, params: {}, locals: {} };
  }
  return {
    host, repository, jobs, sourceAuthority, target, authority, generationPolicy, voice: voiceFn,
    event, replaceInput(value: typeof input) { currentInput = value; },
    setRevision(value: number) { revision = value; },
    setStage(value: string) { stage = value; },
  };
}

const command = (action: string, extra: Record<string, unknown> = {}) => ({
  action, sessionId, expectedRevision: 1, commandId: "command-1", ...extra,
});

describe("M01 host boundary", () => {
  it("rejects a foreign origin and unknown authority fields before resolving host authority", async () => {
    const h = harness();
    const foreign = await h.host.POST(h.event("/m01", "POST", command("create"), "https://attacker.test"));
    expect(foreign.status).toBe(403);
    const forged = await h.host.POST(h.event("/m01", "POST", { action: "create", commandId: "new", actorId: "root" }));
    expect(forged.status).toBe(400);
    expect(h.target).not.toHaveBeenCalled();
    expect(h.authority).not.toHaveBeenCalled();
  });

  it("checks source currency, revision, and preparation before reserving asynchronous generation", async () => {
    const staleSource = harness();
    staleSource.replaceInput({ ...input, parts: [{ file: "brief.md", text: "Changed after session creation." }] });
    const stale = await staleSource.host.POST(staleSource.event("/m01", "POST", command("prepare")));
    expect(stale.status).toBe(400);
    expect(staleSource.jobs.enqueue).not.toHaveBeenCalled();

    const staleRevision = harness();
    staleRevision.setRevision(2);
    const conflict = await staleRevision.host.POST(staleRevision.event("/m01", "POST", command("prepare")));
    expect(conflict.status).toBe(409);
    expect(staleRevision.jobs.enqueue).not.toHaveBeenCalled();

    const unprepared = harness();
    const turn = await unprepared.host.POST(unprepared.event("/m01", "POST", command("turn", { message: "Continue." })));
    expect(turn.status).toBe(400);
    expect(unprepared.jobs.enqueue).not.toHaveBeenCalled();

    const prepared = harness({ plan: { summary: "already prepared", elements: [] } });
    const duplicatePrepare = await prepared.host.POST(prepared.event("/m01", "POST", command("prepare")));
    expect(duplicatePrepare.status).toBe(400);
    expect(prepared.jobs.enqueue).not.toHaveBeenCalled();
  });

  it("stores module, stage, and the trusted source version/hash in an async job", async () => {
    const h = harness();
    const response = await h.host.POST(h.event("/m01", "POST", command("prepare")));
    expect(response.status).toBe(202);
    const [scope, persisted] = h.jobs.enqueue.mock.calls[0]!;
    expect(persisted.command).toMatchObject({ module: "m01", stage: "m01", action: "prepare" });
    expect(persisted.pins).toEqual([{ slot: "m01-input", versionId: "source-v1", hash: "trusted-hash" }]);
    expect(scope.action).toBe("generate");
  });

  it("denies job status lookup for a session from another stage", async () => {
    const h = harness({ stage: "m04" });
    const response = await h.host.GET(h.event(`/m01?jobId=${jobId}&sessionId=${sessionId}`));
    expect(response.status).toBe(404);
    expect(h.jobs.get).not.toHaveBeenCalled();
  });

  it("rechecks generation permission after voice mint and hangs up if permission changed", async () => {
    const h = harness({
      plan: voicePlan,
      generationPolicy: async (call) => { if (call === 2) throw new Error("permission revoked"); },
    });
    const response = await h.host.POST(h.event("/m01", "POST", command("voice-session", { sdp: "offer" })));
    expect(response.status).toBe(400);
    expect(h.generationPolicy).toHaveBeenCalledTimes(2);
    expect(h.voice.hangup).toHaveBeenCalledWith("voice-session");
    expect(await response.text()).not.toContain("answer");
  });

  it("rechecks source and revision after voice mint and does not return a stale answer", async () => {
    const h = harness({
      plan: voicePlan,
      afterVoice: () => h.setRevision(2),
    });
    const response = await h.host.POST(h.event("/m01", "POST", command("voice-session", { sdp: "offer" })));
    expect(response.status).toBe(409);
    expect(h.voice.hangup).toHaveBeenCalledWith("voice-session");
    expect(await response.text()).not.toContain("answer");
  });

  it("hangs up when the approved source changes while voice is being minted", async () => {
    const h = harness({
      plan: voicePlan,
      afterVoice: () => h.replaceInput({ ...input, parts: [{ file: "brief.md", text: "Changed during voice setup." }] }),
    });
    const response = await h.host.POST(h.event("/m01", "POST", command("voice-session", { sdp: "offer" })));
    expect(response.status).toBe(409);
    expect(h.voice.hangup).toHaveBeenCalledWith("voice-session");
    expect(await response.text()).not.toContain("answer");
  });

  it("accepts only an attribution ID for sealing, never a client source tuple", async () => {
    const h = harness();
    const withClientSource = await h.host.POST(h.event("/m01", "POST", command("seal", {
      sourceAttributionId: attributionId, source: { type: "single founder / owner", name: "Founder", materialUsed: "brief.md" },
      reviewAnswers: {}, derived: {}, notes: "",
    })));
    expect(withClientSource.status).toBe(400);
    expect(h.sourceAuthority.get).not.toHaveBeenCalled();

    const attributionOnly = await h.host.POST(h.event("/m01", "POST", command("seal", {
      sourceAttributionId: attributionId, reviewAnswers: {}, derived: {}, notes: "",
    })));
    expect(attributionOnly.status).toBe(403);
    expect(h.sourceAuthority.get).toHaveBeenCalledWith(expect.anything(), attributionId);
  });
});
