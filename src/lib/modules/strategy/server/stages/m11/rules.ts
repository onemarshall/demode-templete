import {
  ACTIONS_STATES,
  GATE_IDS,
  type Accountability,
  type Actions,
  type CheckFinding,
  type Decision,
  type Inheritance,
  type M11Session,
  type Plans,
} from "./contracts";
import type { HandoffCommercialDirection } from "../cd/contracts";

export type GateResult = {
  id: (typeof GATE_IDS)[number];
  result: "pass" | "fail" | "unassessed";
  basis: string;
  findings: CheckFinding[];
};

type Direction = HandoffCommercialDirection["downstream"]["direction"];

const finding = (code: string, message: string, ref = ""): CheckFinding => ({ code, message, ref });
const gate = (id: GateResult["id"], findings: CheckFinding[]): GateResult => ({
  id,
  result: findings.length ? "fail" : "pass",
  basis: findings.length ? `${findings.length} finding(s)` : "All mechanical checks passed.",
  findings,
});

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * FW_24: M11 preserves the direction's outcome, audience, route, moves, first-phase job, exclusions
 * and progression condition, and may activate only Active / First Phase consequences.
 */
export function inheritanceProblems(inheritance: Inheritance, direction: Direction): string[] {
  const problems: string[] = [];
  const compare: [string, string, string][] = [
    ["outcome", inheritance.outcome, direction.twelveMonthOutcome],
    ["priority audience", inheritance.priorityAudience, direction.priorityBuyingSituation],
    ["strategic route", inheritance.strategicRoute, direction.strategicRoute],
    ["first-phase objective", inheritance.firstPhaseObjective, direction.firstPhaseObjective],
    ["progression condition", inheritance.progressionCondition, direction.progressionCondition],
  ];
  for (const [label, recorded, inherited] of compare)
    if (norm(recorded) !== norm(inherited))
      problems.push(`The ${label} differs from the sealed direction. M11 may not reinterpret it.`);
  if (!inheritance.moveIds.includes(direction.strategicMoveId))
    problems.push("The recorded moves do not include the direction's lead move.");
  if (inheritance.activeConsequenceIds.length !== direction.activeConsequenceIds.length)
    problems.push("The active consequence set differs from the direction's selection.");
  for (const id of inheritance.activeConsequenceIds)
    if (!direction.activeConsequenceIds.includes(id))
      problems.push(`Consequence "${id}" is not Active / First Phase in the direction.`);
  if (inheritance.directionVersion.versionId !== direction.directionId && !inheritance.directionVersion.versionId)
    problems.push("The direction version is not pinned.");
  return problems;
}

export function planProblems(plans: Plans, direction: Direction): string[] {
  const problems: string[] = [];
  const active = new Set(direction.activeConsequenceIds);
  const seen = new Set<string>();
  for (const plan of plans.plans) {
    if (!active.has(plan.consequenceId))
      problems.push(`Consequence "${plan.consequenceId}" is not Active / First Phase in the direction; M11 cannot create it.`);
    if (seen.has(plan.consequenceId)) problems.push(`Consequence "${plan.consequenceId}" is planned twice.`);
    seen.add(plan.consequenceId);
    if (!plan.quantity.trim()) problems.push(`Plan "${plan.consequenceId}" records no quantity.`);
    if (!plan.operationalTarget.trim()) problems.push(`Plan "${plan.consequenceId}" records no operational target.`);
    if (!plan.capacityAssumption.trim()) problems.push(`Plan "${plan.consequenceId}" records no capacity assumption.`);
    if (!plan.owner.trim()) problems.push(`Plan "${plan.consequenceId}" names no owner.`);
    if (!plan.threshold.trim()) problems.push(`Plan "${plan.consequenceId}" records no threshold.`);
    if (!plan.thresholdRationale.trim())
      problems.push(`Plan "${plan.consequenceId}" records no rationale for its threshold.`);
  }
  for (const id of active)
    if (!seen.has(id)) problems.push(`Active consequence "${id}" has no first-phase plan.`);
  return problems;
}

export function decisionProblems(decision: Decision): string[] {
  const problems: string[] = [];
  if (!decision.commitment.trim()) problems.push("No commitment is recorded.");
  if (!decision.committedBy.name.trim() || !decision.committedBy.authorityRef.trim())
    problems.push("No authorised commitment owner is recorded.");
  if (!decision.scope.trim()) problems.push("The commitment records no scope.");
  if (!decision.thresholds.length) problems.push("No threshold is recorded.");
  if (!decision.reviewEvent.trim()) problems.push("No review event is recorded.");
  if (!decision.evidencePurpose.trim()) problems.push("The commitment records no evidence purpose.");
  if (!decision.notCommitted.length) problems.push("Nothing is recorded as not committed.");
  return problems;
}

export function actionProblems(actions: Actions, plans: Plans): string[] {
  const problems: string[] = [];
  const planned = new Set(plans.plans.map((plan) => plan.consequenceId));
  const ids = new Set<string>();
  for (const action of actions.actions) {
    if (ids.has(action.id)) problems.push(`Action id "${action.id}" is duplicated.`);
    ids.add(action.id);
    if (!planned.has(action.consequenceId))
      problems.push(`Action "${action.id}" cites a consequence that has no plan.`);
    if (!action.owner.trim()) problems.push(`Action "${action.id}" names no owner.`);
    if (!action.window.trim()) problems.push(`Action "${action.id}" has no window.`);
    if (!action.proofAction.trim()) problems.push(`Action "${action.id}" records no proof action.`);
    if (!ACTIONS_STATES.includes(action.state)) problems.push(`Action "${action.id}" has an unknown state.`);
  }
  return problems;
}

export function accountabilityProblems(accountability: Accountability): string[] {
  const problems: string[] = [];
  for (const owner of accountability.owners)
    if (!owner.owner.trim()) problems.push(`Area "${owner.area}" names no owner.`);
  if (!accountability.cadence.trim()) problems.push("The operating rhythm has no cadence.");
  if (!accountability.escalation.trim()) problems.push("The operating rhythm has no escalation.");
  if (accountability.preservationCheck === "unresolved")
    problems.push("The direction preservation check is unresolved.");
  if (accountability.preservationCheck === "changed-with-authority" && !accountability.preservationNote.trim())
    problems.push("A changed preservation check needs the authority that permitted the change.");
  return problems;
}

function gateFor(
  session: M11Session,
  id: GateResult["id"],
  key: string,
  check: (value: never, direction: Direction, plans: Plans) => string[],
  direction: Direction | undefined,
  plans: Plans | undefined,
): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  if (!direction) return gate(id, [finding("direction-missing", "The sealed direction is unavailable.")]);
  if (key !== "inheritance" && key !== "plans" && !plans)
    return gate(id, [finding("plans-missing", "The first-phase plans are not confirmed.")]);
  return gate(id, check(value as never, direction, plans as Plans).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M11Session): GateResult[] {
  const chain = session.sources as { cd?: { handoff?: HandoffCommercialDirection } } | undefined;
  const direction = chain?.cd?.handoff?.downstream?.direction;
  const plans = session.data.plans as Plans | undefined;
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", (value) => inheritanceProblems(value, direction!), direction, plans),
    gateFor(session, "gate-1-plans", "plans", (value) => planProblems(value, direction!), direction, plans),
    gateFor(session, "gate-2-decision", "decision", (value) => decisionProblems(value), direction, plans),
    gateFor(session, "gate-3-actions", "actions", (value, _direction, planSet) => actionProblems(value, planSet), direction, plans),
    gateFor(session, "gate-4-accountability", "accountability", (value) => accountabilityProblems(value), direction, plans),
  ];
}
