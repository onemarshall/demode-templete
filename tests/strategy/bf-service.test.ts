import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createBFService } from "../../src/lib/modules/strategy/server/stages/bf/service";
import { validateBFSource } from "../../src/lib/modules/strategy/server/stages/bf/source";
import { createStrategyTestDatabase } from "./db";
import { bfAssessment, bfDocument, bfManifesto, bfSource } from "./fixtures/bf";

test("BF database service preserves the pinned chain, stage confirmations, the review gate and the immutable seal", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-bf-operator",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) =>
      access.authorize({
        organisationId: "bf-org",
        brandId: "bf-brand",
        engagementId: "bf-engagement",
        action,
      });
    await repository.createEngagement(await scope("manage"), {
      id: "bf-engagement",
      label: "Synthetic BF service regression",
    });
    const source = bfSource();
    await repository.setSource(await scope("manage"), source);

    const candidates: Record<string, unknown> = {
      assessment: bfAssessment(),
      manifesto: bfManifesto(),
      document: bfDocument(),
    };
    const service = createBFService({
      repository,
      validateSource: async (_scope, record) => {
        validateBFSource(record);
      },
      generate: async ({ action, stage }) => {
        if (action === "draft")
          return { draft: { candidate: candidates[stage!], model: "synthetic-bf-model" } };
        if (action === "fresh-review")
          return {
            review: {
              model: "synthetic-reviewer",
              findings: [
                {
                  classification: "honest-unknown",
                  finding: "The document does not name the review cadence.",
                },
              ],
            },
          };
        return { recheck: { result: "pass", note: "Faithful to the sources.", model: "synthetic-reviewer" } };
      },
    });

    const created = await service.create(await scope("edit"), {
      action: "create",
      commandId: "bf-create",
    });
    let session = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action,
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      ...fields,
    });

    expect(session.stage).toBe("assessment");
    expect(session.drafts.assessment.rows).toHaveLength(16);
    expect(session.drafts.assessment.rows.every((row: { state: string }) => row.state === "partial")).toBe(true);
    const loaded = await service.load(await scope("read"), created.id);
    expect(loaded.upstreamCurrent).toBe(true);
    expect(loaded.gate.downstreamGateState).toBe("blocked");

    session = (await service.confirm(await scope("approve"), command("confirm", { stage: "assessment", payload: bfAssessment() }))).payload;
    expect(session.stage).toBe("manifesto");
    expect(session.confirmations.assessment).toBeDefined();

    const manifestoDraft = await service.draft(await scope("generate"), command("draft", { stage: "manifesto" }));
    session = manifestoDraft.payload;
    expect(session.stage).toBe("manifesto");
    expect(session.drafts.manifesto).toMatchObject({ model: "synthetic-bf-model" });
    session = (await service.confirm(await scope("approve"), command("confirm", { stage: "manifesto", payload: bfManifesto() }))).payload;
    expect(session.stage).toBe("document");

    session = (await service.draft(await scope("generate"), command("draft", { stage: "document" }))).payload;
    session = (await service.confirm(await scope("approve"), command("confirm", { stage: "document", payload: bfDocument() }))).payload;
    expect(session.stage).toBe("client-decision");

    // The gate is still closed: no review, no decision.
    expect((await service.load(await scope("read"), created.id)).gate.m05Permission).toBe("denied");

    session = (await service.draft(await scope("generate"), command("fresh-review"))).payload;
    expect(session.review.findings).toHaveLength(1);
    expect(session.review.findings[0].disposition).toBe("pending");

    await expect(
      service.draft(await scope("generate"), command("recheck")),
    ).rejects.toThrow("Give every finding a disposition before the recheck.");

    session = (
      await service.resolveFinding(
        await scope("approve"),
        command("resolve-finding", {
          findingId: session.review.findings[0].id,
          disposition: "corrected-locally",
          note: "Named the cadence.",
        }),
      )
    ).payload;
    session = (await service.draft(await scope("generate"), command("recheck"))).payload;
    expect(session.review.recheck.result).toBe("pass");

    // A decision from anyone other than the named owner is refused.
    await expect(
      service.decide(
        await scope("approve"),
        command("decide", {
          decision: {
            response: "approve",
            businessConfirmed: true,
            standConfirmed: true,
            approver: { name: "Someone Else", role: "Owner", authorityRef: "synthetic-authority-1" },
            exactResponse: "Approved.",
            revisionNote: "",
            disputedField: "",
            returnOwner: null,
          },
        }),
      ),
    ).rejects.toThrow("must be the named decision owner");

    const sealed = await service.decide(
      await scope("approve"),
      command("decide", {
        decision: {
          response: "approve",
          businessConfirmed: true,
          standConfirmed: true,
          approver: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
          exactResponse: "Approved as written.",
          revisionNote: "",
          disputedField: "",
          returnOwner: null,
        },
      }),
    );
    session = sealed.payload;
    expect(session.stage).toBe("sealed");
    expect(session.status).toBe("sealed");
    expect(session.seal).toBeTruthy();
    expect(session.gate.downstreamGateState).toBe("open");
    expect(session.gate.m05Permission).toBe("granted");

    const versions = await db.pool.query(
      "SELECT count(*)::int AS count FROM strategy_version WHERE session_id=$1",
      [created.id],
    );
    expect(versions.rows[0].count).toBe(1);
    const documents = await db.pool.query(
      "SELECT kind FROM strategy_document WHERE version_id=$1 ORDER BY kind",
      [session.seal.versionId],
    );
    expect(documents.rows.map((row: { kind: string }) => row.kind)).toEqual([
      "business-foundation",
      "foundation-declaration-source",
      "receipt",
    ]);

    const sealedLoad = await service.load(await scope("read"), created.id);
    expect(sealedLoad.sealCheck?.valid).toBe(true);
    expect(sealedLoad.rendered).toContain("Synthetic Repair Co");

    await expect(
      service.confirm(await scope("approve"), command("confirm", { stage: "document", payload: bfDocument() })),
    ).rejects.toThrow("sealed");

    const successor = await service.successor(await scope("edit"), {
      action: "successor",
      sessionId: created.id,
      expectedRevision: session.revision,
      commandId: randomUUID(),
      reason: "Synthetic successor for regression coverage.",
    });
    expect(successor.payload.parentSessionId).toBe(created.id);
    expect(successor.payload.stage).toBe("assessment");
    expect(successor.payload.sourceHash).toBe(session.sourceHash);
  } finally {
    await db.close();
  }
});
