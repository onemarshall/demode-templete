import {
  GATE_IDS,
  type Assets,
  type CheckFinding,
  type Checklist,
  type Inheritance,
  type M12Session,
  type Response,
  type Rhythm,
  type Rules,
  type Schedule,
  type Scorecard,
  type Transition,
} from "./contracts";

export type GateResult = {
  id: (typeof GATE_IDS)[number];
  result: "pass" | "fail" | "unassessed";
  basis: string;
  findings: CheckFinding[];
};

type CyclePlans = { plans: { consequenceId: string; quantity: string; owner: string; threshold: string }[] };
type CycleDecision = { thresholds: string[]; reviewEvent: string };

const finding = (code: string, message: string, ref = ""): CheckFinding => ({ code, message, ref });
const gate = (id: GateResult["id"], findings: CheckFinding[]): GateResult => ({
  id,
  result: findings.length ? "fail" : "pass",
  basis: findings.length ? `${findings.length} finding(s)` : "All mechanical checks passed.",
  findings,
});

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** FW_24: M12 preserves M11's exact quantities, ownership commitments, route, proof actions and
 * thresholds. A difference is a defect, not a refinement. */
export function inheritanceProblems(inheritance: Inheritance, plans: CyclePlans, decision: CycleDecision): string[] {
  const problems: string[] = [];
  const byId = new Map(plans.plans.map((plan) => [plan.consequenceId, plan]));
  for (const entry of inheritance.quantities) {
    const plan = byId.get(entry.consequenceId);
    if (!plan) {
      problems.push(`Consequence "${entry.consequenceId}" is not planned in the sealed cycle.`);
      continue;
    }
    if (norm(entry.quantity) !== norm(plan.quantity))
      problems.push(`Quantity for "${entry.consequenceId}" differs from the sealed cycle.`);
    if (norm(entry.threshold) !== norm(plan.threshold))
      problems.push(`Threshold for "${entry.consequenceId}" differs from the sealed cycle.`);
  }
  for (const id of byId.keys())
    if (!inheritance.quantities.some((entry) => entry.consequenceId === id))
      problems.push(`Sealed consequence "${id}" is missing from the inheritance.`);
  const owners = new Map(plans.plans.map((plan) => [plan.consequenceId, plan.owner]));
  for (const owner of inheritance.owners)
    if (![...owners.values()].some((value) => norm(value) === norm(owner.owner)))
      problems.push(`Owner "${owner.owner}" is not an owner in the sealed cycle.`);
  if (norm(inheritance.reviewEvent) !== norm(decision.reviewEvent))
    problems.push("The review event differs from the sealed cycle.");
  return problems;
}

export function assetProblems(assets: Assets): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const asset of assets.assets) {
    if (ids.has(asset.id)) problems.push(`Asset id "${asset.id}" is duplicated.`);
    ids.add(asset.id);
    if (!asset.owner.trim()) problems.push(`Asset "${asset.name}" names no owner.`);
    if (asset.state === "missing" && !asset.dependency.trim())
      problems.push(`Missing asset "${asset.name}" does not record what it blocks.`);
  }
  return problems;
}

export function rhythmProblems(rhythm: Rhythm): string[] {
  const problems: string[] = [];
  if (!rhythm.weeklyCadence.trim()) problems.push("No weekly cadence is recorded.");
  for (const checkpoint of rhythm.checkpoints)
    if (!checkpoint.when.trim() || !checkpoint.purpose.trim())
      problems.push(`Checkpoint "${checkpoint.name}" needs a time and a purpose.`);
  if (!rhythm.reviewForum.trim()) problems.push("No review forum is recorded.");
  if (!rhythm.escalation.trim()) problems.push("No escalation path is recorded.");
  return problems;
}

export function scheduleProblems(schedule: Schedule, plans: CyclePlans): string[] {
  const problems: string[] = [];
  const planned = new Set(plans.plans.map((plan) => plan.consequenceId));
  const ids = new Set<string>();
  for (const item of schedule.items) {
    if (ids.has(item.id)) problems.push(`Schedule item "${item.id}" is duplicated.`);
    ids.add(item.id);
    if (!planned.has(item.consequenceId))
      problems.push(`Schedule item "${item.id}" cites a consequence that is not in the sealed cycle.`);
    if (!item.owner.trim()) problems.push(`Schedule item "${item.id}" names no owner.`);
    if (!item.start.trim() || !item.due.trim()) problems.push(`Schedule item "${item.id}" has no date window.`);
    if (!item.proofAction.trim()) problems.push(`Schedule item "${item.id}" records no proof action.`);
  }
  return problems;
}

export function responseProblems(response: Response): string[] {
  const problems: string[] = [];
  for (const protocol of response.protocols) {
    if (!protocol.trigger.trim()) problems.push(`Response "${protocol.id}" records no trigger.`);
    if (!protocol.owner.trim()) problems.push(`Response "${protocol.id}" names no owner.`);
  }
  return problems;
}

export function scorecardProblems(scorecard: Scorecard, plans: CyclePlans): string[] {
  const problems: string[] = [];
  const planned = new Set(plans.plans.map((plan) => plan.consequenceId));
  for (const measure of scorecard.measures) {
    if (!planned.has(measure.consequenceId))
      problems.push(`Measure "${measure.measure}" tracks a consequence that is not in the sealed cycle.`);
    if (!measure.target.trim()) problems.push(`Measure "${measure.measure}" has no target.`);
    if (!measure.source.trim()) problems.push(`Measure "${measure.measure}" names no source.`);
    if (!measure.reviewCadence.trim()) problems.push(`Measure "${measure.measure}" has no review cadence.`);
  }
  return problems;
}

export function ruleProblems(rules: Rules): string[] {
  const problems: string[] = [];
  if (!rules.operatingRules.length) problems.push("No operating rule is recorded.");
  if (!rules.definitionOfDone.trim()) problems.push("No definition of done is recorded.");
  if (!rules.qualityBar.trim()) problems.push("No quality bar is recorded.");
  if (!rules.handoffRule.trim()) problems.push("No handoff rule is recorded.");
  return problems;
}

export function checklistProblems(checklist: Checklist): string[] {
  const problems: string[] = [];
  for (const item of checklist.items) {
    if (!item.readyCriteria.length) problems.push(`Checklist item "${item.id}" has no ready criteria.`);
    if (!item.doneCriteria.length) problems.push(`Checklist item "${item.id}" has no done criteria.`);
  }
  return problems;
}

export function transitionProblems(transition: Transition): string[] {
  const problems: string[] = [];
  if (!transition.closeOut.trim()) problems.push("No close-out is recorded.");
  if (!transition.reviewInputs.length) problems.push("No review input is recorded.");
  if (!transition.carryOver.length) problems.push("Nothing is recorded as carried over.");
  if (!transition.nextCycleTrigger.trim()) problems.push("No next-cycle trigger is recorded.");
  return problems;
}

function gateFor(
  session: M12Session,
  id: GateResult["id"],
  key: string,
  check: (value: never, plans: CyclePlans) => string[],
  plans: CyclePlans | undefined,
): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  if (!plans) return gate(id, [finding("plans-missing", "The sealed cycle's plans are unavailable.")]);
  return gate(id, check(value as never, plans).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M12Session): GateResult[] {
  const chain = session.sources as { m11?: { data?: { plans?: CyclePlans; decision?: { reviewEvent?: string } } } } | undefined;
  const plans = chain?.m11?.data?.plans as CyclePlans | undefined;
  const decision = (chain?.m11?.data?.decision ?? {}) as CycleDecision;
  const inheritance = session.data.inheritance as Inheritance | undefined;

  return [
    gateFor(
      session,
      "gate-0-inheritance",
      "inheritance",
      (value) => inheritanceProblems(value, plans!, { thresholds: decision.thresholds ?? [], reviewEvent: decision.reviewEvent ?? "" }),
      plans,
    ),
    gateFor(session, "gate-1-assets", "assets", (value) => assetProblems(value), plans),
    gateFor(session, "gate-2-rhythm", "rhythm", (value) => rhythmProblems(value), plans),
    gateFor(session, "gate-3-schedule", "schedule", (value, planSet) => scheduleProblems(value, planSet), plans),
    gateFor(session, "gate-4-response", "response", (value) => responseProblems(value), plans),
    gateFor(session, "gate-5-scorecard", "scorecard", (value, planSet) => scorecardProblems(value, planSet), plans),
    gateFor(session, "gate-6-rules", "rules", (value) => ruleProblems(value), plans),
    gateFor(session, "gate-7-checklist", "checklist", (value) => checklistProblems(value), plans),
    gateFor(session, "gate-8-transition", "transition", (value) => transitionProblems(value), plans),
  ].map((entry) => (inheritance ? entry : entry));
}
