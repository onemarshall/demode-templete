import { test, expect } from "bun:test";
import { randomUUID, createHash } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM11Service } from "../../src/lib/modules/strategy/server/stages/m11/service";
import { validateM11Source, M11_SOURCE_SLOT } from "../../src/lib/modules/strategy/server/stages/m11/source";
import { createStrategyTestDatabase } from "./db";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const direction = {
  directionId: "cd-session-1",
  version: "7",
  decisionState: "client-approved",
  executionPermission: "controlled-90-day",
  directionalHorizon: "12 months",
  horizonRationale: "Long enough to test the route.",
  twelveMonthOutcome: "Publish the register as the buying criterion.",
  priorityBuyingSituation: "After a failed repair",
  strategicRoute: "Evidence-led direct",
  strategicMoveId: "move-1",
  strategicMoveJob: "Make proof inspectable",
  firstPhaseObjective: "Publish the first register.",
  activeConsequenceIds: ["c1"],
  exclusions: ["No paid placement"],
  progressionCondition: "The register is live and read by ten prospects.",
  firstEvidenceEvent: "First register publication",
  coreAssumption: "Buyers will inspect a published register.",
  reviewEvent: "End of the first cycle",
  preCycleTest: { required: false, id: "", effect: "", resolved: "" },
};

function source() {
  const handoff = {
    versionId: "cd-version-1",
    hash: sha("cd"),
    approvalState: "client-approved",
    envelope: {},
    downstream: {
      m11Permission: "granted",
      reasons: [],
      strategyRef: { runId: "cd-session-1", versionId: "cd-version-1", hash: sha("cd") },
      direction,
      claimsBoundary: { canClaim: ["Outcomes are published quarterly"], mustQualify: [], cannotClaim: ["Most reliable"] },
      invalidationTriggers: ["The register is not read"],
    },
  };
  const tuple = {
    cd: {
      sessionId: "cd-session-1",
      seal: { versionId: "cd-version-1", hash: sha("cd"), at: "2026-10-29T12:00:00.000Z" },
      data: { decision: { decisionState: "client-approved", executionPermission: "controlled-90-day", owner: { name: "Owner", role: "Owner", authorityRef: "a" } }, capability: "full-standard" },
      handoff,
      sources: {},
    },
    m10: { sessionId: "m10-session", seal: { versionId: "m10-version", hash: sha("m10") } },
    m09: { sessionId: "m09-session", seal: { versionId: "m09-version", hash: sha("m09") } },
  };
  const print = sha(JSON.stringify(tuple));
  const body = {
    folder: "synthetic-brand",
    entry: {
      receipt: {
        version: 1,
        receiptId: `${print.slice(0, 8)}-${print.slice(8, 12)}-4${print.slice(13, 16)}-8${print.slice(17, 20)}-${print.slice(20, 32)}`,
        chainFingerprint: print,
        approvedBy: { name: "Sealed direction", role: "client decision", authorityRef: "cd-session-1" },
        approvedAt: "2026-10-29T12:00:00.000Z",
      },
    },
    ...tuple,
  };
  return { id: randomUUID(), slot: M11_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

const payloads = () => ({
  inheritance: {
    outcome: direction.twelveMonthOutcome,
    priorityAudience: direction.priorityBuyingSituation,
    strategicRoute: direction.strategicRoute,
    moveIds: ["move-1", "move-2", "move-3"],
    firstPhaseObjective: direction.firstPhaseObjective,
    progressionCondition: direction.progressionCondition,
    exclusions: direction.exclusions,
    activeConsequenceIds: direction.activeConsequenceIds,
    claimsBoundary: { canClaim: ["Outcomes are published quarterly"], mustQualify: [], cannotClaim: ["Most reliable"] },
    invalidationTriggers: ["The register is not read"],
    directionVersion: { versionId: "cd-version-1", hash: sha("cd") },
  },
  plans: {
    plans: [
      {
        consequenceId: "c1",
        quantity: "One register per quarter",
        operationalTarget: "Publish Q1 register by day 30",
        capacityAssumption: "Existing team, two days per quarter",
        owner: "Synthetic Owner",
        threshold: "Ten prospect reads in the first cycle",
        thresholdRationale: "Below ten the proof is not being inspected at all.",
      },
    ],
  },
  decision: {
    commitment: "Publish and promote the first register.",
    committedBy: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
    scope: "The first controlled cycle only.",
    thresholds: ["Ten prospect reads", "Register live by day 30"],
    reviewEvent: "End of the first controlled cycle",
    evidencePurpose: "Test whether buyers inspect published proof.",
    notCommitted: ["No paid placement", "No second register"],
  },
  actions: {
    actions: [
      { id: "a1", consequenceId: "c1", action: "Publish the register", owner: "Synthetic Owner", window: "Day 1-30", dependency: "", proofAction: "Live register URL", state: "planned" as const },
    ],
  },
  accountability: {
    owners: [{ area: "Proof", owner: "Synthetic Owner" }],
    cadence: "Weekly check, monthly review",
    escalation: "Founder",
    preservationCheck: "preserved" as const,
    preservationNote: "",
  },
});

const review = (candidateHash: string) => ({
  reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
  candidateHash,
  lenses: ["direction-fidelity", "quantity-plausibility", "capacity-realism", "action-specificity", "threshold-honesty"].map((id) => ({ id, result: "pass" as const, note: "" })),
  findings: [],
  alternative: { offered: true, alternative: "A smaller first cycle.", whyNotStronger: "It tests less." },
  verdict: "pass" as const,
  verdictBasis: "Faithful to the direction.",
  ranAt: "2026-10-29T12:00:00.000Z",
});

async function harness() {
  const db = await createStrategyTestDatabase();
  const repository = new StrategyRepository(db.pool);
  const access = createStrategyAccess(async (request) => ({
    actorId: "synthetic-m11-operator",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: request.engagementId,
  }));
  const scope = (action: StrategyAction) =>
    access.authorize({ organisationId: "m11-org", brandId: "m11-brand", engagementId: "m11-engagement", action });
  await repository.createEngagement(await scope("manage"), { id: "m11-engagement", label: "Synthetic M11" });
  await repository.setSource(await scope("manage"), source());
  return { db, repository, scope };
}

test("M11 runs the full flow to an independently reviewed, sealed commercial cycle", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createM11Service({
      repository,
      validateSource: async (_scope, record) => {
        validateM11Source(record);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: data[stage as keyof typeof data], model: "synthetic-m11-model" } };
        return { review: { review: review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m11-create" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });

    expect(session.stage).toBe("eligibility");
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    expect(session.stage).toBe("inheritance");

    for (const [stage, next] of [
      ["inheritance", "plans"],
      ["plans", "decision"],
      ["decision", "actions"],
      ["actions", "accountability"],
      ["accountability", "checks"],
    ] as const) {
      session = (await service.draft(await scope("generate"), command("draft", { stage }))).payload;
      session = (await service.confirm(await scope("approve"), command("confirm", { stage, payload: data[stage] }))).payload;
      expect(session.stage).toBe(next as never);
    }

    session = (await service.runChecks(await scope("approve"), command("run-checks"))).payload;
    expect(session.stage).toBe("review");
    expect((session.data.checks as { gates: { result: string }[] }).gates.every((gate) => gate.result === "pass")).toBe(true);

    session = (await service.review(await scope("generate"), command("review"))).payload;
    expect(session.stage).toBe("client-decision");

    const sealed = await service.decide(
      await scope("approve"),
      command("decide", {
        decision: {
          response: "accept",
          approver: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
          exactResponse: "Accepted.",
          revisionNote: "",
          returnStage: null,
          declineReason: "",
        },
      }),
    );
    session = sealed.payload;
    expect(session.stage).toBe("sealed");
    expect((await service.load(await scope("read"), created.id)).sealCheck?.valid).toBe(true);
  } finally {
    await db.close();
  }
});

test("M11 refuses a plan for a consequence the direction did not activate", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createM11Service({
      repository,
      validateSource: async (_scope, record) => {
        validateM11Source(record);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m11-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    session = (await service.confirm(await scope("approve"), command("confirm", { stage: "inheritance", payload: data.inheritance }))).payload;

    const broken = {
      plans: [
        ...data.plans.plans,
        { consequenceId: "c2", quantity: "One", operationalTarget: "x", capacityAssumption: "x", owner: "x", threshold: "x", thresholdRationale: "x" },
      ],
    };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "plans", payload: broken })),
    ).rejects.toThrow("not Active / First Phase");
  } finally {
    await db.close();
  }
});
