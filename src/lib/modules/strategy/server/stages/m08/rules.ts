import {
  CLAIM_BOUNDARIES,
  GATE_IDS,
  type CheckFinding,
  type Claims,
  type Compliance,
  type Distribution,
  type Gaps,
  type Inheritance,
  type Library,
  type M08Session,
  type Measures,
  type Mission,
  type Operations,
  type Pillars,
  type Production,
  type SalesMap,
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

export function missionProblems(mission: Mission): string[] {
  const problems: string[] = [];
  if (!mission.audienceId.trim()) problems.push("The mission names no audience.");
  if (!mission.beliefShift.trim()) problems.push("The mission records no belief shift.");
  if (!mission.purpose.trim()) problems.push("The mission records no purpose.");
  return problems;
}

export function pillarProblems(pillars: Pillars): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const pillar of pillars.pillars) {
    if (ids.has(pillar.id)) problems.push(`Pillar id "${pillar.id}" is duplicated.`);
    ids.add(pillar.id);
    if (!pillar.beliefAnchor.trim()) problems.push(`Pillar "${pillar.name}" has no belief anchor.`);
    if (!pillar.rationale.trim()) problems.push(`Pillar "${pillar.name}" has no rationale.`);
  }
  return problems;
}

export function libraryProblems(library: Library, pillars: Pillars): string[] {
  const problems: string[] = [];
  const ids = new Set(pillars.pillars.map((pillar) => pillar.id));
  for (const asset of library.assets) {
    if (!ids.has(asset.pillarId)) problems.push(`Asset "${asset.title}" cites an unknown pillar.`);
    if (!asset.evidenceRef.trim()) problems.push(`Asset "${asset.title}" cites no evidence.`);
  }
  return problems;
}

export function gapProblems(gaps: Gaps, pillars: Pillars): string[] {
  const problems: string[] = [];
  const ids = new Set(pillars.pillars.map((pillar) => pillar.id));
  for (const gap of gaps.gaps) {
    if (!ids.has(gap.pillarId)) problems.push(`Gap "${gap.id}" cites an unknown pillar.`);
    if (!gap.remedy.trim()) problems.push(`Gap "${gap.id}" records no remedy.`);
    if (gap.severity === "blocking" && !gap.why.trim())
      problems.push(`Blocking gap "${gap.id}" does not explain why it blocks.`);
  }
  return problems;
}

export function salesMapProblems(map: SalesMap): string[] {
  const problems: string[] = [];
  for (const entry of map.mappings) {
    if (!entry.assetIds.length) problems.push(`Objection "${entry.objectionId}" maps to no asset.`);
    if (entry.coverage === "none") problems.push(`Objection "${entry.objectionId}" has no coverage.`);
  }
  return problems;
}

export function claimProblems(claims: Claims): string[] {
  const problems: string[] = [];
  for (const claim of claims.claims) {
    if (!CLAIM_BOUNDARIES.includes(claim.boundary)) problems.push(`Claim "${claim.id}" has an unknown boundary.`);
    if (!claim.evidenceRef.trim()) problems.push(`Claim "${claim.id}" cites no evidence.`);
    if (claim.boundary === "cannot-claim" && claim.approvedWording.trim())
      problems.push(`Claim "${claim.id}" is cannot-claim but carries approved wording.`);
    if (claim.boundary !== "cannot-claim" && !claim.approvedWording.trim())
      problems.push(`Claim "${claim.id}" needs its approved wording.`);
  }
  return problems;
}

export function distributionProblems(distribution: Distribution, pillars: Pillars): string[] {
  const problems: string[] = [];
  const ids = new Set(pillars.pillars.map((pillar) => pillar.id));
  for (const channel of distribution.channels) {
    if (!ids.has(channel.pillarId)) problems.push(`Channel "${channel.id}" cites an unknown pillar.`);
    if (!channel.cadence.trim()) problems.push(`Channel "${channel.id}" has no cadence.`);
    if (!channel.owner.trim()) problems.push(`Channel "${channel.id}" names no owner.`);
  }
  return problems;
}

export function productionProblems(production: Production): string[] {
  const problems: string[] = [];
  for (const step of production.workflow) {
    if (!step.owner.trim()) problems.push(`Production step "${step.stage}" names no owner.`);
    if (!step.output.trim()) problems.push(`Production step "${step.stage}" has no output.`);
    if (!step.sla.trim()) problems.push(`Production step "${step.stage}" has no turnaround.`);
  }
  return problems;
}

export function measureProblems(measures: Measures): string[] {
  const problems: string[] = [];
  for (const metric of measures.metrics) {
    if (!metric.baseline.trim()) problems.push(`Metric "${metric.metric}" has no baseline.`);
    if (!metric.target.trim()) problems.push(`Metric "${metric.metric}" has no target.`);
    if (!metric.source.trim()) problems.push(`Metric "${metric.metric}" names no source.`);
    if (!metric.reviewCadence.trim()) problems.push(`Metric "${metric.metric}" has no review cadence.`);
  }
  return problems;
}

export function operationsProblems(operations: Operations): string[] {
  const problems: string[] = [];
  if (!operations.owner.trim()) problems.push("The operating model names no owner.");
  if (!operations.cadence.trim()) problems.push("The operating model has no cadence.");
  if (!operations.reviewForum.trim()) problems.push("The operating model names no review forum.");
  if (!operations.escalation.trim()) problems.push("The operating model has no escalation path.");
  return problems;
}

export function complianceProblems(compliance: Compliance): string[] {
  const problems: string[] = [];
  for (const check of compliance.checks) {
    if (check.result === "fail") problems.push(`Compliance check "${check.item}" fails.`);
    if (check.result !== "not-applicable" && !check.evidenceRef.trim())
      problems.push(`Compliance check "${check.item}" cites no evidence.`);
  }
  return problems;
}

function gateFor(session: M08Session, id: GateResult["id"], key: string, check: (value: never) => string[]): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value) return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M08Session): GateResult[] {
  const pillars = session.data.pillars as Pillars | undefined;
  const withPillars = (check: (value: never, pillars: Pillars) => string[]) =>
    (value: never) => (pillars ? check(value, pillars) : ["The pillars are not confirmed."]);
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-mission", "mission", missionProblems),
    gateFor(session, "gate-2-pillars", "pillars", pillarProblems),
    gateFor(session, "gate-3-library", "library", withPillars(libraryProblems)),
    gateFor(session, "gate-4-gaps", "gaps", withPillars(gapProblems)),
    gateFor(session, "gate-5-sales-map", "sales-map", salesMapProblems),
    gateFor(session, "gate-6-claims", "claims", claimProblems),
    gateFor(session, "gate-7-distribution", "distribution", withPillars(distributionProblems)),
    gateFor(session, "gate-8-production", "production", productionProblems),
    gateFor(session, "gate-9-measures", "measures", measureProblems),
    gateFor(session, "gate-10-operations", "operations", operationsProblems),
    gateFor(session, "gate-11-compliance", "compliance", complianceProblems),
  ];
}
