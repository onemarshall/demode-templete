import {
  GATE_IDS,
  type Briefs,
  type CheckFinding,
  type Comparison,
  type Destinations,
  type Direction,
  type Gates,
  type Inheritance,
  type M09Session,
  type Measurement,
} from "./contracts";

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

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const REQUIRED_MEANING = ["brokenThing", "hiddenTruth", "marketDeployableHiddenTruth", "nonNegotiable", "hardWonTeaching"] as const;

export function inheritanceProblems(inheritance: Inheritance): string[] {
  const problems: string[] = [];
  const covered = (source: string) => inheritance.meaningRecords.some((record) => norm(record.sourceWords).includes(norm(source)));
  for (const key of REQUIRED_MEANING)
    if (!covered(inheritance.convictions[key])) problems.push(`No meaning record covers the "${key}" conviction.`);
  if (!covered(inheritance.journey.from)) problems.push("No meaning record covers the journey FROM statement.");
  if (!covered(inheritance.journey.to)) problems.push("No meaning record covers the journey TO statement.");
  for (const declaration of inheritance.governingDeclarations)
    if (!covered(declaration)) problems.push(`No meaning record covers the declaration "${declaration.slice(0, 60)}…".`);
  for (const record of inheritance.meaningRecords) {
    if (record.state !== "confirmed") {
      problems.push(`Meaning record "${record.id}" is ${record.state}.`);
      continue;
    }
    for (const [field, label] of [
      ["interpretation", "interpretation"],
      ["alternative", "the strongest rejected alternative"],
      ["situation", "the recognition situation"],
      ["boundary", "the boundary"],
      ["repeatBack", "the repeat-back confirmation"],
    ] as const)
      if (!record[field].trim()) problems.push(`Meaning record "${record.id}" has no ${label}.`);
  }
  return problems;
}

export function directionProblems(direction: Direction): string[] {
  const problems: string[] = [];
  if (!direction.audience.trim()) problems.push("The direction names no audience.");
  if (!direction.beliefShift.trim()) problems.push("The direction records no belief shift.");
  if (direction.architecturePrinciples.length < 3)
    problems.push("At least three architecture principles are required.");
  return problems;
}

export function destinationProblems(destinations: Destinations): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const destination of destinations.destinations) {
    if (ids.has(destination.id)) problems.push(`Destination id "${destination.id}" is duplicated.`);
    ids.add(destination.id);
    if (!destination.primaryAction.trim()) problems.push(`Destination "${destination.name}" has no primary action.`);
    if (!destination.beliefRole.trim()) problems.push(`Destination "${destination.name}" has no belief role.`);
  }
  return problems;
}

export function decisionProblems(gates: Gates): string[] {
  const problems: string[] = [];
  for (const decision of gates.decisions) {
    if (decision.options.length < 2) problems.push(`Decision "${decision.id}" offers fewer than two options.`);
    if (!decision.options.includes(decision.chosen))
      problems.push(`Decision "${decision.id}" chose an option that was not offered.`);
    if (!decision.rationale.trim()) problems.push(`Decision "${decision.id}" has no rationale.`);
    if (!decision.evidenceRef.trim()) problems.push(`Decision "${decision.id}" cites no evidence.`);
  }
  return problems;
}

export function comparisonProblems(comparison: Comparison): string[] {
  const problems: string[] = [];
  for (const competitor of comparison.competitors) {
    if (!competitor.strength.trim()) problems.push(`Competitor "${competitor.name}" records no strength.`);
    if (!competitor.weakness.trim()) problems.push(`Competitor "${competitor.name}" records no weakness.`);
    if (!competitor.learning.trim()) problems.push(`Competitor "${competitor.name}" records no learning.`);
  }
  return problems;
}

export function briefProblems(briefs: Briefs, destinations: Destinations, measurement: Measurement | undefined): string[] {
  const problems: string[] = [];
  const destinationIds = new Set(destinations.destinations.map((destination) => destination.id));
  const metricIds = new Set((measurement?.metrics ?? []).map((metric) => metric.id));
  for (const brief of briefs.briefs) {
    if (!destinationIds.has(brief.destinationId)) problems.push(`Brief "${brief.id}" cites an unknown destination.`);
    if (brief.sections.length < 2) problems.push(`Brief "${brief.id}" has fewer than two sections.`);
    if (!brief.proof.trim()) problems.push(`Brief "${brief.id}" names no proof.`);
    if (!brief.primaryAction.trim()) problems.push(`Brief "${brief.id}" has no primary action.`);
    if (metricIds.size && !metricIds.has(brief.measurementId))
      problems.push(`Brief "${brief.id}" cites an unknown measurement.`);
  }
  return problems;
}

export function measurementProblems(measurement: Measurement): string[] {
  const problems: string[] = [];
  for (const metric of measurement.metrics) {
    if (!metric.baseline.trim()) problems.push(`Metric "${metric.metric}" has no baseline.`);
    if (!metric.target.trim()) problems.push(`Metric "${metric.metric}" has no target.`);
    if (!metric.source.trim()) problems.push(`Metric "${metric.metric}" names no source.`);
    if (!metric.reviewCadence.trim()) problems.push(`Metric "${metric.metric}" has no review cadence.`);
  }
  return problems;
}

function gateFor(session: M09Session, id: GateResult["id"], key: string, check: (value: never) => string[]): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M09Session): GateResult[] {
  const destinations = session.data.destinations as Destinations | undefined;
  const measurement = session.data.measurement as Measurement | undefined;
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-direction", "direction", directionProblems),
    gateFor(session, "gate-2-destinations", "destinations", destinationProblems),
    gateFor(session, "gate-3-decisions", "gates", decisionProblems),
    gateFor(session, "gate-4-comparison", "comparison", comparisonProblems),
    gateFor(session, "gate-5-briefs", "briefs", (value: never) =>
      destinations ? briefProblems(value, destinations, measurement) : ["The destinations are not confirmed."],
    ),
    gateFor(session, "gate-6-measurement", "measurement", measurementProblems),
  ];
}
