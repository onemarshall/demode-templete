import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM08Service } from "../../src/lib/modules/strategy/server/stages/m08/service";
import { validateM08Source } from "../../src/lib/modules/strategy/server/stages/m08/source";
import { createStrategyTestDatabase } from "./db";
import {
  m08Claims,
  m08Compliance,
  m08Distribution,
  m08Gaps,
  m08Inheritance,
  m08Library,
  m08Measures,
  m08Mission,
  m08Operations,
  m08Pillars,
  m08Production,
  m08Review,
  m08SalesMap,
  m08Source,
} from "./fixtures/m08";

test("M08 runs the full flow to an independently reviewed, sealed content strategy", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m08-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m08-org", brandId: "m08-brand", engagementId: "m08-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m08-engagement", label: "Synthetic M08" });
    await repository.setSource(await scope("manage"), m08Source());

    const payloads: Record<string, unknown> = {
      inheritance: m08Inheritance(),
      mission: m08Mission(),
      pillars: m08Pillars(),
      library: m08Library(),
      gaps: m08Gaps(),
      "sales-map": m08SalesMap(),
      claims: m08Claims(),
      distribution: m08Distribution(),
      production: m08Production(),
      measures: m08Measures(),
      operations: m08Operations(),
      compliance: m08Compliance(),
    };

    const service = createM08Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM08Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m08-model" } };
        return { review: { review: m08Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m08-create" });
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

    const order: [string, string][] = [
      ["inheritance", "mission"],
      ["mission", "pillars"],
      ["pillars", "library"],
      ["library", "gaps"],
      ["gaps", "sales-map"],
      ["sales-map", "claims"],
      ["claims", "distribution"],
      ["distribution", "production"],
      ["production", "measures"],
      ["measures", "operations"],
      ["operations", "compliance"],
      ["compliance", "checks"],
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
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual(["content-strategy", "receipt"]);
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

test("M08 refuses a pillar set with fewer than three pillars", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m08-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m08-org", brandId: "m08-brand", engagementId: "m08-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m08-engagement", label: "Synthetic M08 refusal" });
    await repository.setSource(await scope("manage"), m08Source());
    const service = createM08Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM08Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m08-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const thin = { pillars: m08Pillars().pillars.slice(0, 2) };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "pillars", payload: thin })),
    ).rejects.toThrow("Session is at inheritance, not pillars");
  } finally {
    await db.close();
  }
});
