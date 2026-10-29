import {
  DECISION_STATES,
  EVIDENCE_STATES,
  EXECUTION_PERMISSIONS,
  GATE_IDS,
  PORTFOLIO_CLASSES,
  type CheckFinding,
  type CDSession,
  type Decision,
  type Evidence,
  type Exclusions,
  type Horizon,
  type Inheritance,
  type Moves,
  type Portfolio,
  type Recommendation,
  type Route,
  type Sequence,
} from "./contracts";
import { m11PermissionFor, preCycleBlocker } from "./handoff";

export type GateResult = {
  id: (typeof GATE_IDS)[number];
  result: "pass" | "fail" | "unassessed";
  basis: string;
  findings: CheckFinding[];
};

const finding = (code: string, message: string, ref = ""): CheckFinding => ({ code, message, ref });
const gate = (id: GateResult["id"], findings: CheckFinding[]): GateResult => ({
  id,
  result: findings.length ? "fail" : "pass",
  basis: findings.length ? `${findings.length} finding(s)` : "All mechanical checks passed.",
  findings,
});

export function inheritanceProblems(inheritance: Inheritance): string[] {
  const problems: string[] = [];
  if (!inheritance.inheritedDecisions.length) problems.push("No inherited decision is recorded.");
  if (!inheritance.lockedFields.length) problems.push("No locked field is recorded.");
  if (!inheritance.invalidationTriggers.length) problems.push("No invalidation trigger is recorded.");
  if (!inheritance.upstreamVersions.length) problems.push("No upstream version is pinned.");
  for (const version of inheritance.upstreamVersions)
    if (!version.sessionId.trim() || !version.versionId.trim() || !version.hash.trim())
      problems.push(`Upstream version for "${version.module}" is incomplete.`);
  return problems;
}

export function horizonProblems(horizon: Horizon): string[] {
  const problems: string[] = [];
  if (!horizon.horizonRationale.trim()) problems.push("The horizon records no rationale.");
  if (!horizon.evidenceCutoff.trim()) problems.push("The horizon records no evidence cut-off.");
  if (!horizon.cycleHorizon.trim()) problems.push("The horizon names no controlled cycle.");
  if (!horizon.proportionality.trim())
    problems.push("The direction does not explain why the route is proportionate to the live decision.");
  return problems;
}

export function recommendationProblems(recommendation: Recommendation): string[] {
  const problems: string[] = [];
  if (!recommendation.outcome.trim()) problems.push("The recommendation states no outcome.");
  if (!recommendation.priorityAudience.trim()) problems.push("The recommendation names no priority audience.");
  if (!recommendation.buyingSituation.trim()) problems.push("The recommendation names no buying situation.");
  if (!recommendation.requiredMovement.trim()) problems.push("The recommendation states no required movement.");
  return problems;
}

export function routeProblems(route: Route): string[] {
  const problems: string[] = [];
  if (!route.credibleAlternative.trim()) problems.push("No credible alternative is recorded.");
  if (!route.tradeoff.trim()) problems.push("No trade-off is recorded.");
  return problems;
}

export function moveProblems(moves: Moves): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const move of moves.moves) {
    if (ids.has(move.id)) problems.push(`Move id "${move.id}" is duplicated.`);
    ids.add(move.id);
    if (!move.job.trim()) problems.push(`Move "${move.name}" states no job.`);
    if (!move.consequenceIds.length) problems.push(`Move "${move.name}" cites no consequence.`);
    if (!EVIDENCE_STATES.includes(move.evidenceState))
      problems.push(`Move "${move.name}" has an unknown evidence state.`);
  }
  return problems;
}

export function sequenceProblems(sequence: Sequence): string[] {
  const problems: string[] = [];
  for (const phase of sequence.phases) {
    if (!phase.progressionGate.trim()) problems.push(`Phase "${phase.phase}" has no progression gate.`);
    if (!phase.work.length) problems.push(`Phase "${phase.phase}" records no work.`);
  }
  if (!sequence.progressionCondition.trim()) problems.push("No progression condition is recorded.");
  if (!sequence.firstEvidenceEvent.trim()) problems.push("No first evidence event is recorded.");
  if (!sequence.reviewEvent.trim()) problems.push("No review event is recorded.");
  if (!sequence.firstPhaseObjective.trim()) problems.push("No first-phase objective is recorded.");
  return problems;
}

export function portfolioProblems(portfolio: Portfolio): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const entry of portfolio.consequences) {
    if (ids.has(entry.id)) problems.push(`Consequence id "${entry.id}" is duplicated.`);
    ids.add(entry.id);
    if (!PORTFOLIO_CLASSES.includes(entry.classification))
      problems.push(`Consequence "${entry.id}" has an unknown classification.`);
    if (!entry.reason.trim()) problems.push(`Consequence "${entry.id}" records no upstream reason.`);
    if (!entry.commercialJob.trim()) problems.push(`Consequence "${entry.id}" states no commercial job.`);
    if (!entry.owner.trim()) problems.push(`Consequence "${entry.id}" names no strategic owner.`);
    if (!EVIDENCE_STATES.includes(entry.evidenceState))
      problems.push(`Consequence "${entry.id}" has an unknown evidence state.`);
  }
  if (!portfolio.consequences.some((entry) => entry.classification === "active-first-phase"))
    problems.push("No consequence is classified Active / First Phase.");
  return problems;
}

export function exclusionProblems(exclusions: Exclusions): string[] {
  const problems: string[] = [];
  if (!exclusions.exclusions.length) problems.push("No exclusion is recorded.");
  if (!exclusions.deferredAlternatives.length) problems.push("No deferred alternative is recorded.");
  if (!exclusions.invalidationTriggers.length) problems.push("No invalidation trigger is recorded.");
  return problems;
}

export function evidenceProblems(evidence: Evidence): string[] {
  const problems: string[] = [];
  for (const dimension of evidence.dimensions) {
    if (!EVIDENCE_STATES.includes(dimension.state))
      problems.push(`Evidence dimension "${dimension.dimension}" has an unknown state.`);
  }
  if (!evidence.coreAssumption.trim()) problems.push("No core assumption is recorded.");
  if (evidence.preCycleTest.required && !evidence.preCycleTest.id.trim())
    problems.push("A required pre-cycle test needs its identifier.");
  return problems;
}

export function decisionProblems(decision: Decision): string[] {
  const problems: string[] = [];
  if (!DECISION_STATES.includes(decision.decisionState))
    problems.push(`Unknown decision state "${decision.decisionState}".`);
  if (!EXECUTION_PERMISSIONS.includes(decision.executionPermission))
    problems.push(`Unknown execution permission "${decision.executionPermission}".`);
  if (!decision.owner.name.trim() || !decision.owner.authorityRef.trim())
    problems.push("No authorised human decision owner is recorded.");
  if (!decision.exactDecision.trim()) problems.push("The exact decision is not recorded.");
  if (!decision.authorisedWork.trim()) problems.push("What approval authorises is not recorded.");
  if (!decision.nextReviewTrigger.trim()) problems.push("No next review trigger is recorded.");
  return problems;
}

function gateFor(session: CDSession, id: GateResult["id"], key: string, check: (value: never) => string[]): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: CDSession): GateResult[] {
  const gates: GateResult[] = [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-horizon", "horizon", horizonProblems),
    gateFor(session, "gate-2-recommendation", "recommendation", recommendationProblems),
    gateFor(session, "gate-3-route", "route", routeProblems),
    gateFor(session, "gate-4-moves", "moves", moveProblems),
    gateFor(session, "gate-5-sequence", "sequence", sequenceProblems),
    gateFor(session, "gate-6-portfolio", "portfolio", portfolioProblems),
    gateFor(session, "gate-7-exclusions", "exclusions", exclusionProblems),
    gateFor(session, "gate-8-evidence", "evidence", evidenceProblems),
  ];

  const decision = session.data.decision as Decision | undefined;
  const evidence = session.data.evidence as Evidence | undefined;
  if (!session.confirmations.decision || !decision)
    gates.push(gate("gate-9-decision", [finding("decision-missing", "The decision is not recorded.")]));
  else {
    const findings = decisionProblems(decision).map((problem) => finding("decision-problem", problem, "decision"));
    const permission = m11PermissionFor(decision);
    for (const reason of permission.reasons) findings.push(finding("permission-refused", reason, "decision"));
    const blocker = evidence ? preCycleBlocker(evidence) : null;
    if (blocker) findings.push(finding("pre-cycle-unresolved", blocker, "evidence"));
    gates.push(gate("gate-9-decision", findings));
  }
  return gates;
}
