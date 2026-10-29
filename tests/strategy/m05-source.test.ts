import { test, expect } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
  type StrategyScope,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { Session as BFSession } from "../../src/lib/modules/strategy/server/stages/bf/contracts";
import { makeBFSeal, sealPayload } from "../../src/lib/modules/strategy/server/stages/bf/seal";
import { chainFingerprint, validateM05Source } from "../../src/lib/modules/strategy/server/stages/m05/source";
import { createM05RouteAuthority } from "../../src/lib/app/strategy-m05-route.server";
import { createM05Upstream } from "../../src/lib/app/strategy-m05-source.server";
import { createStrategyTestDatabase } from "./db";
import { bfAssessment, bfDocument, bfManifesto } from "./fixtures/bf";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const now = "2026-10-29T12:00:00.000Z";

function bfSession(gate: { downstreamGateState: "open" | "blocked"; m05Permission: "granted" | "denied" }) {
  const sessionId = randomUUID();
  const sourceHash = sha("bf-source");
  const sources = {
    folder: "brand",
    entry: {
      receipt: {
        decisionOwner: { name: "Synthetic Owner", authorityBasis: "synthetic-authority-1" },
        route: { route: "full" },
      },
    },
    m04: {
      sessionId: "66666666-6666-4666-8666-666666666666",
      sealVersionId: "77777777-7777-4777-8777-777777777777",
      sealHash: sha("m04-seal"),
      sealedAt: now,
      routeAuthorization: { decision_state: "authorised", authorised_capability: "full-standard" },
      sources: {
        entry: { receipt: { decisionOwner: { name: "Synthetic Owner", authorityBasis: "synthetic-authority-1" } } },
        m01: { sessionId: "11111111-1111-4111-8111-111111111111", outputs: { coreBelief: "Synthetic" }, handoff: { outputsHash: sha("m01") } },
        m02: { sessionId: "22222222-2222-4222-8222-222222222222", recon: { market: "UK" }, sealReceipt: { receiptId: "2222" } },
        m03: {
          session: { sessionId: "33333333-3333-4333-8333-333333333333" },
          commitments: { journey: { from: "FROM", to: "TO" } },
          sealReceipt: { receiptId: "3333" },
        },
      },
      data: { context: { businessForm: "Service" } },
    },
  };
  return BFSession.parse({
    module: "bf",
    sessionId,
    folder: "brand",
    revision: 1,
    createdAt: now,
    updatedAt: now,
    stage: "sealed",
    status: "sealed",
    sourceHash,
    sources,
    data: {
      assessment: bfAssessment(),
      manifesto: bfManifesto(),
      document: bfDocument(),
      approval: {
        response: "approve",
        businessConfirmed: true,
        standConfirmed: true,
        approver: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
        exactResponse: "Approved.",
        revisionNote: "",
        disputedField: "",
        returnOwner: null,
      },
    },
    gate: { downstreamGateState: gate.downstreamGateState, m05Permission: gate.m05Permission, reasons: [] },
  });
}

async function installSealedBF(
  pool: import("pg").Pool,
  repository: StrategyRepository,
  scope: () => Promise<StrategyScope>,
  gate: { downstreamGateState: "open" | "blocked"; m05Permission: "granted" | "denied" } = {
    downstreamGateState: "open",
    m05Permission: "granted",
  },
) {
  const session = bfSession(gate);
  const rendered = "# Sealed foundation";
  const receipt = makeBFSeal(session, session.gate!, rendered, "synthetic-operator", now);
  const sealed = BFSession.parse({
    ...session,
    seal: { versionId: receipt.receiptId, hash: receipt.sealHash, at: receipt.sealedAt, path: `database:${receipt.receiptId}` },
  });
  const canonical = JSON.stringify({
    receipt,
    payload: sealPayload(sealed, sealed.gate!),
    lineage: { parentSessionId: null, successorReason: "" },
    source: { hash: sealed.sourceHash },
    rendered,
    renderedHash: sha(rendered),
  });
  await repository.createSession(await scope(), { id: sealed.sessionId, stage: "bf", payload: sealed });
  await pool.query(
    `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,session_id,revision,canonical_payload,seal_hash,hash_algorithm)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["org", "brand", "engagement", receipt.receiptId, sealed.sessionId, 1, canonical, sha(canonical), "sha256-json-stringify-v1"],
  );
  return sealed;
}

async function harness() {
  const db = await createStrategyTestDatabase();
  const repository = new StrategyRepository(db.pool);
  const access = createStrategyAccess(async (request) => ({
    actorId: "synthetic-operator",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: request.engagementId,
  }));
  const scope = (action: StrategyAction = "manage") =>
    access.authorize({ organisationId: "org", brandId: "brand", engagementId: "engagement", action });
  await repository.createEngagement(await scope(), { id: "engagement", label: "Synthetic M05 source" });
  return { db, repository, scope };
}

test("M05 refuses to derive without a confirmed module route", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installSealedBF(db.pool, repository, scope);
    await expect(createM05Upstream(db.pool).connect(await scope("edit"))).rejects.toThrow(
      "Confirm the M05 module route",
    );
  } finally {
    await db.close();
  }
});

test("M05 derives its upstream from the sealed Foundation and the confirmed route", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installSealedBF(db.pool, repository, scope);
    const route = createM05RouteAuthority(db.pool);
    await route.confirm(await scope("edit"), { route: "full", reason: "Synthetic route confirmation." });

    const upstream = createM05Upstream(db.pool);
    await upstream.connect(await scope("edit"));
    const head = await repository.getSource(await scope("read"), "m05-bf");
    expect(head).toBeTruthy();
    const body = head!.body as {
      route: { route: string };
      entry: { receipt: { chainFingerprint: string; approvedBy: { name: string } } };
      bf: { gate: { m05Permission: string }; handoff: { downstream: { foundationRef: { hash: string } } } };
      m04: { sessionId: string };
      m01: { sessionId: string };
    };
    expect(body.route.route).toBe("full");
    expect(body.entry.receipt.approvedBy.name).toBe("Synthetic Owner");
    expect(body.bf.gate.m05Permission).toBe("granted");
    expect(body.bf.handoff.downstream.foundationRef.hash).toBe(body.bf.seal ? (body.bf.seal as { hash: string }).hash : "");
    expect(body.m04.sessionId).toBe("66666666-6666-4666-8666-666666666666");
    expect(body.m01.sessionId).toBe("11111111-1111-4111-8111-111111111111");
    const tuple = body as unknown as Parameters<typeof chainFingerprint>[0];
    expect(body.entry.receipt.chainFingerprint).toBe(chainFingerprint(tuple));

    validateM05Source(head!);
    await upstream.validate(await scope("read"), head!);
  } finally {
    await db.close();
  }
});

test("M05 refuses a sealed Foundation whose downstream gate is blocked", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installSealedBF(db.pool, repository, scope, {
      downstreamGateState: "blocked",
      m05Permission: "denied",
    });
    await createM05RouteAuthority(db.pool).confirm(await scope("edit"), {
      route: "full",
      reason: "Synthetic route confirmation.",
    });
    await expect(createM05Upstream(db.pool).connect(await scope("edit"))).rejects.toThrow(
      "downstream gate is blocked",
    );
  } finally {
    await db.close();
  }
});
