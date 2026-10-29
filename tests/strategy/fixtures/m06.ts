import { createHash, randomUUID } from "node:crypto";
import { M06_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m06/source";
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

function fingerprint(tuple: Record<string, unknown>) {
  return sha(JSON.stringify(tuple));
}

export function m06Chain(): Record<string, unknown> {
  const tuple = {
    m05: {
      sessionId: "aaaaaaaa-1111-4111-8111-111111111111",
      seal: { versionId: "bbbbbbbb-2222-4222-8222-222222222222", hash: sha("m05-seal"), at: "2026-10-29T12:00:00.000Z" },
      capability: "full-standard",
      data: { review: { verdict: "pass" }, clientDecision: { response: "accept" } },
      sources: {},
    },
    bf: {
      sessionId: "cccccccc-3333-4333-8333-333333333333",
      seal: { versionId: "dddddddd-4444-4444-8444-444444444444", hash: sha("bf-seal"), at: "2026-10-29T12:00:00.000Z" },
      gate: { downstreamGateState: "open", m05Permission: "granted", reasons: [] },
    },
  };
  const print = fingerprint(tuple);
  return {
    folder: "synthetic-brand",
    route: {
      version: 1,
      module: "06",
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

export function m06Source(): SourceRecord {
  const body = m06Chain();
  return { id: randomUUID(), slot: M06_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
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

export function m06Inheritance() {
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

export function m06Foundation() {
  return {
    brandPositioning: "The repair partner that publishes its outcomes.",
    brandPromise: "Evidence you can inspect.",
    manifestoSpine: {
      see: "Buyers cannot inspect proof.",
      reject: "Feature counts as evidence.",
      believe: "Inspectable proof changes decisions.",
      protect: "The buyer's ability to verify.",
      choose: "Evidence over breadth.",
      intendToChange: "Make proof a buying criterion.",
      commitTo: "Publish outcomes every quarter.",
      becomesPossible: "Buyers compare evidence.",
    },
    declarations: DECLARATIONS,
    positioningBasis: "Sealed brand strategy.",
  };
}

export function m06Audience() {
  return {
    primaryId: "seg-1",
    segments: [
      {
        id: "seg-1",
        name: "Operations leads",
        beliefStage: "belief-aware" as const,
        situation: "Choosing a repair partner after a failure",
        currentBelief: "Only big vendors can prove quality.",
        desiredBelief: "Any buyer can inspect the evidence.",
        reachableHow: "Trade association list",
      },
    ],
  };
}

export function m06Positioning() {
  return {
    statement: "The repair partner that publishes its outcomes, for buyers who need evidence.",
    rationale: "The belief is inspectable proof, and the position makes it the buying criterion.",
    competitorTest: "An opposite-belief vendor could not publish its failures.",
    beliefTrace: "Visible proof changes buying decisions.",
    proofBasis: "Quarterly outcome register.",
  };
}

export function m06Expressions() {
  const ids = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"] as const;
  return {
    statements: ids.map((id) => ({
      id,
      text: `Synthetic statement ${id}.`,
      beliefTrace: "Visible proof changes buying decisions.",
      sourceRefs: ["m05:manifesto"],
      anchor: ["s8", "s9", "s10"].includes(id),
    })),
  };
}

export function m06Routes() {
  return {
    routes: [
      {
        id: "route-1",
        channel: "Trade association newsletter",
        function: "reach" as const,
        disposition: "primary" as const,
        audienceId: "seg-1",
        evidenceConfidence: "medium" as const,
        rationale: "Members already compare suppliers.",
      },
    ],
  };
}

export function m06Activation() {
  return {
    owner: "Synthetic Owner",
    sequence: ["Publish the register", "Brief the trade association", "Run the first comparison"],
    budgetBasis: "Synthetic basis: existing team time only.",
    firstActions: ["Publish the quarterly register", "Write the trade newsletter piece", "Open the evidence index"],
  };
}

export function m06Measurement() {
  return {
    metrics: [
      { id: "metric-1", metric: "Evidence requests", baseline: "0", target: "10 per month", source: "Sales log", reviewCadence: "Monthly" },
      { id: "metric-2", metric: "Register citations", baseline: "0", target: "3 per quarter", source: "Trade press", reviewCadence: "Quarterly" },
    ],
  };
}

export function m06Review(candidateHash: string) {
  const lenses = [
    "positioning-strength",
    "audience-truth",
    "expression-coherence",
    "route-plausibility",
    "activation-capacity",
    "measurement-honesty",
  ] as const;
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
