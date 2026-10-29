import {
  ANCHOR_IDS,
  BELIEF_STAGES,
  EVIDENCE_CONFIDENCE,
  GATE_IDS,
  ROUTE_DISPOSITIONS,
  ROUTE_FUNCTIONS,
  STATEMENT_IDS,
  type Activation,
  type Audience,
  type Checks,
  type CheckFinding,
  type Expressions,
  type Foundation,
  type Inheritance,
  type Measurement,
  type M06Session,
  type Positioning,
  type Routes,
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

export function foundationProblems(foundation: Foundation): string[] {
  const problems: string[] = [];
  if (!foundation.positioningBasis.trim()) problems.push("The foundation records no positioning basis.");
  if (foundation.declarations.length < 3) problems.push("At least three governing declarations are required.");
  for (const key of Object.keys(foundation.manifestoSpine) as (keyof Foundation["manifestoSpine"])[])
    if (!foundation.manifestoSpine[key].trim()) problems.push(`The manifesto spine has no "${key}" statement.`);
  return problems;
}

export function audienceProblems(audience: Audience): string[] {
  const problems: string[] = [];
  if (!audience.segments.some((segment) => segment.id === audience.primaryId))
    problems.push("The primary segment id does not match any segment.");
  const ids = new Set<string>();
  for (const segment of audience.segments) {
    if (ids.has(segment.id)) problems.push(`Segment id "${segment.id}" is duplicated.`);
    ids.add(segment.id);
    if (!BELIEF_STAGES.includes(segment.beliefStage)) problems.push(`Segment "${segment.id}" has an unknown belief stage.`);
    if (!segment.currentBelief.trim() || !segment.desiredBelief.trim())
      problems.push(`Segment "${segment.id}" needs both its current and desired belief.`);
  }
  return problems;
}

export function positioningProblems(positioning: Positioning): string[] {
  const problems: string[] = [];
  if (!positioning.competitorTest.trim()) problems.push("The positioning has no competitor test.");
  if (!positioning.beliefTrace.trim()) problems.push("The positioning does not trace to the belief.");
  if (!positioning.proofBasis.trim()) problems.push("The positioning records no proof basis.");
  if (positioning.statement.trim().length < 20)
    problems.push("The positioning statement is too short to be a position rather than a slogan.");
  return problems;
}

export function expressionProblems(expressions: Expressions): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const statement of expressions.statements) {
    if (!STATEMENT_IDS.includes(statement.id)) problems.push(`Unknown statement id "${statement.id}".`);
    if (!statement.beliefTrace.trim()) problems.push(`Statement "${statement.id}" has no belief trace.`);
    if (!statement.sourceRefs.length) problems.push(`Statement "${statement.id}" cites no sources.`);
    const key = norm(statement.text);
    if (seen.has(key)) problems.push(`Statements "${seen.get(key)}" and "${statement.id}" are identical.`);
    seen.set(key, statement.id);
  }
  for (const id of ANCHOR_IDS) {
    const anchor = expressions.statements.find((statement) => statement.id === id);
    if (!anchor) problems.push(`Anchor statement "${id}" is missing.`);
    else if (!anchor.anchor) problems.push(`Statement "${id}" must be marked as an anchor.`);
  }
  return problems;
}

export function routeProblems(routes: Routes, audience: Audience): string[] {
  const problems: string[] = [];
  const audienceIds = new Set(audience.segments.map((segment) => segment.id));
  if (!routes.routes.some((route) => route.disposition === "primary"))
    problems.push("At least one route must be primary.");
  for (const route of routes.routes) {
    if (!ROUTE_FUNCTIONS.includes(route.function)) problems.push(`Route "${route.id}" has an unknown function.`);
    if (!ROUTE_DISPOSITIONS.includes(route.disposition)) problems.push(`Route "${route.id}" has an unknown disposition.`);
    if (!EVIDENCE_CONFIDENCE.includes(route.evidenceConfidence)) problems.push(`Route "${route.id}" has an unknown evidence confidence.`);
    if (!audienceIds.has(route.audienceId)) problems.push(`Route "${route.id}" cites an unknown audience.`);
    if (!route.rationale.trim()) problems.push(`Route "${route.id}" has no rationale.`);
  }
  return problems;
}

export function activationProblems(activation: Activation): string[] {
  const problems: string[] = [];
  if (!activation.budgetBasis.trim()) problems.push("The activation records no budget basis.");
  if (activation.firstActions.length < 3) problems.push("At least three first actions are required.");
  if (!activation.owner.trim()) problems.push("The activation names no owner.");
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

function gateFor(session: M06Session, id: GateResult["id"], key: keyof typeof session.data, check: (value: never) => string[]): GateResult {
  const value = session.data[key as string];
  if (!session.confirmations[key as string] || !value) return gate(id, [finding(`${key}-missing`, `${String(key)} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, String(key))));
}

/** Gates 0–7 over the confirmed record. No mutation. */
export function computeGates(session: M06Session): GateResult[] {
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-foundation", "foundation", foundationProblems),
    gateFor(session, "gate-2-audience", "audience", audienceProblems),
    gateFor(session, "gate-3-positioning", "positioning", positioningProblems),
    gateFor(session, "gate-4-expressions", "expressions", expressionProblems),
    gateFor(session, "gate-5-routes", "routes", (routes: Routes) =>
      routeProblems(routes, session.data.audience as Audience),
    ),
    gateFor(session, "gate-6-activation", "activation", activationProblems),
    gateFor(session, "gate-7-measurement", "measurement", measurementProblems),
  ];
}

export function candidateHashFor(checks: Pick<Checks, "renderHash">): string {
  return checks.renderHash;
}
