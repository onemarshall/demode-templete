import { createHash } from "node:crypto";
import {
  ASSESSMENT_ROWS,
  Assessment,
  ClientDecision,
  DATA_KEYS,
  DECLARATION_TEST_IDS,
  FoundationDoc,
  Manifesto,
  REQUIRED_SECTIONS,
  SPINE_LABELS,
  STAGES,
  STAGE_SCHEMAS,
  STRUCTURAL_TEST_IDS,
  type AssessmentRowId,
  type BFSource,
  type BFSession,
  type DataStage,
  type Gate,
  type Spine,
} from "./contracts";
import { renderBF } from "./render";

export const hashBF = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const ROW_LABELS: Record<AssessmentRowId, string> = {
  "factual-identity": "Factual business identity",
  "business-form": "Business / purchase form",
  "current-offers": "Current products and services",
  "payer-user": "Payer and user",
  "buying-trigger": "Buying trigger",
  "customer-receipt": "What the customer receives",
  delivery: "How the business delivers",
  "commercial-model": "Commercial model and constraints",
  "market-geography": "Market, geography and routes",
  "practical-outcome": "Practical outcome",
  distinction: "Distinction",
  "founder-belief": "Founder belief and commitments",
  "evidence-for-claims": "Evidence for claims",
  "offer-states": "Offer states (current vs planned)",
  "operating-mechanism": "Operating mechanism",
  unknowns: "Unknowns and conflicts",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Seed the assessment rows from what the sealed viability record already established. Every row
 * lands as `partial` with its basis marked for the human to confirm — nothing here is a decision. */
export function prefillAssessment(source: BFSource) {
  const context = asRecord(asRecord(source.m04.data).context);
  const recommendation = asRecord(asRecord(source.m04.data).recommendation);
  const awareness = asRecord(asRecord(source.m04.data).awareness);
  const m04src = asRecord(source.m04.sources);
  const m02 = asRecord(m04src.m02);
  const m01 = asRecord(m04src.m01);
  const recon = asRecord(m02.recon);
  const outputs = asRecord(m01.outputs);

  const from = (record: Record<string, unknown>, key: string) => {
    const value = str(record[key]);
    return value ? `Viability context records: ${value}` : "Not yet recorded in upstream sources.";
  };

  const seed: Record<AssessmentRowId, { evidence: string; owner: string }> = {
    "factual-identity": {
      evidence: from(context, "businessForm") || `Client engagement: ${source.folder}`,
      owner: "Engagement brief",
    },
    "business-form": {
      evidence: from(context, "businessForm") || "Business form not stated in the viability context.",
      owner: "Viability check context",
    },
    "current-offers": {
      evidence: from(context, "currentOffer") || "Current offers not stated in the viability context.",
      owner: "Viability check context",
    },
    "payer-user": {
      evidence:
        [from(context, "buyer"), from(context, "user")].filter(Boolean).join(" ") ||
        "Payer and user not stated in the viability context.",
      owner: "Viability check context",
    },
    "buying-trigger": {
      evidence: from(context, "trigger") || "Buying trigger not stated in the viability context.",
      owner: "Viability check context",
    },
    "customer-receipt": {
      evidence:
        str(recommendation.customerReceives) ||
        str(awareness.customerReceives) ||
        "What the customer actually receives needs confirming from the viability record.",
      owner: "Viability check recommendation",
    },
    delivery: {
      evidence: from(context, "delivery") || "How the business delivers is not yet stated as a fact.",
      owner: "Viability check context",
    },
    "commercial-model": {
      evidence:
        str(asRecord(source.m04.data).financialGroundingSummary) ||
        "Commercial model and constraints come from the viability findings and route authorisation.",
      owner: "Viability check",
    },
    "market-geography": {
      evidence:
        str(recon.market) || str(recon.geography)
          ? `Market reality records: ${[str(recon.market), str(recon.geography)].filter(Boolean).join(" ")}`
          : "Market, geography and route reach need confirming from the market-reality record.",
      owner: "Market reality",
    },
    "practical-outcome": {
      evidence:
        str(recommendation.practicalOutcome) ||
        "The practical outcome customers get needs confirming from upstream records.",
      owner: "Viability check recommendation",
    },
    distinction: {
      evidence:
        str(recommendation.distinction) ||
        str(recon.distinction) ||
        "What makes the business distinct needs confirming from upstream records.",
      owner: "Market reality / viability",
    },
    "founder-belief": {
      evidence:
        str(outputs.coreBelief) ||
        str(outputs.conviction) ||
        "Founder belief and commitments come from the conviction conversation record.",
      owner: "Conviction conversation",
    },
    "evidence-for-claims": {
      evidence:
        "Claim strength is bounded by the sealed upstream evidence state; anything hypothesis-grade stays labelled as such.",
      owner: "Assessment",
    },
    "offer-states": {
      evidence:
        [from(context, "currentOffer"), from(context, "plannedOffer")].filter(Boolean).join(" ") ||
        "Current versus planned offers need separating in the foundation document.",
      owner: "Viability check context",
    },
    "operating-mechanism": {
      evidence:
        "Whether the client document needs an operating-model explanation is decided here, based on offer form and customer-dependency.",
      owner: "Assessment",
    },
    unknowns: {
      evidence:
        "Every unknown or conflict that would force invention in the client document is listed in the contradiction register below.",
      owner: "Assessment",
    },
  };

  return {
    rows: ASSESSMENT_ROWS.map((id) => ({
      id,
      state: "partial" as const,
      basis: "unknown" as const,
      evidence: seed[id].evidence,
      owner: seed[id].owner,
      nextAction: "",
      capabilityBlocked: "",
    })),
    contradictions: [],
    decision: {
      state: "awaiting_owner_decision" as const,
      reason: "Assessment not yet completed — each row needs a human-confirmed state.",
      questions: [],
      returnOwners: [],
      manifestoRoute: "refused" as const,
    },
    assessedBy: "",
  };
}

/** Human-facing problems that keep an assessment from passing. */
export function assessmentProblems(a: Assessment): string[] {
  const problems: string[] = [];
  const d = a.decision;

  if (!a.assessedBy.trim()) problems.push("Name who made this assessment call.");

  for (const row of a.rows) {
    if (row.state === "sufficient" && ["unsupported-assertion", "unknown"].includes(row.basis))
      problems.push(
        `${ROW_LABELS[row.id]}: a row can't be sufficient on an ${row.basis === "unknown" ? "unknown" : "unsupported"} basis.`,
      );
    if (["missing", "conflicted", "partial"].includes(row.state) && !row.nextAction.trim())
      problems.push(`${ROW_LABELS[row.id]}: a non-sufficient row needs a named next action.`);
  }

  if (d.state === "passed") {
    const bad = a.rows.filter((r) => !["sufficient", "not-applicable"].includes(r.state));
    for (const r of bad)
      problems.push(
        `${ROW_LABELS[r.id]} must be sufficient or not-applicable before the assessment can pass.`,
      );
    const blocking = a.contradictions.filter((c) => c.blocksFoundation);
    if (blocking.length)
      problems.push(
        `${blocking.length} contradiction(s) still block the foundation — resolve or return them upstream first.`,
      );
    if (d.manifestoRoute !== "permitted")
      problems.push("A passed assessment must permit the manifesto route.");
  } else {
    if (d.manifestoRoute !== "refused")
      problems.push("A non-passed assessment can't permit manifesto generation.");
    if (!d.returnOwners.length)
      problems.push("Say which owning stage this assessment returns to for the missing material.");
    if (!d.questions.length)
      problems.push("Record at least one plain question or instruction for the return path.");
  }
  return problems;
}

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** Mechanical declaration checks — the ones code can enforce rather than judge. */
export function declarationProblems(m: Manifesto): string[] {
  const problems: string[] = [];

  // Governing Declarations are extracted, not invented — each must appear verbatim inside the manifesto.
  for (const declaration of m.declarations) {
    if (!norm(m.manifesto).includes(norm(declaration)))
      problems.push(
        `Governing declaration not found verbatim in the manifesto: "${declaration.slice(0, 72)}${declaration.length > 72 ? "…" : ""}"`,
      );
  }

  // Source trace must cover every conviction, every spine statement and every governing declaration.
  const traced = new Set(m.sourceTrace.map((entry) => norm(entry.item)));
  const needTrace = (item: string, label: string) => {
    if (!traced.has(norm(item))) problems.push(`Source trace is missing an entry for ${label}.`);
  };
  m.convictions.forEach((conviction, index) => needTrace(conviction.statement, `conviction ${index + 1}`));
  for (const key of Object.keys(SPINE_LABELS) as (keyof Spine)[])
    needTrace(m.spine[key], `the "${SPINE_LABELS[key]}" spine statement`);
  m.declarations.forEach((declaration) =>
    needTrace(
      declaration,
      `governing declaration "${declaration.slice(0, 60)}${declaration.length > 60 ? "…" : ""}"`,
    ),
  );

  m.implications.forEach((implication) => {
    if (implication.disposition === "returned" && !implication.target.trim())
      problems.push(`Implication "${implication.id}" is marked returned but names no owning target.`);
  });

  const recorded = new Set(m.declarationTests.map((test) => test.id));
  for (const id of DECLARATION_TEST_IDS)
    if (!recorded.has(id)) problems.push(`Declaration test "${id}" has no recorded result.`);
  for (const test of m.declarationTests.filter((entry) => entry.result !== "pass"))
    problems.push(
      test.result === "unassessed"
        ? `Declaration test "${test.id}" has not been assessed — a human must record a result.`
        : `Declaration test "${test.id}" is marked failed — revise or refuse the manifesto.`,
    );

  return problems;
}

/** Seed a complete source-trace skeleton so the human only edits references. */
export function prefillSourceTrace(
  m: Pick<Manifesto, "convictions" | "spine" | "declarations">,
): { item: string; sourceRef: string }[] {
  const items: { item: string; sourceRef: string }[] = [];
  m.convictions.forEach((conviction) => items.push({ item: conviction.statement, sourceRef: "" }));
  for (const key of Object.keys(SPINE_LABELS) as (keyof Spine)[])
    items.push({ item: m.spine[key], sourceRef: "" });
  m.declarations.forEach((declaration) => items.push({ item: declaration, sourceRef: "" }));
  return items;
}

const LEAK_TOKENS = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /\b[0-9a-f]{64}\b/i,
  /\bsessionId\b/i,
  /\breceiptId\b/i,
  /\bsourceHash\b/i,
  /\brenderHash\b/i,
  /_internal/i,
  /\bRUN-MANIFEST\b/,
  /\broute-authori[sz]ation\b/i,
  /\bhandoff-\w+\.json\b/i,
  /\bart_[0-9a-f]+\b/i,
];

/** Mechanical checks over the exact rendered candidate. */
export function renderProblems(doc: FoundationDoc, manifesto: Manifesto): string[] {
  const problems: string[] = [];
  const rendered = renderBF(doc, manifesto, null, 1);

  for (const pattern of LEAK_TOKENS) {
    const hit = rendered.match(pattern);
    if (hit) problems.push(`Internal machinery leaks into the client document: "${hit[0]}"`);
  }

  const lines = rendered.split("\n");
  lines.forEach((line, index) => {
    if (line.startsWith("## ") && lines[index + 1] !== "---")
      problems.push(`Section "${line.slice(3)}" is missing its divider line.`);
  });
  if (/^# /m.test(rendered.split("---\n\n", 2)[1] ?? ""))
    problems.push("The document must not render a duplicate H1.");

  const required = new Set<string>(REQUIRED_SECTIONS);
  if (doc.explanatoryDependency === "required" || doc.explanatoryDependency === "helpful")
    required.add("how-the-business-works");
  const covered = new Set(doc.sectionLineage.map((entry) => entry.section));
  for (const section of required)
    if (!covered.has(section)) problems.push(`Section lineage does not cover "${section}".`);

  if (["required", "helpful"].includes(doc.explanatoryDependency) && !doc.operatingMechanism)
    problems.push(
      `Explanatory dependency is "${doc.explanatoryDependency}" but no operating mechanism is recorded.`,
    );
  if (doc.explanatoryDependency === "not-required" && doc.operatingMechanism)
    problems.push("An operating mechanism is present but the dependency says it is not required.");
  if (doc.explanatoryDependency === "unresolved")
    problems.push(
      "The explanatory dependency is unresolved — the document cannot be approved until it is decided.",
    );
  if (doc.operatingMechanism?.modelState === "unresolved")
    problems.push(
      "The operating model is unresolved; approval would certify a gap as a settled claim.",
    );

  for (const test of doc.structuralTests.filter((entry) => entry.result !== "pass"))
    problems.push(
      test.result === "unassessed"
        ? `Structural test "${test.id}" has not been assessed — a human must record a result.`
        : `Structural test "${test.id}" is marked failed.`,
    );
  const recorded = new Set(doc.structuralTests.map((test) => test.id));
  for (const id of STRUCTURAL_TEST_IDS)
    if (!recorded.has(id)) problems.push(`Structural test "${id}" has no recorded result.`);

  return problems;
}

export interface BFCheck {
  id: string;
  passed: boolean;
  detail: string;
}

/** All conditions the downstream gate evaluates — reported honestly, pass or fail. */
export function checksBF(s: BFSession, upstreamCurrent: boolean): BFCheck[] {
  const checks: BFCheck[] = [];
  const add = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });

  add(
    "upstream",
    upstreamCurrent,
    upstreamCurrent
      ? "Pinned M04 seal, route authorisation and upstream chain are current."
      : "An upstream record changed after this foundation started — the pinned chain is stale.",
  );

  const assessment = Assessment.safeParse(s.data[DATA_KEYS.assessment]);
  const assessmentReceipt = s.confirmations.assessment;
  add(
    "assessment",
    assessment.success &&
      assessment.data.decision.state === "passed" &&
      !!assessmentReceipt &&
      assessmentReceipt.hash === hashBF(assessment.data),
    assessment.success
      ? assessment.data.decision.state === "passed"
        ? "Business definition input assessment passed."
        : `Assessment state is "${assessment.data.decision.state}".`
      : (assessment.error.issues[0]?.message ?? "No assessment recorded."),
  );

  const manifesto = Manifesto.safeParse(s.data[DATA_KEYS.manifesto]);
  const manifestoReceipt = s.confirmations.manifesto;
  const manifestoProblems = manifesto.success ? declarationProblems(manifesto.data) : [];
  add(
    "manifesto",
    manifesto.success &&
      manifestoProblems.length === 0 &&
      !!manifestoReceipt &&
      manifestoReceipt.hash === hashBF(manifesto.data),
    manifesto.success
      ? (manifestoProblems[0] ?? "Manifesto passes mechanical declaration checks.")
      : (manifesto.error.issues[0]?.message ?? "No manifesto recorded."),
  );

  const doc = FoundationDoc.safeParse(s.data[DATA_KEYS.document]);
  const docReceipt = s.confirmations.document;
  const docProblems = doc.success && manifesto.success ? renderProblems(doc.data, manifesto.data) : [];
  add(
    "document",
    doc.success && docProblems.length === 0 && !!docReceipt && docReceipt.hash === hashBF(doc.data),
    doc.success
      ? (docProblems[0] ?? "Document candidate passes mechanical checks.")
      : (doc.error.issues[0]?.message ?? "No document recorded."),
  );

  const review = s.review;
  const unresolvedFindings = review
    ? review.findings.filter(
        (finding) => finding.disposition === "pending" || finding.disposition === "blocking",
      )
    : [];
  add(
    "fresh-review",
    !!review && unresolvedFindings.length === 0 && review.recheck?.result === "pass",
    !review
      ? "A bounded fresh review of the exact candidate has not been run."
      : unresolvedFindings.length
        ? `${unresolvedFindings.length} review finding(s) still need a disposition.`
        : review.recheck?.result === "pass"
          ? "Fresh review ran and the corrected candidate passed recheck."
          : "Findings are resolved but the corrected candidate has not passed a fresh recheck.",
  );

  const decision = ClientDecision.safeParse(s.data.approval);
  const owner = (s.sources as { entry?: { receipt?: { decisionOwner?: { name?: string } } } })
    ?.entry?.receipt?.decisionOwner?.name;
  add(
    "approval",
    decision.success &&
      decision.data.response === "approve" &&
      decision.data.businessConfirmed &&
      decision.data.standConfirmed &&
      !!owner &&
      decision.data.approver.name === owner,
    decision.success
      ? decision.data.response === "approve"
        ? decision.data.businessConfirmed && decision.data.standConfirmed
          ? "Client approved this exact version."
          : "Both confirmations — this is our business, this is where we stand — are required."
        : `Client decision recorded as "${decision.data.response}".`
      : "No client decision recorded.",
  );

  const ra = ((s.sources as { m04?: { routeAuthorization?: Record<string, unknown> } })?.m04
    ?.routeAuthorization ?? {}) as Record<string, unknown>;
  add(
    "route-authorisation",
    ra["authorised_capability"] === "full-standard",
    `Route capability is "${ra["authorised_capability"] ?? "none"}" — full brand-strategy reliance needs "full-standard".`,
  );

  return checks;
}

/** The downstream gate — every condition named, none smoothed. */
export function computeGate(s: BFSession, upstreamCurrent: boolean): Gate {
  const reasons = checksBF(s, upstreamCurrent)
    .filter((check) => !check.passed)
    .map((check) => check.detail);
  const open = reasons.length === 0;
  return {
    downstreamGateState: open ? "open" : "blocked",
    m05Permission: open ? "granted" : "denied",
    reasons,
  };
}

export function invalidateFrom(s: BFSession, stage: DataStage) {
  const index = STAGES.indexOf(stage);
  for (const key of Object.keys(DATA_KEYS) as DataStage[]) {
    if (STAGES.indexOf(key) >= index) {
      delete s.confirmations[key];
      if (key !== stage) delete s.data[DATA_KEYS[key]];
    }
  }
  delete s.data.approval;
  s.review = null;
  s.gate = null;
  s.stage = stage;
  s.status = "revision-requested";
}

export function guardStageMutation(s: BFSession, action: string, stage: DataStage) {
  if (["dependency-return", "source-disputed"].includes(s.status))
    throw new Error("Reconcile the upstream return and create a newly checked session.");
  if (action === "revise" && !s.confirmations[stage])
    throw new Error("There is no confirmed stage to revise");
  if (action !== "revise" && s.stage !== stage) throw new Error(`Complete ${s.stage} before ${stage}`);
}

export function validateStage(s: BFSession, stage: DataStage, payload: unknown) {
  const parsed = STAGE_SCHEMAS[stage].parse(payload);
  if (stage === "assessment") {
    const assessment = Assessment.parse(parsed);
    const problems = assessmentProblems(assessment);
    if (problems.length) throw new Error(problems.join("\n"));
    return assessment;
  }
  if (stage === "manifesto") {
    const manifesto = Manifesto.parse(parsed);
    const assessment = Assessment.safeParse(s.data[DATA_KEYS.assessment]);
    if (!assessment.success || assessment.data.decision.state !== "passed")
      throw new Error("The input assessment must pass before a manifesto can be confirmed.");
    const problems = declarationProblems(manifesto);
    if (problems.length) throw new Error(problems.join("\n"));
    return manifesto;
  }
  if (stage === "document") {
    const doc = FoundationDoc.parse(parsed);
    const manifesto = Manifesto.safeParse(s.data[DATA_KEYS.manifesto]);
    if (!manifesto.success) throw new Error("Confirm the manifesto before the document.");
    const problems = renderProblems(doc, manifesto.data);
    if (problems.length) throw new Error(problems.join("\n"));
    return doc;
  }
  return parsed;
}
