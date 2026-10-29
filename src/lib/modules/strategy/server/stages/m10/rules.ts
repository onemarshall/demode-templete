import {
  GATE_IDS,
  type Artefact,
  type Behaviours,
  type CheckFinding,
  type Context,
  type Inheritance,
  type M10Session,
  type Measurement,
  type OperatingModel,
  type Resonance,
  type Routes,
  type Spatial,
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

export function spatialProblems(spatial: Spatial): string[] {
  const problems: string[] = [];
  if (!spatial.spatialPrinciple.trim()) problems.push("The spatial model states no principle.");
  if (!spatial.proportions.length) problems.push("The spatial model records no proportions.");
  if (!spatial.grid.trim()) problems.push("The spatial model records no grid.");
  if (!spatial.density.trim()) problems.push("The spatial model records no density.");
  if (!spatial.hierarchyNotes.trim()) problems.push("The spatial model records no hierarchy.");
  return problems;
}

export function resonanceProblems(resonance: Resonance): string[] {
  const problems: string[] = [];
  for (const entry of resonance.resonances) {
    if (!entry.beliefConnection.trim()) problems.push(`Resonance "${entry.id}" has no belief connection.`);
    if (!entry.evidence.trim()) problems.push(`Resonance "${entry.id}" cites no evidence.`);
  }
  return problems;
}

export function behaviourProblems(behaviours: Behaviours): string[] {
  const problems: string[] = [];
  for (const behaviour of behaviours.behaviours) {
    if (!behaviour.behaviour.trim()) problems.push(`Behaviour "${behaviour.id}" records no behaviour.`);
    if (!behaviour.beliefConnection.trim()) problems.push(`Behaviour "${behaviour.id}" has no belief connection.`);
  }
  return problems;
}

export function contextProblems(context: Context): string[] {
  const problems: string[] = [];
  for (const entry of context.contexts) {
    if (!entry.constraints.length) problems.push(`Context "${entry.id}" records no constraints.`);
    if (!entry.adaptation.trim()) problems.push(`Context "${entry.id}" records no adaptation.`);
  }
  return problems;
}

export function operatingModelProblems(model: OperatingModel): string[] {
  const problems: string[] = [];
  if (!model.owner.trim()) problems.push("The operating model names no owner.");
  if (!model.cadence.trim()) problems.push("The operating model has no cadence.");
  if (!model.tooling.length) problems.push("The operating model lists no tooling.");
  if (!model.governance.trim()) problems.push("The operating model has no governance.");
  return problems;
}

export function routeProblems(routes: Routes, artefacts: Artefact | undefined): string[] {
  const problems: string[] = [];
  const ids = new Set((artefacts?.artefacts ?? []).map((artefact) => artefact.id));
  for (const route of routes.routes) {
    if (!route.audience.trim()) problems.push(`Route "${route.id}" names no audience.`);
    if (!route.purpose.trim()) problems.push(`Route "${route.id}" has no purpose.`);
    if (ids.size && !ids.has(route.artefactId)) problems.push(`Route "${route.id}" cites an unknown artefact.`);
  }
  return problems;
}

export function artefactProblems(artefact: Artefact): string[] {
  const problems: string[] = [];
  for (const entry of artefact.artefacts) {
    if (!entry.format.trim()) problems.push(`Artefact "${entry.name}" has no format.`);
    if (!entry.purpose.trim()) problems.push(`Artefact "${entry.name}" has no purpose.`);
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

function gateFor(session: M10Session, id: GateResult["id"], key: string, check: (value: never) => string[]): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M10Session): GateResult[] {
  const artefacts = session.data.artefact as Artefact | undefined;
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-spatial", "spatial", spatialProblems),
    gateFor(session, "gate-2-resonance", "resonance", resonanceProblems),
    gateFor(session, "gate-3-behaviours", "behaviours", behaviourProblems),
    gateFor(session, "gate-4-context", "context", contextProblems),
    gateFor(session, "gate-5-operating-model", "operating-model", operatingModelProblems),
    gateFor(session, "gate-6-routes", "routes", (value: never) => routeProblems(value, artefacts)),
    gateFor(session, "gate-7-artefact", "artefact", artefactProblems),
    gateFor(session, "gate-8-measurement", "measurement", measurementProblems),
  ];
}
