import { createHash, randomUUID } from "node:crypto";
import { M08_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m08/source";
import type { SourceRecord } from "../../../src/lib/modules/strategy/server/data/repository";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const DECLARATIONS = [
  "We publish the evidence behind every quality claim.",
  "We refuse paid placement in comparison content.",
  "We report outcomes every quarter.",
];
const CONVICTIONS = {
  brokenThing: "The market rewards shallow proof.",
  hiddenTruth: "Buyers need observable evidence.",
  marketDeployableHiddenTruth: "Buyers choose evidence they can inspect.",
  nonNegotiable: "We will not make unsupported claims.",
  hardWonTeaching: "Proof must be visible in use.",
  legacy: "A market that trusts what it can verify.",
  coreBelief: "Visible proof changes buying decisions.",
};
const JOURNEY = { from: "Only large vendors can prove quality.", to: "Any buyer can inspect the evidence." };

export function m08Chain(): Record<string, unknown> {
  const tuple = {
    m07: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m07-seal"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
  };
  const print = sha(JSON.stringify(tuple));
  return {
    folder: "synthetic-brand",
    route: { version: 1, module: "08", route: "full", reason: "Synthetic route.", confirmedBy: "synthetic-operator", confirmedAt: "2026-10-29T12:00:00.000Z" },
    entry: {
      receipt: {
        version: 1,
        receiptId: `${print.slice(0, 8)}-${print.slice(8, 12)}-4${print.slice(13, 16)}-8${print.slice(17, 20)}-${print.slice(20, 32)}`,
        chainFingerprint: print,
        approvedBy: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
        approvedAt: "2026-10-29T12:00:00.000Z",
      },
    },
    ...tuple,
  };
}

export function m08Source(): SourceRecord {
  const body = m08Chain();
  return { id: randomUUID(), slot: M08_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

const meaning = (sourceWords: string, id: string) => ({
  id,
  sourceWords,
  sourceRef: "Synthetic source",
  interpretation: "Synthetic interpretation.",
  alternative: "Synthetic rejected alternative.",
  situation: "Synthetic recognition situation.",
  boundary: "Synthetic boundary.",
  repeatBack: "Synthetic repeat-back.",
  state: "confirmed" as const,
  owner: "Synthetic owner",
  confirmedBy: "Synthetic Owner",
});

export function m08Inheritance() {
  return {
    convictions: CONVICTIONS,
    journey: JOURNEY,
    claimsBoundary: { canClaim: ["Evidence can be inspected"], mustQualify: [], cannotClaim: [] },
    governingDeclarations: DECLARATIONS,
    foundationSummary: { business: "Synthetic Repair Co", practicalOutcome: "Fewer repeat failures.", distinction: "Inspectable proof." },
    permissionRecord: {
      permittedInterpretations: ["Inspectable proof"],
      prohibitedInterpretations: [],
      translationRights: "Client owns the wording.",
      compressionBoundary: "No compression.",
      ownershipBoundary: "Client owns the strategy.",
      generationAuthority: "Operator with edit authority.",
    },
    meaningRecords: [
      ...(["brokenThing", "hiddenTruth", "marketDeployableHiddenTruth", "nonNegotiable", "hardWonTeaching"] as const).map((key, index) =>
        meaning(CONVICTIONS[key], `m-conviction-${index}`),
      ),
      meaning(JOURNEY.from, "m-journey-from"),
      meaning(JOURNEY.to, "m-journey-to"),
      ...DECLARATIONS.map((declaration, index) => meaning(declaration, `m-declaration-${index}`)),
    ],
  };
}

export const m08Mission = () => ({ statement: "Publish the evidence.", audienceId: "seg-1", beliefShift: "From assumption to inspection.", purpose: "Make proof a buying criterion." });

export function m08Pillars() {
  return {
    pillars: [
      { id: "pillar-1", name: "Proof of outcome", beliefAnchor: "Visible proof changes buying decisions.", proofType: "evidence" as const, audience: "seg-1", rationale: "Shows the result." },
      { id: "pillar-2", name: "How we check", beliefAnchor: "Proof must be visible in use.", proofType: "teaching" as const, audience: "seg-1", rationale: "Teaches the method." },
      { id: "pillar-3", name: "What we refuse", beliefAnchor: "We will not make unsupported claims.", proofType: "refusal" as const, audience: "seg-1", rationale: "Shows the boundary." },
    ],
  };
}

export const m08Library = () => ({
  assets: [{ id: "asset-1", title: "Quarterly outcome register", pillarId: "pillar-1", format: "report", evidenceRef: "m07:measurement", state: "planned" as const }],
});
export const m08Gaps = () => ({
  gaps: [{ id: "gap-1", pillarId: "pillar-1", missing: "Two quarters of register data.", why: "The proof is thin.", severity: "material" as const, remedy: "Publish the next two quarters." }],
});
export const m08SalesMap = () => ({
  mappings: [{ id: "map-1", objectionId: "o1", assetIds: ["asset-1"], coverage: "partial" as const }],
});
export const m08Claims = () => ({
  claims: [
    { id: "cl1", claim: "Outcomes are published quarterly.", boundary: "can-claim" as const, evidenceRef: "m07:claims", approvedWording: "We publish outcomes every quarter." },
    { id: "cl2", claim: "We are the most reliable.", boundary: "cannot-claim" as const, evidenceRef: "none", approvedWording: "" },
  ],
});
export const m08Distribution = () => ({
  channels: [{ id: "ch1", channel: "Trade newsletter", pillarId: "pillar-1", cadence: "Monthly", owner: "Synthetic Owner" }],
});
export const m08Production = () => ({
  workflow: [
    { stage: "draft", owner: "Synthetic Owner", input: "Register data", output: "Draft article", sla: "3 days" },
    { stage: "review", owner: "Synthetic Owner", input: "Draft article", output: "Checked article", sla: "2 days" },
    { stage: "publish", owner: "Synthetic Owner", input: "Checked article", output: "Published article", sla: "1 day" },
  ],
});
export const m08Measures = () => ({
  metrics: [
    { id: "m1", metric: "Register citations", baseline: "0", target: "3/quarter", source: "Trade press", reviewCadence: "Quarterly" },
    { id: "m2", metric: "Evidence requests", baseline: "0", target: "10/month", source: "Sales log", reviewCadence: "Monthly" },
  ],
});
export const m08Operations = () => ({ owner: "Synthetic Owner", cadence: "Monthly", reviewForum: "Content review", escalation: "Founder" });
export const m08Compliance = () => ({
  checks: [{ id: "c1", item: "Every claim carries its boundary", result: "pass" as const, evidenceRef: "m08:claims" }],
});

export function m08Review(candidateHash: string) {
  const lenses = ["pillar-integrity", "proof-sufficiency", "sales-usefulness", "claims-safety", "production-feasibility", "measurement-honesty"] as const;
  return {
    reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
    candidateHash,
    lenses: lenses.map((id) => ({ id, result: "pass" as const, note: "" })),
    findings: [],
    alternative: { offered: true, alternative: "A narrower proof-only pillar set.", whyNotStronger: "It loses the teaching pillar." },
    verdict: "pass" as const,
    verdictBasis: "Faithful to the record.",
    ranAt: "2026-10-29T12:00:00.000Z",
  };
}
