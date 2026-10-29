import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM07Service } from "../../src/lib/modules/strategy/server/stages/m07/service";
import { validateM07Source } from "../../src/lib/modules/strategy/server/stages/m07/source";
import { createStrategyTestDatabase } from "./db";
import {
  m07Claims,
  m07Conversation,
  m07Inheritance,
  m07Measurement,
  m07Objections,
  m07Qualification,
  m07Research,
  m07Review,
  m07Source,
  m07Statements,
} from "./fixtures/m07";

test("M07 runs the full flow to an independently reviewed, sealed sales strategy", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m07-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m07-org", brandId: "m07-brand", engagementId: "m07-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m07-engagement", label: "Synthetic M07" });
    await repository.setSource(await scope("manage"), m07Source());

    const payloads: Record<string, unknown> = {
      inheritance: m07Inheritance(),
      statements: m07Statements(),
      qualification: m07Qualification(),
      conversation: m07Conversation(),
      objections: m07Objections(),
      claims: m07Claims(),
      measurement: m07Measurement(),
      research: m07Research(),
    };

    const service = createM07Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM07Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m07-model" } };
        return { review: { review: m07Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m07-create" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });

    expect(session.stage).toBe("eligibility");
    expect(session.capability).toBe("full-standard");
    expect((await service.load(await scope("read"), created.id)).upstreamCurrent).toBe(true);

    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;
    expect(session.stage).toBe("inheritance");

    const order: [string, string][] = [
      ["inheritance", "statements"],
      ["statements", "qualification"],
      ["qualification", "conversation"],
      ["conversation", "objections"],
      ["objections", "claims"],
      ["claims", "measurement"],
      ["measurement", "research"],
      ["research", "checks"],
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
          exactResponse: "Accepted as written.",
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
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual(["receipt", "sales-strategy"]);
    expect((await service.load(await scope("read"), created.id)).sealCheck?.valid).toBe(true);

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

test("M07 refuses a claim that is cannot-claim but carries approved wording", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m07-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m07-org", brandId: "m07-brand", engagementId: "m07-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m07-engagement", label: "Synthetic M07 refusal" });
    await repository.setSource(await scope("manage"), m07Source());
    const service = createM07Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM07Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m07-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const broken = m07Claims();
    broken.claims[1] = { ...broken.claims[1]!, approvedWording: "We are the most reliable." };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "claims", payload: broken })),
    ).rejects.toThrow("Session is at inheritance, not claims");
  } finally {
    await db.close();
  }
});
