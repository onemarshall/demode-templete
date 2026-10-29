import { createHash, randomUUID } from "node:crypto";
import { M07_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m07/source";
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

export function m07Chain(): Record<string, unknown> {
  const tuple = {
    m06: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m06-seal"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
  };
  const print = sha(JSON.stringify(tuple));
  return {
    folder: "synthetic-brand",
    route: {
      version: 1,
      module: "07",
      route: "full",
      reason: "Synthetic route confirmation.",
      confirmedBy: "synthetic-operator",
      confirmedAt: "2026-10-29T12:00:00.000Z",
    },
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

export function m07Source(): SourceRecord {
  const body = m07Chain();
  return { id: randomUUID(), slot: M07_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
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

export function m07Inheritance() {
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
      compressionBoundary: "No compression of the declarations.",
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

export function m07Statements() {
  const ids = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;
  const deployable = ["s1", "s4", "s5", "s6", "s7", "s8"];
  return {
    statements: ids.map((id) => ({
      id,
      text: `Synthetic statement ${id}.`,
      beliefTrace: "Visible proof changes buying decisions.",
      sourceRefs: ["m06:statements"],
      deployable: deployable.includes(id),
    })),
  };
}

export function m07Qualification() {
  return {
    criteria: [
      { id: "c1", name: "Has a failed repair", test: "They can name a recent failure.", disqualifyIf: "No recent failure." },
      { id: "c2", name: "Can inspect evidence", test: "They ask for the record.", disqualifyIf: "Price only." },
    ],
    prospects: [{ id: "p1", name: "Synthetic prospect", state: "belief-curious" as const, evidence: "Synthetic evidence." }],
    protocol: { trigger: "Price-only demand", response: "Decline and explain.", returnOwner: "M06" },
  };
}

export function m07Conversation() {
  return {
    stages: [
      { stage: "open", purpose: "Establish the failure.", opening: "What went wrong?", questions: ["What happened?"], exitCriteria: "A concrete failure." },
      { stage: "diagnose", purpose: "Test the belief.", opening: "How do you check quality?", questions: ["What would convince you?"], exitCriteria: "A belief stated." },
      { stage: "commit", purpose: "Agree the evidence.", opening: "Here is the record.", questions: ["Does this answer it?"], exitCriteria: "Evidence accepted." },
    ],
  };
}

export function m07Objections() {
  return {
    objections: [
      { id: "o1", objection: "Too expensive", beliefBehind: "Price is the only signal.", response: "Show the failure cost.", evidenceRef: "m06:measurement" },
      { id: "o2", objection: "We already have a supplier", beliefBehind: "Switching is risky.", response: "Offer a comparison.", evidenceRef: "m06:positioning" },
      { id: "o3", objection: "Not now", beliefBehind: "Urgency is low.", response: "Name the trigger.", evidenceRef: "m06:audience" },
    ],
  };
}

export function m07Claims() {
  return {
    claims: [
      { id: "cl1", claim: "Outcomes are published quarterly.", boundary: "can-claim" as const, evidenceRef: "m06:proof", approvedWording: "We publish outcomes every quarter." },
      { id: "cl2", claim: "We are the most reliable.", boundary: "cannot-claim" as const, evidenceRef: "none", approvedWording: "" },
    ],
  };
}

export function m07Measurement() {
  return {
    metrics: [
      { id: "m1", metric: "Evidence requests", baseline: "0", target: "10/month", source: "Sales log", reviewCadence: "Monthly" },
      { id: "m2", metric: "Qualified conversations", baseline: "0", target: "4/month", source: "CRM", reviewCadence: "Monthly" },
    ],
  };
}

export function m07Research() {
  return {
    requests: [
      { id: "r1", question: "Does price sensitivity vary by segment?", why: "It changes the qualification criteria.", method: "Interviews", owner: "Synthetic Owner", status: "open" as const },
    ],
  };
}

export function m07Review(candidateHash: string) {
  const lenses = ["qualification-honesty", "conversation-plausibility", "objection-coverage", "claims-safety", "measurement-honesty", "research-sufficiency"] as const;
  return {
    reviewer: { identity: "synthetic-reviewer", model: "synthetic-model", independence: "valid" as const, independenceBasis: "Separate context." },
    candidateHash,
    lenses: lenses.map((id) => ({ id, result: "pass" as const, note: "" })),
    findings: [],
    alternative: { offered: true, alternative: "A narrower proof-only position.", whyNotStronger: "It loses the buying criterion." },
    verdict: "pass" as const,
    verdictBasis: "Faithful to the record.",
    ranAt: "2026-10-29T12:00:00.000Z",
  };
}
