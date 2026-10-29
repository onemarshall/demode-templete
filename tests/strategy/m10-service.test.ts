import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM10Service } from "../../src/lib/modules/strategy/server/stages/m10/service";
import { validateM10Source } from "../../src/lib/modules/strategy/server/stages/m10/source";
import { createStrategyTestDatabase } from "./db";
import {
  m10Artefact,
  m10Behaviours,
  m10Context,
  m10Inheritance,
  m10Measurement,
  m10OperatingModel,
  m10Resonance,
  m10Review,
  m10Routes,
  m10Spatial,
  m10Source,
} from "./fixtures/m10";

test("M10 runs the full flow to an independently reviewed, sealed digital direction", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m10-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m10-org", brandId: "m10-brand", engagementId: "m10-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m10-engagement", label: "Synthetic M10" });
    await repository.setSource(await scope("manage"), m10Source());

    const payloads: Record<string, unknown> = {
      inheritance: m10Inheritance(),
      spatial: m10Spatial(),
      resonance: m10Resonance(),
      behaviours: m10Behaviours(),
      context: m10Context(),
      "operating-model": m10OperatingModel(),
      routes: m10Routes(),
      artefact: m10Artefact(),
      measurement: m10Measurement(),
    };

    const service = createM10Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM10Source(source);
      },
      generate: async ({ action, stage, session }) => {
        if (action === "draft") return { draft: { candidate: payloads[stage!], model: "synthetic-m10-model" } };
        return { review: { review: m10Review(session.candidateHash!), model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), { action: "create", commandId: "m10-create" });
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
      ["inheritance", "spatial"],
      ["spatial", "resonance"],
      ["resonance", "behaviours"],
      ["behaviours", "context"],
      ["context", "operating-model"],
      ["operating-model", "routes"],
      ["routes", "artefact"],
      ["artefact", "measurement"],
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
    expect(documents.rows.map((row: { kind: string }) => row.kind).sort()).toEqual(["receipt", "visual-identity"]);
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

test("M10 refuses a route that cites an unknown artefact", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m10-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({ organisationId: "m10-org", brandId: "m10-brand", engagementId: "m10-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m10-engagement", label: "Synthetic M10 refusal" });
    await repository.setSource(await scope("manage"), m10Source());
    const service = createM10Service({
      repository,
      validateSource: async (_scope, source) => {
        validateM10Source(source);
      },
    });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m10-create-2" });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });
    session = (await service.confirmEligibility(await scope("approve"), command("confirm-eligibility"))).payload;

    const broken = m10Routes();
    broken.routes[0] = { ...broken.routes[0]!, artefactId: "unknown-artefact" };
    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "routes", payload: broken })),
    ).rejects.toThrow("Session is at inheritance, not routes");
  } finally {
    await db.close();
  }
});
