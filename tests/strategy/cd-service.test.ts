import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createCDService } from "../../src/lib/modules/strategy/server/stages/cd/service";
import { validateCDSource, CD_SOURCE_SLOT } from "../../src/lib/modules/strategy/server/stages/cd/source";
import { HandoffCommercialDirection } from "../../src/lib/modules/strategy/server/stages/cd/contracts";
import { createStrategyTestDatabase } from "./db";
import { createHash } from "node:crypto";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function source() {
  const tuple = {
    m10: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m10"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
  };
  const print = sha(JSON.stringify(tuple));
  const body = {
    folder: "synthetic-brand",
    entry: {
      receipt: {
        version: 1,
        receiptId: `${print.slice(0, 8)}-${print.slice(8, 12)}-4${print.slice(13, 16)}-8${print.slice(17, 20)}-${print.slice(20, 32)}`,
        chainFingerprint: print,
        approvedBy: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
        approvedAt: "2026-10-29T12:00:00.000Z",
      },
    },
    ...tuple,
  };
  return { id: randomUUID(), slot: CD_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

const payloads = () => ({
  inheritance: {
    inheritedDecisions: ["Publish the outcome register."],
    selectableOptions: ["Evidence index first"],
    lockedFields: ["Claims boundary"],
    claimsBoundary: { canClaim: ["Outcomes are published quarterly"], mustQualify: [], cannotClaim: ["Most reliable"] },
    invalidationTriggers: ["Claims boundary changes"],
    upstreamVersions: [{ module: "m10", sessionId: "s", versionId: "v", hash: "h" }],
  },
  horizon: {
    directionalHorizon: "12 months",
    horizonRationale: "Long enough to test the route.",
    longerTermAmbition: "",
    evidenceCutoff: "2026-10-01",
    cycleHorizon: "First controlled cycle",
    proportionality: "Proportionate: the uncertainty is evidence velocity.",
  },
  recommendation: {
    outcome: "Publish the register as the buying criterion.",
    priorityAudience: "Operations leads",
    buyingSituation: "After a failed repair",
    requiredMovement: "From assumption to inspection",
  },
  route: {
    strategicRoute: "Evidence-led direct",
    credibleAlternative: "Channel partnerships",
    tradeoff: "Slower reach, stronger proof.",
  },
  moves: {
    moves: [
      { id: "move-1", name: "Publish the register", job: "Make proof inspectable", consequenceIds: ["c1"], evidenceState: "observed" as const },
      { id: "move-2", name: "Teach the method", job: "Show how to read it", consequenceIds: ["c2"], evidenceState: "hypothesis" as const },
      { id: "move-3", name: "Refuse placement", job: "Prove independence", consequenceIds: ["c3"], evidenceState: "observed" as const },
    ],
  },
  sequence: {
    phases: [{ phase: "First cycle", horizon: "0-90 days", work: ["Publish the register"], progressionGate: "Register live and read" }],
    currentCycleObjective: "Publish the first register.",
    firstPhaseObjective: "Publish the first register.",
    progressionCondition: "The register is live and read by ten prospects.",
    firstEvidenceEvent: "First register publication",
    reviewEvent: "End of the first cycle",
  },
  portfolio: {
    consequences: [
      { id: "c1", source: "m08", classification: "active-first-phase" as const, reason: "Core proof", commercialJob: "Proof", dependencies: [], evidenceState: "observed" as const, capacityNote: "", owner: "Synthetic Owner" },
      { id: "c2", source: "m09", classification: "next" as const, reason: "Second phase", commercialJob: "Teaching", dependencies: ["c1"], evidenceState: "hypothesis" as const, capacityNote: "", owner: "Synthetic Owner" },
    ],
  },
  exclusions: {
    exclusions: ["No paid placement"],
    deferredAlternatives: ["Channel partnerships"],
    invalidationTriggers: ["The register is not read"],
  },
  evidence: {
    dimensions: [{ dimension: "Buyer inspection", state: "observed" as const, note: "Observed upstream." }],
    coreAssumption: "Buyers will inspect a published register.",
    preCycleTest: { required: false, id: "", effect: "", resolved: "" },
  },
});

const decision = (overrides: Record<string, unknown> = {}) => ({
  response: "accept",
  decisionState: "client-approved",
  executionPermission: "controlled-90-day",
  owner: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
  exactDecision: "Approved for the first controlled cycle.",
  authorisedWork: "The first controlled cycle only.",
  nextReviewTrigger: "End of the first cycle.",
  ...overrides,
});

async function harness() {
  const db = await createStrategyTestDatabase();
  const repository = new StrategyRepository(db.pool);
  const access = createStrategyAccess(async (request) => ({
    actorId: "synthetic-cd-operator",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: request.engagementId,
  }));
  const scope = (action: StrategyAction) =>
    access.authorize({ organisationId: "cd-org", brandId: "cd-brand", engagementId: "cd-engagement", action });
  await repository.createEngagement(await scope("manage"), { id: "cd-engagement", label: "Synthetic CD" });
  await repository.setSource(await scope("manage"), source());
  return { db, repository, scope };
}

test("A Commercial Direction seals and its handoff satisfies the M11 consumer", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createCDService({
      repository,
      validateSource: async (_scope, record) => {
        validateCDSource(record);
      },
      generate: async ({ stage }) => ({ draft: { candidate: data[stage as keyof typeof data], model: "synthetic-cd-model" } }),
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "cd-create" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });

    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    expect(session.stage).toBe("inheritance");

    const order: [string, string][] = [
      ["inheritance", "horizon"],
      ["horizon", "recommendation"],
      ["recommendation", "route"],
      ["route", "moves"],
      ["moves", "sequence"],
      ["sequence", "portfolio"],
      ["portfolio", "exclusions"],
      ["exclusions", "evidence"],
      ["evidence", "decision"],
    ];
    for (const [stage, next] of order) {
      session = (await service.draft(await scope("generate"), command("draft", { stage }))).payload;
      session = (await service.confirm(await scope("approve"), command("confirm", { stage, payload: data[stage as keyof typeof data] }))).payload;
      expect(session.stage).toBe(next as never);
    }

    const sealed = await service.decide(await scope("approve"), command("decide", { decision: decision() }));
    session = sealed.payload;
    expect(session.stage).toBe("sealed");
    expect(session.seal).toBeTruthy();

    const handoffDocument = await db.pool.query(
      "SELECT content FROM strategy_document WHERE version_id=$1 AND kind='handoff'",
      [session.seal!.versionId],
    );
    const handoff = HandoffCommercialDirection.parse(JSON.parse(handoffDocument.rows[0].content));
    expect(handoff.downstream.m11Permission).toBe("granted");
    expect(handoff.downstream.direction.decisionState).toBe("client-approved");
    expect(handoff.downstream.direction.activeConsequenceIds).toEqual(["c1"]);
    expect(handoff.downstream.strategyRef.hash).toBe(session.seal!.hash);

    const loaded = await service.load(await scope("read"), created.id);
    expect(loaded.sealCheck?.valid).toBe(true);
  } finally {
    await db.close();
  }
});

test("An analysis-only permission cannot seal: the decision gate refuses", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createCDService({
      repository,
      validateSource: async (_scope, record) => {
        validateCDSource(record);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "cd-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    for (const stage of ["inheritance", "horizon", "recommendation", "route", "moves", "sequence", "portfolio", "exclusions", "evidence"] as const) {
      session = (await service.confirm(await scope("approve"), command("confirm", { stage, payload: data[stage] }))).payload;
    }
    await expect(
      service.decide(await scope("approve"), command("decide", { decision: decision({ executionPermission: "analysis-only" }) })),
    ).rejects.toThrow("did not pass");
  } finally {
    await db.close();
  }
});
