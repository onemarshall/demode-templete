import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM05Service } from "../../src/lib/modules/strategy/server/stages/m05/service";
import { validateM05Source } from "../../src/lib/modules/strategy/server/stages/m05/source";
import { createStrategyTestDatabase } from "./db";
import {
  m05Audience,
  m05Character,
  m05Expression,
  m05Identity,
  m05Inheritance,
  m05Packet,
  m05Review,
  m05Semantic,
  m05Synthesis,
  m05Source,
} from "./fixtures/m05";

test("M05 database service runs the full flow to an independently reviewed, sealed strategy", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m05-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m05-org", brandId: "m05-brand", engagementId: "m05-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m05-engagement", label: "Synthetic M05" });
    await repository.setSource(await scope("manage"), m05Source());

    const payloads: Record<string, unknown> = {
      inheritance: m05Inheritance(),
      semantic: m05Semantic(),
      identity: m05Identity(),
      audience: m05Audience(),
      character: m05Character(),
      expression: m05Expression(),
      synthesis: m05Synthesis(),
      packet: m05Packet(),
    };

    const service = createM05Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM05Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m05-model" } };
        return { review: { review: m05Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m05-create" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });

    expect(session.stage).toBe("eligibility");
    expect(session.route).toBe("full");
    expect(session.capability).toBe("full-standard");
    const loaded = await service.load(await scope("read"), created.id);
    expect(loaded.upstreamCurrent).toBe(true);

    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    expect(session.stage).toBe("inheritance");

    const order: [string, string][] = [
      ["inheritance", "semantic"],
      ["semantic", "identity"],
      ["identity", "audience"],
      ["audience", "character"],
      ["character", "expression"],
      ["expression", "synthesis"],
      ["synthesis", "packet"],
      ["packet", "checks"],
    ];
    for (const [stage, next] of order) {
      // A draft is a candidate only.
      const drafted = await service.draft(await scope("generate"), command("draft", { stage }));
      session = drafted.payload;
      expect(session.stage).toBe(stage as never);
      session = (
        await service.confirm(await scope("approve"), command("confirm", { stage, payload: payloads[stage] }))
      ).payload;
      expect(session.stage).toBe(next as never);
    }

    // Gates run, render, and freeze the candidate.
    session = (await service.runChecks(await scope("approve"), command("run-checks"))).payload;
    expect(session.stage).toBe("review");
    expect(session.candidateHash).toBeTruthy();
    expect(session.status).toBe("candidate");
    const checks = session.data.checks as { gates: { result: string }[]; coverage: { missing: string[] } };
    expect(checks.gates.every((gate) => gate.result === "pass")).toBe(true);
    expect(checks.coverage.missing).toEqual([]);

    // Gate 7 review must cover the frozen candidate.
    session = (await service.review(await scope("generate"), command("review"))).payload;
    expect(session.stage).toBe("package");
    expect((session.data.review as { verdict: string }).verdict).toBe("pass");

    session = (await service.buildPackage(await scope("approve"), command("build-package"))).payload;
    expect(session.stage).toBe("client-decision");
    expect((session.data.package as { reconciliation: string }).reconciliation).toBe("pass");

    const sealed = await service.decide(
      await scope("approve"),
      command("decide", {
        decision: {
          response: "accept",
          approver: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
          exactResponse: "Accepted as written.",
          revisionNote: "",
          returnStage: null,
          declineReason: "",
        },
      }),
    );
    session = sealed.payload;
    expect(session.stage).toBe("sealed");
    expect(session.seal).toBeTruthy();

    const documents = await db.pool.query("SELECT kind FROM strategy_document WHERE version_id=$1 ORDER BY kind", [
      session.seal!.versionId,
    ]);
    expect(documents.rows.map((row: { kind: string }) => row.kind).sort()).toEqual(
      [
        "brand-strategy",
        "brand-story",
        "executive-view",
        "practitioner-brief",
        "presentation",
        "receipt",
        "strategy-summary",
      ].sort(),
    );

    const sealedLoad = await service.load(await scope("read"), created.id);
    expect(sealedLoad.sealCheck?.valid).toBe(true);

    const successor = await service.successor(await scope("edit"), {
      action: "successor",
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      reason: "Synthetic successor.",
    });
    expect(successor.payload.parentSessionId).toBe(created.id);
    expect(successor.payload.stage).toBe("eligibility");
  } finally {
    await db.close();
  }
});

test("M05 refuses a stage confirmation that fails its own checks", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m05-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m05-org", brandId: "m05-brand", engagementId: "m05-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m05-engagement", label: "Synthetic M05 refusal" });
    await repository.setSource(await scope("manage"), m05Source());
    const service = createM05Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM05Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m05-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const broken = m05Inheritance();
    broken.engagementCheck[0] = { ...broken.engagementCheck[0]!, disposition: "missing-blocking" as never };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "inheritance", payload: broken })),
    ).rejects.toThrow("Phase 0 halts");

    const thin = m05Inheritance();
    thin.meaningRecords[0] = { ...thin.meaningRecords[0]!, interpretation: "" };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "inheritance", payload: thin })),
    ).rejects.toThrow("has no interpretation");
  } finally {
    await db.close();
  }
});
