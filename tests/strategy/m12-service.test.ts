import { test, expect } from "bun:test";
import { randomUUID, createHash } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM12Service } from "../../src/lib/modules/strategy/server/stages/m12/service";
import { validateM12Source, M12_SOURCE_SLOT } from "../../src/lib/modules/strategy/server/stages/m12/source";
import { createStrategyTestDatabase } from "./db";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const handoff = {
  versionId: "cd-version-1",
  hash: sha("cd"),
  approvalState: "client-approved",
  envelope: {},
  downstream: {
    m11Permission: "granted",
    reasons: [],
    strategyRef: { runId: "cd-session-1", versionId: "cd-version-1", hash: sha("cd") },
    direction: {
      directionId: "cd-session-1",
      version: "7",
      decisionState: "client-approved",
      executionPermission: "controlled-90-day",
      directionalHorizon: "12 months",
      horizonRationale: "Long enough.",
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
    },
    claimsBoundary: { canClaim: ["Outcomes are published quarterly"], mustQualify: [], cannotClaim: ["Most reliable"] },
    invalidationTriggers: ["The register is not read"],
  },
};

const plans = {
  plans: [
    {
      consequenceId: "c1",
      quantity: "One register per quarter",
      operationalTarget: "Publish Q1 register by day 30",
      capacityAssumption: "Existing team",
      owner: "Synthetic Owner",
      threshold: "Ten prospect reads in the first cycle",
      thresholdRationale: "Below ten the proof is not inspected.",
    },
  ],
};

function source() {
  const tuple = {
    m11: {
      sessionId: "m11-session",
      seal: { versionId: "m11-version", hash: sha("m11"), at: "2026-10-29T12:00:00.000Z" },
      data: {
        plans,
        decision: { thresholds: ["Ten prospect reads"], reviewEvent: "End of the first controlled cycle" },
        review: { verdict: "pass" },
        clientDecision: { response: "accept" },
        capability: "full-standard",
      },
      sources: { cd: { sessionId: "cd-session-1", seal: { versionId: "cd-version-1", hash: sha("cd") }, handoff } },
    },
    cd: { sessionId: "cd-session-1", seal: { versionId: "cd-version-1", hash: sha("cd") }, handoff },
  };
  const print = sha(JSON.stringify(tuple));
  const body = {
    folder: "synthetic-brand",
    entry: {
      receipt: {
        version: 1,
        receiptId: `${print.slice(0, 8)}-${print.slice(8, 12)}-4${print.slice(13, 16)}-8${print.slice(17, 20)}-${print.slice(20, 32)}`,
        chainFingerprint: print,
        approvedBy: { name: "Sealed cycle", role: "client decision", authorityRef: "m11-session" },
        approvedAt: "2026-10-29T12:00:00.000Z",
      },
    },
    ...tuple,
  };
  return { id: randomUUID(), slot: M12_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

const payloads = () => ({
  inheritance: {
    quantities: [{ consequenceId: "c1", quantity: "One register per quarter", threshold: "Ten prospect reads in the first cycle" }],
    owners: [{ area: "Proof", owner: "Synthetic Owner" }],
    strategicRoute: "Evidence-led direct",
    proofActions: ["Live register URL"],
    reviewEvent: "End of the first controlled cycle",
    cycleVersion: { versionId: "m11-version", hash: sha("m11") },
    directionVersionId: "cd-version-1",
  },
  assets: {
    assets: [{ id: "as1", name: "Register template", kind: "document", state: "available" as const, owner: "Synthetic Owner", dependency: "" }],
  },
  rhythm: {
    weeklyCadence: "Monday stand-up, Friday check",
    checkpoints: [{ name: "Week 1", when: "Day 7", purpose: "Register drafted" }],
    reviewForum: "Monthly review",
    escalation: "Founder",
  },
  schedule: {
    items: [
      { id: "s1", consequenceId: "c1", work: "Publish the register", owner: "Synthetic Owner", start: "Day 1", due: "Day 30", dependency: "", proofAction: "Live register URL" },
    ],
  },
  response: {
    protocols: [{ id: "r1", trigger: "Register not published by day 30", response: "escalate" as const, owner: "Synthetic Owner", note: "" }],
  },
  scorecard: {
    measures: [
      { consequenceId: "c1", measure: "Prospect reads", target: "Ten", current: "0", source: "Analytics", reviewCadence: "Weekly" },
    ],
  },
  rules: {
    operatingRules: ["Nothing publishes without evidence"],
    definitionOfDone: "Register live and linked from the evidence index",
    qualityBar: "Every figure traceable",
    handoffRule: "Hand to the review forum with the register link",
  },
  checklist: {
    items: [
      { id: "cl1", work: "Publish the register", readyCriteria: ["Data collected"], doneCriteria: ["Live and linked"], blockedIf: "No data" },
    ],
  },
  transition: {
    closeOut: "Close with the register live and the read count recorded.",
    reviewInputs: ["Register link", "Read count"],
    carryOver: ["Second register"],
    nextCycleTrigger: "End of the first controlled cycle",
  },
});

const review = (candidateHash: string) => ({
  reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
  candidateHash,
  lenses: ["quantity-fidelity", "schedule-feasibility", "dependency-honesty", "response-readiness", "tracking-honesty"].map((id) => ({ id, result: "pass" as const, note: "" })),
  findings: [],
  alternative: { offered: true, alternative: "A smaller cycle.", whyNotStronger: "It tests less." },
  verdict: "pass" as const,
  verdictBasis: "Faithful to the cycle.",
  ranAt: "2026-10-29T12:00:00.000Z",
});

async function harness() {
  const db = await createStrategyTestDatabase();
  const repository = new StrategyRepository(db.pool);
  const access = createStrategyAccess(async (request) => ({
    actorId: "synthetic-m12-operator",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: request.engagementId,
  }));
  const scope = (action: StrategyAction) =>
    access.authorize({ organisationId: "m12-org", brandId: "m12-brand", engagementId: "m12-engagement", action });
  await repository.createEngagement(await scope("manage"), { id: "m12-engagement", label: "Synthetic M12" });
  await repository.setSource(await scope("manage"), source());
  return { db, repository, scope };
}

test("M12 runs the full flow to an independently reviewed, sealed working cycle", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createM12Service({
      repository,
      validateSource: async (_scope, record) => {
        validateM12Source(record);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: data[stage as keyof typeof data], model: "synthetic-m12-model" } };
        return { review: { review: review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m12-create" });
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

    for (const [stage, next] of [
      ["inheritance", "assets"],
      ["assets", "rhythm"],
      ["rhythm", "schedule"],
      ["schedule", "response"],
      ["response", "scorecard"],
      ["scorecard", "rules"],
      ["rules", "checklist"],
      ["checklist", "transition"],
      ["transition", "checks"],
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

test("M12 refuses a quantity that differs from the sealed cycle", async () => {
  const { db, repository, scope } = await harness();
  try {
    const data = payloads();
    const service = createM12Service({
      repository,
      validateSource: async (_scope, record) => {
        validateM12Source(record);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m12-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const broken = { ...data.inheritance, quantities: [{ consequenceId: "c1", quantity: "Two registers per quarter", threshold: "Ten prospect reads in the first cycle" }] };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "inheritance", payload: broken })),
    ).rejects.toThrow("differs from the sealed cycle");
  } finally {
    await db.close();
  }
});
