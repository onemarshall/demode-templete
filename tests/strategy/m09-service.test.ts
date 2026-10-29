import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM09Service } from "../../src/lib/modules/strategy/server/stages/m09/service";
import { validateM09Source } from "../../src/lib/modules/strategy/server/stages/m09/source";
import { createStrategyTestDatabase } from "./db";
import {
  m09Briefs,
  m09Comparison,
  m09Destinations,
  m09Direction,
  m09Gates,
  m09Inheritance,
  m09Measurement,
  m09Review,
  m09Source,
} from "./fixtures/m09";

test("M09 runs the full flow to an independently reviewed, sealed digital direction", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m09-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m09-org", brandId: "m09-brand", engagementId: "m09-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m09-engagement", label: "Synthetic M09" });
    await repository.setSource(await scope("manage"), m09Source());

    const payloads: Record<string, unknown> = {
      inheritance: m09Inheritance(),
      direction: m09Direction(),
      destinations: m09Destinations(),
      gates: m09Gates(),
      comparison: m09Comparison(),
      briefs: m09Briefs(),
      measurement: m09Measurement(),
    };

    const service = createM09Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM09Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m09-model" } };
        return { review: { review: m09Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m09-create" });
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

    const order: [string, string][] = [
      ["inheritance", "direction"],
      ["direction", "destinations"],
      ["destinations", "gates"],
      ["gates", "comparison"],
      ["comparison", "briefs"],
      ["briefs", "measurement"],
      ["measurement", "checks"],
    ];
    for (const [stage, next] of order) {
      session = (await service.draft(await scope("generate"), command("draft", { stage }))).payload;
      session = (await service.confirm(await scope("approve"), command("confirm", { stage, payload: payloads[stage] }))).payload;
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
    const documents = await db.pool.query("SELECT kind FROM strategy_document WHERE version_id=$1 ORDER BY kind", [
      session.seal!.versionId,
    ]);
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual(["digital-direction", "receipt"]);
    expect((await service.load(await scope("read"), created.id)).sealCheck?.valid).toBe(true);

    const successor = await service.successor(await scope("edit"), {
      action: "successor",
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      reason: "Synthetic successor.",
    });
    expect(successor.payload.stage).toBe("eligibility");
  } finally {
    await db.close();
  }
});

test("M09 refuses a decision whose chosen option was never offered", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m09-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m09-org", brandId: "m09-brand", engagementId: "m09-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m09-engagement", label: "Synthetic M09 refusal" });
    await repository.setSource(await scope("manage"), m09Source());
    const service = createM09Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM09Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m09-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const broken = m09Gates();
    broken.decisions[0] = { ...broken.decisions[0]!, chosen: "An option never offered" };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "gates", payload: broken })),
    ).rejects.toThrow("Session is at inheritance, not gates");
  } finally {
    await db.close();
  }
});
