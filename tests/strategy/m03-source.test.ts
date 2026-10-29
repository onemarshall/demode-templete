import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import {
  CollectionRecord,
  M02Session,
  ReconLog,
  type M02Session as M02SessionType,
  type ReconLog as ReconLogType,
} from "../../src/lib/modules/strategy/server/stages/m02/session";
import { M02Record } from "../../src/lib/modules/strategy/server/stages/m02/service";
import { makeM02Seal } from "../../src/lib/modules/strategy/server/stages/m02/seal";
import { createM03Upstream } from "../../src/lib/app/strategy-m03-source.server";
import { createStrategyTestDatabase } from "./db";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const now = "2026-10-29T12:00:00.000Z";
const m01SessionId = "11111111-1111-4111-8111-111111111111";
const m02SessionId = "22222222-2222-4222-8222-222222222222";

const claimsBoundaryInputs = {
  canClaim: ["Evidence can be inspected"],
  mustQualify: ["Outcomes vary by cohort"],
  cannotClaim: ["Guaranteed revenue"],
};
const m01Inputs = {
  sessionId: m01SessionId,
  sealedAt: "2026-10-29T10:00:00.000Z",
  coreBelief: "Visible proof changes buying decisions.",
  brokenThing: "The market rewards shallow proof.",
  hiddenTruth: "Buyers need observable evidence.",
  marketDeployableHiddenTruth: "Buyers choose evidence they can inspect.",
  nonNegotiable: "We will not make unsupported claims.",
  hardWonTeaching: "Proof must be visible in use.",
  legacy: "A market that trusts what it can verify.",
  claimsBoundaryInputs,
};
const outputsHash = sha("synthetic m01 canonical outputs");

function m02Session(stage: "sealed"): M02SessionType {
  return M02Session.parse({
    module: "02",
    sessionId: m02SessionId,
    folder: "synthetic-brand",
    createdAt: now,
    updatedAt: now,
    stage,
    m01: { sessionId: m01SessionId, sealedAt: m01Inputs.sealedAt, outputsHash },
    route: "full",
    routeStatus: "confirmed",
    routeReason: "",
    research: {},
    evidenceReview: {
      receiptId: "7e93feda-2cbc-465e-a38d-e9657ea42e3e",
      by: "synthetic-operator",
      at: now,
      disposition: "sufficient_for_provisional",
      rationale: "Synthetic review.",
      basisHash: "d".repeat(64),
      entanglement: { pass: true, problems: [] },
      evidenceProblems: [],
    },
    progressionDecision: {
      receiptId: "eb76e3ea-5ff8-4bec-89db-e457d7fc0a46",
      by: "synthetic-operator",
      at: now,
      outcome: "provisional_a",
      statement: "Synthetic decision.",
      basisHash: "d".repeat(64),
      evidenceReceiptId: "7e93feda-2cbc-465e-a38d-e9657ea42e3e",
    },
  });
}

function recon(outcome: "provisional_a" | "outcome_b", flags: string[] = []): ReconLogType {
  const base = ReconLog.parse({
    module: "02",
    sessionId: m02SessionId,
    producedAt: now,
    updatedAt: now,
    m01Inputs,
  });
  return ReconLog.parse({
    ...base,
    gate1: {
      ...base.gate1,
      descriptiveDefault: "Competitors sell feature lists.",
      cohort: "UK independent repair shops",
      concentration: "competitive",
      verdict: "pass",
      decodes: [
        {
          competitor: "Acme",
          beliefs: [{ belief: "More features win", confidence: "medium", vulnerability: "Unverified" }],
        },
      ],
    },
    gate2: {
      ...base.gate2,
      vulnerabilityEvidence: "Synthetic vulnerability.",
      defendersCase: "Synthetic defence.",
      rebuttal: "Synthetic rebuttal.",
      verdict: "pass",
    },
    gate3: {
      ...base.gate3,
      painProfile: {
        trigger: "A failed repair",
        hack: "Manual workaround",
        pain: "Rework cost",
        limitingBelief: "Only big vendors can prove quality",
        traceToDefault: "Feature lists stand in for proof",
      },
      verdict: "pass",
    },
    gate4: { ...base.gate4, priceRange: "Synthetic range", evidence: "Synthetic willingness.", verdict: "pass" },
    gate5: {
      ...base.gate5,
      risks: [
        {
          pattern: "r1",
          state: "present",
          evidence: "Synthetic risk evidence.",
          severity: "material",
          mitigationRouting: "m03",
          acknowledgment: { line: "Synthetic acknowledgment", declined: false, dispute: "" },
        },
      ],
    },
    gate6: {
      a: { ...base.gate6.a, implication: "Proof must be inspectable.", verdict: "pass" },
      b: { ...base.gate6.b, traceSentence: "The vacuum traces to the hidden truth.", standsWithoutTruth: false, verdict: "pass" },
    },
    terrain: { ...base.terrain, diagnosis: "ambiguous-needs-evidence", trajectory: "stable", tam: "Unknown", tailwind: "Synthetic tailwind" },
    secondVoice: { ...base.secondVoice, foundersProblem: "Synthetic founder problem." },
    contrarianTrap: { ...base.contrarianTrap, flags },
    synthesis: { ...base.synthesis, outcome, statement: "Synthetic sealed outcome.", acknowledgedRisks: [] },
    state: { ...base.state, relianceScope: "Module 03 hypothesis work only" },
  });
}

async function sealM02(
  pool: import("pg").Pool,
  repository: StrategyRepository,
  scope: () => Promise<import("../../src/lib/modules/strategy/server/access").StrategyScope>,
  options: { outcome?: "provisional_a" | "outcome_b"; flags?: string[] } = {},
) {
  const session = m02Session("sealed");
  const record = M02Record.parse({
    revision: 1,
    session,
    recon: recon(options.outcome ?? "provisional_a", options.flags ?? []),
    artifacts: { artifacts: [] },
    collection: CollectionRecord.parse({
      collectionId: "collection-1",
      state: "completed",
      updatedAt: now,
    }),
    seal: null,
    sourceVersionId: "m01-source-version",
    sourceHash: outputsHash,
    history: [],
  });
  const receipt = makeM02Seal(record, "synthetic-operator", now);
  record.seal = receipt;
  const rendered = "# Synthetic sealed market reality";
  const canonicalPayload = JSON.stringify({
    receipt,
    snapshots: {
      session: record.session,
      recon: record.recon,
      artifacts: record.artifacts,
      collection: record.collection,
    },
    lineage: { parentSessionId: null, successorReason: "" },
    source: { versionId: record.sourceVersionId, hash: record.sourceHash },
    rendered,
    renderedHash: sha(rendered),
  });
  const sealHash = sha(canonicalPayload);
  await repository.createSession(await scope(), {
    id: m02SessionId,
    stage: "m02",
    payload: M02Record.parse({ ...record, seal: receipt }),
  });
  await pool.query(
    `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,session_id,revision,canonical_payload,seal_hash,hash_algorithm)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    ["org", "brand", "engagement", receipt.receiptId, m02SessionId, 1, canonicalPayload, sealHash, "sha256-json-stringify-v1"],
  );
}

test("M03 derives its upstream from the newest sealed M02 version and pins it", async () => {
  const db = await createStrategyTestDatabase();
  try {
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
    await repository.createEngagement(await scope(), { id: "engagement", label: "Synthetic M03 source" });
    await repository.setSource(await scope(), {
      id: "m01-source-version",
      slot: "m01-input",
      body: { outputsHash },
      hash: outputsHash,
    });
    await sealM02(db.pool, repository, scope);

    const upstream = createM03Upstream(db.pool);
    await upstream.connect(await scope("edit"));
    const head = await repository.getSource(await scope("read"), "m03-m02");
    expect(head).toBeTruthy();
    const body = head!.body as {
      m02SessionId: string;
      m02Outcome: string;
      m01: { sessionId: string; lockState: string };
      m01Inputs: { coreBelief: string };
      m02Findings: { descriptiveDefault: string };
      carriedForward: { acknowledgedRisks: { landedIn: string | null; routing: string }[] };
    };
    expect(body.m02SessionId).toBe(m02SessionId);
    expect(body.m02Outcome).toBe("provisional_a");
    expect(body.m01).toMatchObject({ sessionId: m01SessionId, lockState: "locked" });
    expect(body.m01Inputs.coreBelief).toBe(m01Inputs.coreBelief);
    expect(body.m02Findings.descriptiveDefault).toBe("Competitors sell feature lists.");
    expect(body.carriedForward.acknowledgedRisks[0]).toMatchObject({
      routing: "m03",
      landedIn: null,
    });

    // Validation re-derives and compares the same bytes.
    await upstream.validate(await scope("read"), head!);

    // The M01 head moving invalidates the derived source.
    await repository.setSource(await scope(), {
      id: "m01-source-version-2",
      slot: "m01-input",
      body: { outputsHash: sha("changed m01 outputs") },
      hash: sha("changed m01 outputs"),
    });
    await expect(upstream.validate(await scope("read"), head!)).rejects.toThrow(
      "The Founder Conviction version pinned by Market Reality is no longer current.",
    );
  } finally {
    await db.close();
  }
});

test("M03 refuses an M02 seal whose outcome is not A, and a contrarian-trap flag", async () => {
  const db = await createStrategyTestDatabase();
  try {
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
    await repository.createEngagement(await scope(), { id: "engagement", label: "Synthetic M03 refusal" });
    await repository.setSource(await scope(), {
      id: "m01-source-version",
      slot: "m01-input",
      body: { outputsHash },
      hash: outputsHash,
    });
    await sealM02(db.pool, repository, scope, { outcome: "outcome_b" });
    const upstream = createM03Upstream(db.pool);
    await expect(upstream.connect(await scope("edit"))).rejects.toThrow(
      "did not return Outcome A",
    );
  } finally {
    await db.close();
  }
});
