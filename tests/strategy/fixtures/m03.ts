import { createHash, randomUUID } from "node:crypto";
import { M03_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m03/source";
import type { SourceRecord } from "../../../src/lib/modules/strategy/server/data/repository";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const hex = (seed: string) => sha(seed);

/** A synthetic but structurally complete sealed-M02 tuple, as the server would derive it. */
export function m03Upstream(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const m01SessionId = "11111111-1111-4111-8111-111111111111";
  const m02SessionId = "22222222-2222-4222-8222-222222222222";
  const body = {
    m02SessionId,
    m02SealedAt: "2026-10-29T12:00:00.000Z",
    m02Outcome: "provisional_a",
    m02RelianceScope: "Module 03 hypothesis work only",
    m02Seal: {
      receiptId: "33333333-3333-4333-8333-333333333333",
      sealHash: hex("m02-seal"),
      reconHash: hex("m02-recon"),
      artifactsHash: hex("m02-artifacts"),
      collectionHash: hex("m02-collection"),
    },
    m01: {
      sessionId: m01SessionId,
      sealedAt: "2026-10-29T10:00:00.000Z",
      outputsHash: hex("m01-outputs"),
      lockState: "locked",
    },
    m01Inputs: {
      sessionId: m01SessionId,
      sealedAt: "2026-10-29T10:00:00.000Z",
      coreBelief: "Visible proof changes buying decisions.",
      brokenThing: "The market rewards shallow proof.",
      hiddenTruth: "Buyers need observable evidence.",
      marketDeployableHiddenTruth: "Buyers choose evidence they can inspect.",
      nonNegotiable: "We will not make unsupported claims.",
      hardWonTeaching: "Proof must be visible in use.",
      legacy: "A market that trusts what it can verify.",
      claimsBoundaryInputs: {
        canClaim: ["Evidence can be inspected"],
        mustQualify: ["Outcomes vary by cohort"],
        cannotClaim: ["Guaranteed revenue"],
      },
    },
    m02Findings: {
      descriptiveDefault: "Competitors sell feature lists.",
      cohort: "UK independent repair shops",
      concentration: "competitive",
      decodes: [
        {
          competitor: "Acme",
          beliefs: [{ belief: "More features win", confidence: "medium", vulnerability: "Unverified claims" }],
        },
      ],
      vulnerabilityEvidence: "Synthetic vulnerability evidence.",
      defendersCase: "Synthetic defenders case.",
      rebuttal: "Synthetic rebuttal.",
      painProfile: {
        trigger: "A failed repair",
        hack: "Manual workaround",
        pain: "Rework cost",
        limitingBelief: "Only big vendors can prove quality",
        traceToDefault: "Feature lists stand in for proof",
      },
      priceRange: "Synthetic range",
      willingnessEvidence: "Synthetic willingness evidence.",
      implication: "Proof must be inspectable.",
      traceSentence: "The vacuum traces to the hidden truth.",
      synthesisStatement: "Synthetic sealed outcome statement.",
    },
    carriedForward: {
      contrarianFlags: [],
      terrainDiagnosis: "ambiguous-needs-evidence",
      terrainTrajectory: "stable",
      terrainTam: "Unknown",
      terrainTailwind: "Synthetic tailwind",
      secondVoice: {
        present: false,
        name: "",
        role: "",
        competingDiagnosis: "",
        converge: "",
        diverge: "",
        signal: "",
      },
      foundersProblem: "Synthetic founder problem.",
      acknowledgedRisks: [
        {
          pattern: "r1",
          label: "Structural pattern one",
          state: "present",
          severity: "material",
          routing: "m03",
          acknowledgmentLine: "Synthetic acknowledgment",
          declined: false,
          dispute: "",
          landedIn: null,
        },
      ],
    },
  };
  return { ...body, ...overrides } as Record<string, unknown>;
}

export function m03Source(overrides: Record<string, unknown> = {}): SourceRecord {
  const body = m03Upstream(overrides);
  return {
    id: randomUUID(),
    slot: M03_SOURCE_SLOT,
    body,
    hash: sha(JSON.stringify(body)),
  };
}

export const m03Bodies = {
  inputs: {
    solvesFor: "founder" as const,
    solvesForNote: "Synthetic reason the founder framing wins.",
    commitmentScope: "business" as const,
    scopeNote: "Synthetic scope.",
    priorPositioning: { supplied: false, source: "", currentness: "", text: "", note: "" },
    terrainRead: "Synthetic terrain read: the run proceeds despite an undiagnosed terrain.",
  },
  challenge: {
    contradictions: ["The market assumes features prove quality; the belief says proof must be inspectable."],
    genuineVsContrarian: "Synthetic assessment: this is a genuine difference, not contrarianism.",
  },
  journey: {
    from: "Only large vendors can prove quality.",
    to: "Any buyer can inspect the evidence.",
    experientialChange: "Synthetic customer-voice paragraph about inspecting evidence before buying.",
    experienceShape: "b2b-operational" as const,
    discoveryMechanism: "Synthetic structured comparison of published proof.",
  },
  grid: {
    rows: [
      {
        action: "question" as const,
        move: "Question the assumption that feature count signals quality.",
        beliefRationale: "The belief says visible proof, not breadth, changes decisions.",
        proofCommitment: "Publish the evidence behind every quality claim.",
        operationalRule: "No quality claim ships without a linked, inspectable source.",
        specialisationSignal: "A public evidence index.",
        proofArtefactType: "",
        traceToBelief: "Visible proof changes buying decisions.",
      },
      {
        action: "reject" as const,
        move: "Reject paid placement in comparison content.",
        beliefRationale: "Inspectable evidence cannot be bought.",
        proofCommitment: "Disclose all commercial relationships in comparisons.",
        operationalRule: "No vendor payment in any comparison surface.",
        specialisationSignal: "A published no-paid-placement policy.",
        proofArtefactType: "",
        traceToBelief: "We will not make unsupported claims.",
      },
      {
        action: "commit" as const,
        move: "Commit to publishing repair outcomes quarterly.",
        beliefRationale: "Outcomes are the proof buyers can inspect.",
        proofCommitment: "Publish a quarterly outcome register.",
        operationalRule: "Every quarter ships with a public outcome register.",
        specialisationSignal: "",
        proofArtefactType: "Quarterly outcome register",
        traceToBelief: "Proof must be visible in use.",
      },
      {
        action: "introduce" as const,
        move: "Introduce inspectable proof as a buying criterion.",
        beliefRationale: "The market lacks a vocabulary for inspectable proof.",
        proofCommitment: "Teach buyers to ask for the evidence behind a claim.",
        operationalRule: "Every sales conversation offers the evidence index.",
        specialisationSignal: "",
        proofArtefactType: "Buyer evidence checklist",
        traceToBelief: "Buyers choose evidence they can inspect.",
      },
    ],
  },
  proof: {
    rows: [
      { action: "question" as const, product: "Evidence index in the product.", policy: "", story: "", framework: "", proofEconomy: "compounding-public" as const, evidenceStatus: "supported" as const, claimBoundaryNote: "Stays in can-claim: evidence is inspectable.", capturePlan: "" },
      { action: "reject" as const, product: "", policy: "No paid placement policy.", story: "", framework: "", proofEconomy: "discrete-at-cost" as const, evidenceStatus: "supported" as const, claimBoundaryNote: "Stays in can-claim: the policy is published.", capturePlan: "" },
      { action: "commit" as const, product: "", policy: "", story: "", framework: "Quarterly outcome register", proofEconomy: "compounding-public" as const, evidenceStatus: "prospective" as const, claimBoundaryNote: "Stays in must-qualify: outcomes vary by cohort.", capturePlan: "Owner: operations. Capture the next quarter. Review at publication." },
      { action: "introduce" as const, product: "", policy: "", story: "", framework: "Buyer evidence checklist", proofEconomy: "discrete-at-cost" as const, evidenceStatus: "supported" as const, claimBoundaryNote: "Stays in can-claim: the checklist is a method.", capturePlan: "" },
    ],
  },
  friction: {
    rows: ["question", "reject", "commit", "introduce"].map((action) => ({
      action: action as "question" | "reject" | "commit" | "introduce",
      sources: Object.fromEntries(
        ["beliefContradiction", "operationalChange", "culturalShift", "customerExplanation", "economicCost", "accumulatedProof", "specialistAuthority"].map((source) => [
          source,
          { level: "high" as const, note: `Synthetic ${source} note.` },
        ]),
      ),
    })),
    lowestFrictionCompetitor: "A funded adjacent entrant",
    lowestFrictionBasis: "Synthetic basis: they would only need to publish a register.",
    threatAssessment: "Synthetic threat assessment against the funded entrant; r1 acknowledged.",
  },
  credibility: {
    referenceEvidence: "Synthetic reference evidence.",
    state: "credibility-gap" as const,
    cause: "Synthetic cause: proof is early.",
    reviewCondition: "Review when the first quarterly register publishes.",
  },
  confrontations: {
    pastAudit: [{ item: "Synthetic past item", beliefSays: "yes" as const, decision: null, note: "" }],
    futureConfrontations: ["Synthetic future no."],
  },
  cost: { costs: ["Synthetic cost: refused paid placements."] },
  advocate: {
    challenges: [
      { id: "case-for-default" as const, case: "Synthetic strongest case for the default.", verdict: "survives" as const, note: "" },
      { id: "funded-copycat" as const, case: "Synthetic copycat case.", verdict: "survives" as const, note: "" },
      { id: "positioning-vs-preference" as const, case: "Synthetic positioning case.", verdict: "survives" as const, note: "" },
    ],
  },
  judgement: {
    optionsConsidered: ["Proceed with the position", "Return to upstream work"],
    recommendation: "Synthetic recommendation to proceed conditionally.",
    confidence: "moderate" as const,
    confidenceBasis: "Synthetic basis: provisional market evidence.",
    commercialConsequences: {
      ifHolds: "Synthetic if-holds consequence.",
      ifNot: "Synthetic if-not consequence.",
      ifNoDecision: "Synthetic no-decision consequence.",
    },
    reversalConditions: "Synthetic reversal condition.",
    integrityCheck: "Synthetic integrity check: no boundary was weakened.",
    professionalCall: "proceed_conditionally" as const,
    nextWork: "Synthetic next work: viability check in hypothesis mode.",
  },
  outcome: {
    outcome: "a" as const,
    statement: "Synthetic outcome statement: a provisional position is recorded.",
    returnDoc: null,
  },
};
