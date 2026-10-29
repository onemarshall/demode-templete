import {
  CLAIM_BOUNDARIES,
  DEPLOYABLE_IDS,
  DIAGNOSTIC_IDS,
  GATE_IDS,
  PROSPECT_STATES,
  RESEARCH_STATES,
  STATEMENT_IDS,
  type Claims,
  type CheckFinding,
  type Conversation,
  type Inheritance,
  type M07Session,
  type Measurement,
  type Objections,
  type Qualification,
  type Research,
  type Statements,
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

export function statementProblems(statements: Statements): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const statement of statements.statements) {
    if (!STATEMENT_IDS.includes(statement.id)) problems.push(`Unknown statement id "${statement.id}".`);
    if (!statement.beliefTrace.trim()) problems.push(`Statement "${statement.id}" has no belief trace.`);
    if (!statement.sourceRefs.length) problems.push(`Statement "${statement.id}" cites no sources.`);
    const key = norm(statement.text);
    if (seen.has(key)) problems.push(`Statements "${seen.get(key)}" and "${statement.id}" are identical.`);
    seen.set(key, statement.id);
    const shouldDeploy = (DEPLOYABLE_IDS as readonly string[]).includes(statement.id);
    if (statement.deployable !== shouldDeploy)
      problems.push(
        `Statement "${statement.id}" is marked ${statement.deployable ? "deployable" : "diagnostic"}; it must be ${shouldDeploy ? "deployable" : "diagnostic"}.`,
      );
  }
  for (const id of [...DEPLOYABLE_IDS, ...DIAGNOSTIC_IDS])
    if (!statements.statements.some((statement) => statement.id === id))
      problems.push(`Statement "${id}" is missing.`);
  return problems;
}

export function qualificationProblems(qualification: Qualification): string[] {
  const problems: string[] = [];
  for (const criterion of qualification.criteria) {
    if (!criterion.test.trim()) problems.push(`Criterion "${criterion.name}" has no test.`);
    if (!criterion.disqualifyIf.trim()) problems.push(`Criterion "${criterion.name}" records no disqualification.`);
  }
  for (const prospect of qualification.prospects) {
    if (!PROSPECT_STATES.includes(prospect.state)) problems.push(`Prospect "${prospect.id}" has an unknown state.`);
    if (!prospect.evidence.trim()) problems.push(`Prospect "${prospect.id}" records no evidence for its state.`);
  }
  if (!qualification.protocol.trigger.trim() || !qualification.protocol.response.trim())
    problems.push("The disqualification protocol needs its trigger and response.");
  if (!qualification.protocol.returnOwner.trim())
    problems.push("The disqualification protocol names no return owner.");
  return problems;
}

export function conversationProblems(conversation: Conversation): string[] {
  const problems: string[] = [];
  for (const stage of conversation.stages) {
    if (!stage.questions.length) problems.push(`Conversation stage "${stage.stage}" has no questions.`);
    if (!stage.exitCriteria.trim()) problems.push(`Conversation stage "${stage.stage}" has no exit criteria.`);
  }
  return problems;
}

export function objectionProblems(objections: Objections): string[] {
  const problems: string[] = [];
  for (const objection of objections.objections) {
    if (!objection.beliefBehind.trim()) problems.push(`Objection "${objection.id}" names no belief behind it.`);
    if (!objection.response.trim()) problems.push(`Objection "${objection.id}" has no response.`);
    if (!objection.evidenceRef.trim()) problems.push(`Objection "${objection.id}" cites no evidence.`);
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

export function researchProblems(research: Research): string[] {
  const problems: string[] = [];
  for (const request of research.requests) {
    if (!RESEARCH_STATES.includes(request.status)) problems.push(`Research "${request.id}" has an unknown status.`);
    if (!request.method.trim()) problems.push(`Research "${request.id}" names no method.`);
    if (!request.owner.trim()) problems.push(`Research "${request.id}" names no owner.`);
    if (request.status === "answered" && !request.why.trim())
      problems.push(`Research "${request.id}" is answered but records no finding.`);
  }
  return problems;
}

function gateFor(
  session: M07Session,
  id: GateResult["id"],
  key: string,
  check: (value: never) => string[],
): GateResult {
  const value = session.data[key];
  if (!session.confirmations[key] || !value)
    return gate(id, [finding(`${key}-missing`, `${key} is not confirmed.`)]);
  return gate(id, check(value as never).map((problem) => finding(`${key}-problem`, problem, key)));
}

export function computeGates(session: M07Session): GateResult[] {
  return [
    gateFor(session, "gate-0-inheritance", "inheritance", inheritanceProblems),
    gateFor(session, "gate-1-statements", "statements", statementProblems),
    gateFor(session, "gate-2-qualification", "qualification", qualificationProblems),
    gateFor(session, "gate-3-conversation", "conversation", conversationProblems),
    gateFor(session, "gate-4-objections", "objections", objectionProblems),
    gateFor(session, "gate-5-claims", "claims", claimProblems),
    gateFor(session, "gate-6-measurement", "measurement", measurementProblems),
    gateFor(session, "gate-7-research", "research", researchProblems),
  ];
}
