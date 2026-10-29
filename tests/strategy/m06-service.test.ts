import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM06Service } from "../../src/lib/modules/strategy/server/stages/m06/service";
import { validateM06Source } from "../../src/lib/modules/strategy/server/stages/m06/source";
import { createStrategyTestDatabase } from "./db";
import {
  m06Activation,
  m06Audience,
  m06Expressions,
  m06Foundation,
  m06Inheritance,
  m06Measurement,
  m06Positioning,
  m06Review,
  m06Routes,
  m06Source,
} from "./fixtures/m06";

test("M06 runs the full flow to an independently reviewed, sealed marketing strategy", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m06-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m06-org", brandId: "m06-brand", engagementId: "m06-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m06-engagement", label: "Synthetic M06" });
    await repository.setSource(await scope("manage"), m06Source());

    const payloads: Record<string, unknown> = {
      inheritance: m06Inheritance(),
      foundation: m06Foundation(),
      audience: m06Audience(),
      positioning: m06Positioning(),
      expressions: m06Expressions(),
      routes: m06Routes(),
      activation: m06Activation(),
      measurement: m06Measurement(),
    };

    const service = createM06Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM06Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m06-model" } };
        return { review: { review: m06Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m06-create" });
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
    expect((await service.load(await scope("read"), created.id)).upstreamCurrent).toBe(true);

    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    expect(session.stage).toBe("inheritance");

    const order: [string, string][] = [
      ["inheritance", "foundation"],
      ["foundation", "audience"],
      ["audience", "positioning"],
      ["positioning", "expressions"],
      ["expressions", "routes"],
      ["routes", "activation"],
      ["activation", "measurement"],
      ["measurement", "checks"],
    ];
    for (const [stage, next] of order) {
      session = (await service.draft(await scope("generate"), command("draft", { stage }))).payload;
      expect(session.stage).toBe(stage as never);
      session = (await service.confirm(await scope("approve"), command("confirm", { stage, payload: payloads[stage] }))).payload;
      expect(session.stage).toBe(next as never);
    }

    session = (await service.runChecks(await scope("approve"), command("run-checks"))).payload;
    expect(session.stage).toBe("review");
    expect(session.candidateHash).toBeTruthy();
    const checks = session.data.checks as { gates: { result: string }[] };
    expect(checks.gates.every((gate) => gate.result === "pass")).toBe(true);

    session = (await service.review(await scope("generate"), command("review"))).payload;
    expect(session.stage).toBe("client-decision");
    expect((session.data.review as { verdict: string }).verdict).toBe("pass");

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
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual(["marketing-strategy", "receipt"]);

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

test("M06 refuses a stage confirmation that fails its own checks", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m06-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m06-org", brandId: "m06-brand", engagementId: "m06-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m06-engagement", label: "Synthetic M06 refusal" });
    await repository.setSource(await scope("manage"), m06Source());
    const service = createM06Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM06Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m06-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const thin = m06Inheritance();
    thin.meaningRecords[0] = { ...thin.meaningRecords[0]!, interpretation: "" };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "inheritance", payload: thin })),
    ).rejects.toThrow("has no interpretation");

    const duplicated = m06Expressions();
    duplicated.statements[1] = { ...duplicated.statements[1]!, text: duplicated.statements[0]!.text };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "expressions", payload: duplicated })),
    ).rejects.toThrow("Session is at inheritance, not expressions");
  } finally {
    await db.close();
  }
});
