import { Commitments } from "../../../src/lib/modules/strategy/server/stages/m03/session";
import {
  confirmAdvocate,
  confirmChallenge,
  confirmConfrontations,
  confirmCost,
  confirmCredibility,
  confirmFriction,
  confirmGrid,
  confirmInputs,
  confirmJourney,
  confirmJudgement,
  confirmProof,
} from "../../../src/lib/modules/strategy/server/stages/m03/rules";
import { m03Upstream } from "./m03";

export const GRID_ACTIONS = ["question", "reject", "commit", "introduce"] as const;
export const FRICTION_SOURCES = [
  "beliefContradiction",
  "operationalChange",
  "culturalShift",
  "customerExplanation",
  "economicCost",
  "accumulatedProof",
  "specialistAuthority",
] as const;

export const gridRows = () =>
  GRID_ACTIONS.map((action) => ({
    action,
    move: `${action} move`,
    beliefRationale: `${action} rationale`,
    proofCommitment: `${action} proof`,
    operationalRule: `${action} rule`,
    specialisationSignal: action === "question" || action === "reject" ? "Signal" : "",
    proofArtefactType: action === "commit" || action === "introduce" ? "Artefact" : "",
    traceToBelief: "Trace to belief",
  }));

export const proofRows = () =>
  GRID_ACTIONS.map((action) => ({
    action,
    product: "Product",
    policy: "",
    story: "",
    framework: "",
    proofEconomy: "discrete-at-cost" as const,
    evidenceStatus: "supported" as const,
    claimBoundaryNote: "Stays in can-claim.",
    capturePlan: "",
  }));

export const frictionBody = () => ({
  rows: GRID_ACTIONS.map((action) => ({
    action,
    sources: Object.fromEntries(
      FRICTION_SOURCES.map((source) => [source, { level: "high" as const, note: `${source} note` }]),
    ) as Record<string, { level: "high"; note: string }>,
  })),
  lowestFrictionCompetitor: "Synthetic competitor",
  lowestFrictionBasis: "Synthetic basis",
  threatAssessment: "Synthetic assessment mentioning r1.",
});

export const emptyCommitments = () =>
  Commitments.parse({
    module: "03",
    sessionId: "44444444-4444-4444-8444-444444444444",
    producedAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:00.000Z",
    upstream: m03Upstream(),
  });

/** A record with every step confirmed and no outcome yet. */
export function completeCommitments() {
  const c = emptyCommitments();
  confirmInputs(c, {
    solvesFor: "founder",
    solvesForNote: "",
    commitmentScope: "business",
    scopeNote: "",
    priorPositioning: { supplied: false, source: "", currentness: "", text: "", note: "" },
    terrainRead: "Synthetic terrain read.",
  });
  confirmChallenge(c, {
    contradictions: ["Synthetic contradiction"],
    genuineVsContrarian: "Genuine.",
  });
  confirmJourney(c, {
    from: "FROM belief",
    to: "TO belief",
    experientialChange: "Synthetic experiential change.",
    experienceShape: "knowledge",
    discoveryMechanism: "Synthetic discovery mechanism.",
  });
  confirmGrid(c, { rows: gridRows() });
  confirmProof(c, { rows: proofRows() });
  confirmFriction(c, frictionBody());
  confirmCredibility(c, {
    referenceEvidence: "Synthetic evidence",
    state: "credible",
    cause: "",
    reviewCondition: "",
  });
  confirmConfrontations(c, {
    pastAudit: [{ item: "Synthetic item", beliefSays: "yes", decision: null, note: "" }],
    futureConfrontations: [],
  });
  confirmCost(c, { costs: ["Synthetic cost"] });
  confirmAdvocate(c, {
    challenges: [
      { id: "case-for-default", case: "Synthetic case", verdict: "survives", note: "" },
      { id: "funded-copycat", case: "Synthetic case", verdict: "survives", note: "" },
      { id: "positioning-vs-preference", case: "Synthetic case", verdict: "survives", note: "" },
    ],
  });
  confirmJudgement(c, {
    optionsConsidered: ["Option one", "Option two"],
    recommendation: "Synthetic recommendation",
    confidence: "moderate",
    confidenceBasis: "Synthetic basis",
    commercialConsequences: { ifHolds: "a", ifNot: "b", ifNoDecision: "c" },
    reversalConditions: "Synthetic reversal",
    integrityCheck: "Synthetic integrity",
    professionalCall: "proceed",
    nextWork: "Synthetic next work",
  });
  return c;
}
