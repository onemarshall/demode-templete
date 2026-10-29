import { createHash, randomUUID } from "node:crypto";
import { M09_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m09/source";
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

export function m09Chain(): Record<string, unknown> {
  const tuple = {
    m08: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m08-seal"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
  };
  const print = sha(JSON.stringify(tuple));
  return {
    folder: "synthetic-brand",
    route: { version: 1, module: "09", route: "full", reason: "Synthetic route.", confirmedBy: "synthetic-operator", confirmedAt: "2026-10-29T12:00:00.000Z" },
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

export function m09Source(): SourceRecord {
  const body = m09Chain();
  return { id: randomUUID(), slot: M09_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
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

export function m09Inheritance() {
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

export const m09Direction = () => ({
  positioning: "The repair partner that publishes its outcomes.",
  audience: "Operations leads",
  beliefShift: "From assumption to inspection.",
  architecturePrinciples: ["Lead with evidence", "One primary action per page", "Refuse paid placement"],
  constraints: ["No stock imagery"],
});

export const m09Destinations = () => ({
  destinations: [
    { id: "d1", name: "Evidence index", purpose: "Let buyers inspect proof.", audienceId: "seg-1", primaryAction: "Open the register", beliefRole: "Demonstrate inspectability" },
    { id: "d2", name: "Service page", purpose: "Explain the offer.", audienceId: "seg-1", primaryAction: "Request a quote", beliefRole: "Connect proof to purchase" },
  ],
});

export const m09Gates = () => ({
  decisions: [
    { id: "dec1", decision: "Where does the register live?", options: ["Evidence index", "Service page"], chosen: "Evidence index", rationale: "Proof should be the entry point.", evidenceRef: "m08:pillars" },
  ],
});

export const m09Comparison = () => ({
  competitors: [
    { id: "c1", name: "Synthetic competitor", reference: "synthetic.example", strength: "Strong brand", weakness: "No published outcomes", learning: "Publish outcomes prominently." },
  ],
});

export const m09Briefs = () => ({
  briefs: [
    { id: "b1", destinationId: "d1", objective: "Show the register", audience: "Operations leads", proof: "Quarterly register", sections: ["What we publish", "How to read it"], primaryAction: "Open the register", measurementId: "m1" },
  ],
});

export const m09Measurement = () => ({
  metrics: [
    { id: "m1", metric: "Register opens", baseline: "0", target: "200/month", source: "Analytics", reviewCadence: "Monthly" },
    { id: "m2", metric: "Evidence requests", baseline: "0", target: "10/month", source: "Sales log", reviewCadence: "Monthly" },
  ],
});

export function m09Review(candidateHash: string) {
  const lenses = ["destination-clarity", "brief-usefulness", "belief-fidelity", "comparison-honesty", "measurement-honesty", "architecture-coherence"] as const;
  return {
    reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
    candidateHash,
    lenses: lenses.map((id) => ({ id, result: "pass" as const, note: "" })),
    findings: [],
    alternative: { offered: true, alternative: "A single evidence destination.", whyNotStronger: "It loses the purchase path." },
    verdict: "pass" as const,
    verdictBasis: "Faithful to the record.",
    ranAt: "2026-10-29T12:00:00.000Z",
  };
}
