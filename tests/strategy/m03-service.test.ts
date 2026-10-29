import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM03Service } from "../../src/lib/modules/strategy/server/stages/m03/service";
import { validateM03Source } from "../../src/lib/modules/strategy/server/stages/m03/source";
import { verifyM03Seal } from "../../src/lib/modules/strategy/server/stages/m03/seal";
import { outcomeCheck } from "../../src/lib/modules/strategy/server/stages/m03/rules";
import { createStrategyTestDatabase } from "./db";
import { m03Bodies, m03Source } from "./fixtures/m03";

test("M03 database service preserves source pins, step confirmations, the outcome ceiling and the immutable seal", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m03-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({
        organisationId: "m03-org",
        brandId: "m03-brand",
        engagementId: "m03-engagement",
        action,
      });
    await repository.createEngagement(await scope("manage"), {
      id: "m03-engagement",
      label: "Synthetic M03 service regression",
    });
    const source = m03Source();
    await repository.setSource(await scope("manage"), source);

    const service = createM03Service({
      repository,
      validateSource: async (_scope, record) => {
        validateM03Source(record);
      },
      generate: async ({ step }) => ({ candidate: m03Bodies[step], model: "synthetic-m03-model" }),
    });

    const created = await service.create(await scope("edit"), {
      action: "create",
      commandId: "m03-create",
    });
    let record = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: record.revision,
      commandId: randomUUID(),
      ...fields,
    });

    expect(record.session.stage).toBe("upstream");
    expect(record.commitments.upstream.m01Inputs.coreBelief).toBe(
      (source.body as { m01Inputs: { coreBelief: string } }).m01Inputs.coreBelief,
    );

    const loaded = await service.load(await scope("read"), created.id);
    expect(loaded.upstreamCurrent).toBe(true);
    expect(loaded.outcomeCheck.canA).toBe(false);

    // Outcome cannot be recorded before the judgement exists.
    await expect(
      service.confirm(await scope("approve"), command("outcome", { outcome: m03Bodies.outcome })),
    ).rejects.toThrow("Session is at upstream, not judgement");

    record = (await service.confirm(await scope("edit"), command("confirm-upstream", { route: "full" })))
      .payload;
    expect(record.session.stage).toBe("inputs");

    await expect(
      service.confirm(await scope("edit"), command("confirm-upstream", { route: "skip" })),
    ).rejects.toThrow("Session is at inputs, not upstream");

    const steps: [string, unknown, string][] = [
      ["confirm-inputs", { inputs: m03Bodies.inputs }, "challenge"],
      ["confirm-challenge", { challenge: m03Bodies.challenge }, "journey"],
      ["confirm-journey", { journey: m03Bodies.journey }, "grid"],
      ["confirm-grid", { grid: m03Bodies.grid }, "proof"],
      ["confirm-proof", { proof: m03Bodies.proof }, "friction"],
      ["confirm-friction", { friction: m03Bodies.friction }, "credibility"],
      ["confirm-credibility", { credibility: m03Bodies.credibility }, "confrontations"],
      ["confirm-confrontations", { confrontations: m03Bodies.confrontations }, "cost"],
      ["confirm-cost", { cost: m03Bodies.cost }, "advocate"],
      ["confirm-advocate", { advocate: m03Bodies.advocate }, "judgement"],
    ];
    for (const [action, fields, next] of steps) {
      record = (await service.confirm(await scope("approve"), command(action, fields))).payload;
      expect(record.session.stage).toBe(next as never);
    }
    expect(record.commitments.upstream.carriedForward.acknowledgedRisks[0]!.landedIn).toBe(
      "friction",
    );

    // A draft is a candidate, never a confirmation, and never advances the stage.
    const drafted = await service.draft(await scope("generate"), {
      sessionId: created.id,
      expectedRevision: record.revision,
      commandId: randomUUID(),
      action: "draft",
      step: "judgement",
    });
    record = drafted.record;
    expect(record.session.stage).toBe("judgement");
    expect(record.drafts.judgement).toMatchObject({ model: "synthetic-m03-model" });
    expect(record.session.confirmations.judgement).toBeUndefined();

    record = (
      await service.confirm(
        await scope("approve"),
        command("confirm-judgement", { judgement: m03Bodies.judgement }),
      )
    ).payload;
    expect(record.session.stage).toBe("judgement");
    expect(record.session.confirmations.judgement).toBeDefined();
    expect(outcomeCheck(record.commitments).canA).toBe(true);

    record = (await service.confirm(await scope("approve"), command("outcome", { outcome: m03Bodies.outcome })))
      .payload;
    expect(record.commitments.outcome.outcome).toBe("a");
    expect(record.commitments.state.runtime).toBe("provisional");
    expect(record.session.stage).toBe("judgement");

    // Seal is idempotent: replaying the same command creates no second version.
    const sealCommand = command("seal");
    const sealed = await service.seal(await scope("approve"), sealCommand);
    record = sealed.payload;
    expect(record.session.stage).toBe("sealed");
    expect(record.seal?.outcome).toBe("a");
    const versions = await db.pool.query(
      "SELECT count(*)::int AS count FROM strategy_version WHERE session_id=$1",
      [created.id],
    );
    expect(versions.rows[0].count).toBe(1);
    const documents = await db.pool.query(
      "SELECT kind FROM strategy_document WHERE version_id=$1 ORDER BY kind",
      [record.seal!.receiptId],
    );
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual([
      "business-commitments",
      "receipt",
    ]);
    const replay = await service.seal(await scope("approve"), { ...sealCommand });
    expect(replay.payload.session.stage).toBe("sealed");
    const afterReplay = await db.pool.query(
      "SELECT count(*)::int AS count FROM strategy_version WHERE session_id=$1",
      [created.id],
    );
    expect(afterReplay.rows[0].count).toBe(1);

    const sealedLoad = await service.load(await scope("read"), created.id);
    expect(sealedLoad.sealVerification?.valid).toBe(true);
    const stored = await repository.getVersion(await scope("read"), record.seal!.receiptId);
    const checked = verifyM03Seal({
      sessionId: created.id,
      version: stored!,
      current: sealedLoad,
      expectedSource: { versionId: sealedLoad.sourceVersionId, hash: sealedLoad.sourceHash },
    });
    expect(checked.valid).toBe(true);

    // A sealed record accepts no further confirmations.
    await expect(
      service.confirm(await scope("approve"), command("confirm-inputs", { inputs: m03Bodies.inputs })),
    ).rejects.toThrow("sealed");

    // A successor forks from the sealed record and pins the same verified source.
    const successor = await service.successor(await scope("edit"), {
      action: "successor",
      sessionId: created.id,
      expectedRevision: record.revision,
      commandId: randomUUID(),
      reason: "Synthetic successor for regression coverage.",
    });
    expect(successor.payload.parentSessionId).toBe(created.id);
    expect(successor.payload.session.stage).toBe("upstream");
    expect(successor.payload.sourceVersionId).toBe(sealedLoad.sourceVersionId);
    expect(successor.payload.commitments.upstream.m02SessionId).toBe(
      record.commitments.upstream.m02SessionId,
    );

    // Cross-engagement reads stay denied.
    const foreign = await access.authorize({
      organisationId: "m03-org",
      brandId: "m03-brand",
      engagementId: "m03-other-engagement",
      action: "read",
    });
    await expect(service.load(foreign, created.id)).rejects.toThrow("Strategy resource not found");
  } finally {
    await db.close();
  }
});
