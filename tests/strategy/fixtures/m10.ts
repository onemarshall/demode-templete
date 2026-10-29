import { createHash, randomUUID } from "node:crypto";
import { M10_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m10/source";
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

export function m10Chain(): Record<string, unknown> {
  const tuple = {
    m09: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m09-seal"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
  };
  const print = sha(JSON.stringify(tuple));
  return {
    folder: "synthetic-brand",
    route: { version: 1, module: "10", route: "full", reason: "Synthetic route.", confirmedBy: "synthetic-operator", confirmedAt: "2026-10-29T12:00:00.000Z" },
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

export function m10Source(): SourceRecord {
  const body = m10Chain();
  return { id: randomUUID(), slot: M10_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
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

export function m10Inheritance() {
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

export const m10Spatial = () => ({
  spatialPrinciple: "Evidence first, decoration second.",
  proportions: ["Two-thirds evidence, one-third explanation"],
  grid: "Twelve column",
  density: "Generous, one idea per band",
  hierarchyNotes: "The register is always the largest element.",
});

export const m10Resonance = () => ({
  resonances: [{ id: "r1", element: "The register", beliefConnection: "Inspectable proof", evidence: "m09:briefs" }],
});

export const m10Behaviours = () => ({
  behaviours: [
    { id: "b1", context: "A bad quarter", behaviour: "Publish it prominently", beliefConnection: "Honesty" },
    { id: "b2", context: "A competitor copies", behaviour: "Publish more evidence", beliefConnection: "Inspectability" },
    { id: "b3", context: "A sponsorship offer", behaviour: "Refuse and explain", beliefConnection: "Refusal" },
  ],
});

export const m10Context = () => ({
  contexts: [
    { id: "c1", context: "Print report", constraints: ["No interaction"], adaptation: "Static register table" },
    { id: "c2", context: "Mobile web", constraints: ["Small viewport"], adaptation: "Collapsible evidence rows" },
  ],
});

export const m10OperatingModel = () => ({
  owner: "Synthetic Owner",
  cadence: "Quarterly",
  tooling: ["Design system file"],
  governance: "Owner approves any new element",
});

export const m10Routes = () => ({
  routes: [{ id: "ro1", route: "Website", audience: "Operations leads", artefactId: "a1", purpose: "Open the register" }],
});

export const m10Artefact = () => ({
  artefacts: [{ id: "a1", name: "Evidence index", format: "Web page", purpose: "Let buyers inspect proof", state: "planned" as const }],
});

export const m10Measurement = () => ({
  metrics: [
    { id: "m1", metric: "Register opens", baseline: "0", target: "200/month", source: "Analytics", reviewCadence: "Monthly" },
    { id: "m2", metric: "Evidence requests", baseline: "0", target: "10/month", source: "Sales log", reviewCadence: "Monthly" },
  ],
});

export function m10Review(candidateHash: string) {
  const lenses = ["belief-fidelity", "spatial-coherence", "behaviour-utility", "context-adaptation", "operating-feasibility", "measurement-honesty"] as const;
  return {
    reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
    candidateHash,
    lenses: lenses.map((id) => ({ id, result: "pass" as const, note: "" })),
    findings: [],
    alternative: { offered: true, alternative: "A single-format system.", whyNotStronger: "It loses print and mobile." },
    verdict: "pass" as const,
    verdictBasis: "Faithful to the record.",
    ranAt: "2026-10-29T12:00:00.000Z",
  };
}
