// M03 step rules — pure, transport-free. Every confirmation validates the human's
// submitted section, writes it into the working record, and records the mechanical
// side effects (risk flags, risk landing places) the legacy module produced.
import { z } from "zod";
import {
  ADVOCATE_CHALLENGES,
  COMMITMENT_SCOPES,
  CREDIBILITY_STATES,
  EVIDENCE_STATUSES,
  EXPERIENCE_SHAPES,
  FRICTION_SOURCES,
  GRID_ACTIONS,
  PROOF_ECONOMIES,
  PROFESSIONAL_CALLS,
  type Commitments,
  type GridAction,
} from "./session";

export const ACTION_LABEL: Record<GridAction, string> = {
  question: "Question",
  reject: "Reject",
  commit: "Commit",
  introduce: "Introduce",
};

export const FRICTION_LABEL: Record<string, string> = {
  beliefContradiction: "Belief contradiction",
  operationalChange: "Operational change",
  culturalShift: "Cultural shift",
  customerExplanation: "Customer explanation",
  economicCost: "Economic cost",
  accumulatedProof: "Accumulated proof",
  specialistAuthority: "Specialist authority",
};

// ---------- step bodies ----------

const required = (message: string) => z.string().trim().min(1, message);

export const InputsBody = z.object({
  solvesFor: z.enum(["founder", "second_voice", "shared"]),
  solvesForNote: z.string().default(""),
  commitmentScope: z.enum(COMMITMENT_SCOPES),
  scopeNote: z.string().default(""),
  priorPositioning: z
    .object({
      supplied: z.boolean().default(false),
      source: z.string().default(""),
      currentness: z.string().default(""),
      text: z.string().default(""),
      note: z.string().default(""),
    })
    .default(() => ({ supplied: false, source: "", currentness: "", text: "", note: "" })),
  terrainRead: z.string().default(""),
});
export type InputsBody = z.infer<typeof InputsBody>;

export const ChallengeBody = z.object({
  contradictions: z.array(z.string().min(1)).min(1, "Name at least one point of contradiction"),
  genuineVsContrarian: required("Answer the contrarian check in writing"),
});
export type ChallengeBody = z.infer<typeof ChallengeBody>;

export const JourneyBody = z.object({
  from: required("Write the FROM belief — what customers actually hold"),
  to: required("Write the TO belief — what the brand offers instead"),
  experientialChange: required("Describe the experiential change in the customer's voice"),
  experienceShape: z.enum(EXPERIENCE_SHAPES),
  discoveryMechanism: required(
    "Name what the customer can do, see, compare or answer to discover the gap",
  ),
});
export type JourneyBody = z.infer<typeof JourneyBody>;

const GridRowBody = z.object({
  action: z.enum(GRID_ACTIONS),
  move: required("Name the move"),
  beliefRationale: required("Every move needs its belief rationale"),
  proofCommitment: required("Every move needs a proof commitment"),
  operationalRule: required(
    "Push the commitment to an operational rule — one someone not in the room can apply",
  ),
  specialisationSignal: z.string().default(""),
  proofArtefactType: z.string().default(""),
  traceToBelief: required("Trace the move to the Core Belief explicitly"),
});
export const GridBody = z.object({
  rows: z.array(GridRowBody).length(4, "The grid needs all four actions"),
});
export type GridBody = z.infer<typeof GridBody>;

const ProofRowBody = z.object({
  action: z.enum(GRID_ACTIONS),
  product: z.string().default(""),
  policy: z.string().default(""),
  story: z.string().default(""),
  framework: z.string().default(""),
  proofEconomy: z.enum(PROOF_ECONOMIES),
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  claimBoundaryNote: required("Record how this proof stays inside the claims boundary"),
  capturePlan: z.string().default(""),
});
export const ProofBody = z.object({
  rows: z.array(ProofRowBody).length(4, "Proof needs a row per grid action"),
});
export type ProofBody = z.infer<typeof ProofBody>;

const FrictionCellBody = z.object({
  level: z.enum(["high", "medium", "low"]),
  note: z.string().default(""),
});
const FrictionSourcesBody = z.object(
  Object.fromEntries(FRICTION_SOURCES.map((source) => [source, FrictionCellBody])) as Record<
    (typeof FRICTION_SOURCES)[number],
    typeof FrictionCellBody
  >,
);
export const FrictionBody = z.object({
  rows: z
    .array(z.object({ action: z.enum(GRID_ACTIONS), sources: FrictionSourcesBody }))
    .length(4, "Friction needs a row per grid action"),
  lowestFrictionCompetitor: required("Name the lowest-friction competitor — the real copy threat"),
  lowestFrictionBasis: required("Why them — what would they actually have to change"),
  threatAssessment: required("Assess the differentiation against that competitor specifically"),
});
export type FrictionBody = z.infer<typeof FrictionBody>;

export const CredibilityBody = z.object({
  referenceEvidence: z.string().default(""),
  state: z.enum(CREDIBILITY_STATES),
  cause: z.string().default(""),
  reviewCondition: z.string().default(""),
});
export type CredibilityBody = z.infer<typeof CredibilityBody>;

export const ConfrontationsBody = z.object({
  pastAudit: z
    .array(
      z.object({
        item: z.string().min(1),
        beliefSays: z.enum(["yes", "no"]),
        decision: z.enum(["refine", "pivot", "undecided"]).nullable().default(null),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  futureConfrontations: z.array(z.string().min(1)).default(() => []),
});
export type ConfrontationsBody = z.infer<typeof ConfrontationsBody>;

export const CostBody = z.object({ costs: z.array(z.string().min(1)).default(() => []) });
export type CostBody = z.infer<typeof CostBody>;

export const AdvocateBody = z.object({
  challenges: z
    .array(
      z.object({
        id: z.enum(["case-for-default", "funded-copycat", "positioning-vs-preference"]),
        case: required(
          "Write the strongest case — if you can't, you don't understand what you're challenging",
        ),
        verdict: z.enum(["survives", "fails"]),
        note: z.string().default(""),
      }),
    )
    .length(3, "All three advocate challenges need a case and a verdict"),
});
export type AdvocateBody = z.infer<typeof AdvocateBody>;

export const JudgementBody = z.object({
  optionsConsidered: z
    .array(z.string().min(1))
    .min(2, "Name at least two credible options — including the status quo where it's legitimate"),
  recommendation: required("Make one direct professional call"),
  confidence: z.enum(["high", "moderate", "low"]),
  confidenceBasis: required(
    "What earns that confidence — evidence, counterevidence, unknowns, consequence, reversibility",
  ),
  commercialConsequences: z.object({
    ifHolds: required("What becomes possible if the commitment holds"),
    ifNot: required("What the business is exposed to if it doesn't"),
    ifNoDecision: required("What delay or no decision means"),
  }),
  reversalConditions: required("Name the evidence, event or condition that would reopen this"),
  integrityCheck: required(
    "State whether any conviction, buyer, evidence or operating boundary was weakened for convenience",
  ),
  professionalCall: z.enum(PROFESSIONAL_CALLS),
  nextWork: required("Name the exact next work or return owner"),
});
export type JudgementBody = z.infer<typeof JudgementBody>;

export const OutcomeBody = z.object({
  outcome: z.enum(["a", "x"]),
  statement: required("Write the outcome statement"),
  returnDoc: z
    .object({
      module: z.enum(["01", "02"]),
      refineWhat: required("Name what needs refining upstream"),
      evidenceProduced: required("Name the evidence this run produced for that work"),
    })
    .nullable()
    .default(null),
});
export type OutcomeBody = z.infer<typeof OutcomeBody>;

// ---------- confirmations ----------

function addFlag(commitments: Commitments, flag: string) {
  if (!commitments.riskFlags.includes(flag)) commitments.riskFlags.push(flag);
}

export function confirmInputs(commitments: Commitments, body: InputsBody) {
  const carried = commitments.upstream.carriedForward;
  if (carried.secondVoice.present && body.solvesFor === "second_voice" && !body.solvesForNote.trim())
    throw new Error("Solving for the second voice's problem-shape — record why their framing wins");
  if (carried.terrainDiagnosis === "cyclical" && !body.terrainRead.trim())
    throw new Error("The terrain read is cyclical — record why this run proceeds anyway (or stop here)");
  if (carried.terrainDiagnosis === "ambiguous-needs-evidence" && !body.terrainRead.trim())
    throw new Error(
      "The terrain is undiagnosed — record how the cost of commitment reads against that uncertainty",
    );
  if (body.priorPositioning.supplied && !body.priorPositioning.text.trim())
    throw new Error("Prior positioning marked as supplied but the material is empty");
  commitments.inputs = {
    solvesFor: body.solvesFor,
    solvesForNote: body.solvesForNote,
    commitmentScope: body.commitmentScope,
    scopeNote: body.scopeNote,
    priorPositioning: body.priorPositioning,
    terrainRead: body.terrainRead,
  };
  if (carried.terrainDiagnosis === "cyclical")
    addFlag(commitments, `Cyclical terrain — run proceeded anyway: ${body.terrainRead}`);
}

export function confirmChallenge(commitments: Commitments, body: ChallengeBody) {
  commitments.beliefChallenge = {
    industryDefault: commitments.upstream.m02Findings.descriptiveDefault,
    coreBelief: commitments.upstream.m01Inputs.coreBelief,
    contradictions: body.contradictions,
    genuineVsContrarian: body.genuineVsContrarian,
  };
}

export function confirmJourney(commitments: Commitments, body: JourneyBody) {
  commitments.journey = { ...body };
}

export function confirmGrid(commitments: Commitments, body: GridBody) {
  const actions = new Set(body.rows.map((row) => row.action));
  for (const action of GRID_ACTIONS)
    if (!actions.has(action)) throw new Error(`The grid is missing a ${action} row`);
  for (const row of body.rows) {
    if ((row.action === "question" || row.action === "reject") && !row.specialisationSignal.trim())
      throw new Error(
        `${row.action.toUpperCase()} needs a Public Specialisation Signal — the market must be able to observe the refusal without reading this grid`,
      );
    if ((row.action === "commit" || row.action === "introduce") && !row.proofArtefactType.trim())
      throw new Error(
        `${row.action.toUpperCase()} needs a deployable proof artefact type — the form through which the commitment becomes visible`,
      );
  }
  commitments.grid = body.rows.map((row) => ({ ...row }));
}

export function confirmProof(commitments: Commitments, body: ProofBody) {
  const actions = new Set(body.rows.map((row) => row.action));
  for (const action of GRID_ACTIONS)
    if (!actions.has(action)) throw new Error(`Proof is missing a ${action} row`);
  for (const row of body.rows) {
    if (![row.product, row.policy, row.story, row.framework].some((field) => field.trim()))
      throw new Error(
        `${row.action.toUpperCase()} has no proof point — name at least one form the demonstration takes, or the move has no proof`,
      );
    if (
      (row.evidenceStatus === "prospective" || row.evidenceStatus === "thin") &&
      !row.capturePlan.trim()
    )
      throw new Error(
        `${row.action.toUpperCase()} is ${row.evidenceStatus} — record the capture-and-review plan: owner, next qualifying incident, review trigger`,
      );
  }
  commitments.proof = body.rows.map((row) => ({ ...row }));
  // CMQG_02 — proof rows that touch must-qualify claims are flagged, not promoted.
  for (const row of commitments.proof) {
    const note = row.claimBoundaryNote.toLowerCase();
    if (note.includes("must-qualify") || note.includes("must qualify"))
      addFlag(
        commitments,
        `${row.action.toUpperCase()} proof references must-qualify claims — ${row.claimBoundaryNote}`,
      );
  }
}

export function confirmFriction(commitments: Commitments, body: FrictionBody) {
  const actions = new Set(body.rows.map((row) => row.action));
  for (const action of GRID_ACTIONS)
    if (!actions.has(action)) throw new Error(`Friction is missing a ${action} row`);
  for (const row of body.rows)
    for (const source of FRICTION_SOURCES)
      if (!row.sources[source]?.level)
        throw new Error(
          `${row.action.toUpperCase()} — ${source} has no level; assess all seven sources`,
        );
  commitments.friction = {
    rows: body.rows.map((row) => ({ action: row.action, sources: row.sources })),
    lowestFrictionCompetitor: body.lowestFrictionCompetitor,
    lowestFrictionBasis: body.lowestFrictionBasis,
    threatAssessment: body.threatAssessment,
  };
  // The lowest-friction competitor is the real copy threat — named in Risk Flags
  // whether or not it was the one planned against.
  commitments.riskFlags = commitments.riskFlags.filter(
    (flag) => !flag.startsWith("Lowest-friction copy threat:"),
  );
  commitments.riskFlags.push(
    `Lowest-friction copy threat: ${body.lowestFrictionCompetitor} — ${body.threatAssessment}`,
  );
  // CMQG_03 — M03-routed acknowledged risks that landed here are marked.
  for (const risk of commitments.upstream.carriedForward.acknowledgedRisks)
    if (
      risk.routing === "m03" &&
      risk.landedIn === null &&
      body.threatAssessment.toLowerCase().includes(risk.pattern)
    )
      risk.landedIn = "friction";
}

export function confirmCredibility(commitments: Commitments, body: CredibilityBody) {
  if (body.state !== "credible" && !body.cause.trim())
    throw new Error(
      "A credibility gap needs its likely cause named — time/proof, distribution, execution, recognition, or a genuine strategic challenge",
    );
  if (body.state === "credibility-gap" && !body.reviewCondition.trim())
    throw new Error("A named gap needs a review condition — the event or date you'd re-check against");
  commitments.credibility = { ...body };
  if (body.state !== "credible") {
    commitments.riskFlags = commitments.riskFlags.filter(
      (flag) => !flag.startsWith("Credibility gap:"),
    );
    commitments.riskFlags.push(`Credibility gap: ${body.state.replace(/-/g, " ")} — ${body.cause}`);
  }
}

export function confirmConfrontations(commitments: Commitments, body: ConfrontationsBody) {
  for (const row of body.pastAudit)
    if (row.beliefSays === "no" && !row.decision)
      throw new Error(
        `"${row.item}" contradicts the belief — it needs a decision: refine the belief, or document the pivot. Undecided is allowed but it blocks a locked outcome.`,
      );
  commitments.confrontations = {
    pastAudit: body.pastAudit,
    futureConfrontations: body.futureConfrontations,
  };
}

export function confirmCost(commitments: Commitments, body: CostBody) {
  commitments.costOfCommitment = { costs: body.costs };
  if (!body.costs.length)
    addFlag(
      commitments,
      "No cost of commitment recorded — the commitment isn't demonstrably real",
    );
}

export function confirmAdvocate(commitments: Commitments, body: AdvocateBody) {
  const ids = new Set(body.challenges.map((challenge) => challenge.id));
  for (const challenge of ADVOCATE_CHALLENGES)
    if (!ids.has(challenge.id)) throw new Error(`The "${challenge.prompt}" challenge is missing`);
  commitments.advocate = { challenges: body.challenges.map((challenge) => ({ ...challenge })) };
  for (const challenge of body.challenges)
    if (challenge.verdict === "fails")
      addFlag(
        commitments,
        `Advocate challenge failed: ${ADVOCATE_CHALLENGES.find((entry) => entry.id === challenge.id)?.prompt} — ${challenge.note || challenge.case.slice(0, 120)}`,
      );
}

export function confirmJudgement(commitments: Commitments, body: JudgementBody) {
  commitments.judgement = { ...body };
}

// ---------- mechanical outcome checks ----------

/** Everything that can honestly block Outcome A, computed from the record — not the model's
 * say-so. Outcome X is always available; these checks decide whether A is. */
export function outcomeCheck(commitments: Commitments): { canA: boolean; problems: string[] } {
  const problems: string[] = [];

  for (const action of GRID_ACTIONS) {
    const row = commitments.grid.find((entry) => entry.action === action);
    if (!row) {
      problems.push(`Grid: no ${action} row`);
      continue;
    }
    for (const [field, label] of [
      ["move", "move"],
      ["beliefRationale", "belief rationale"],
      ["proofCommitment", "proof commitment"],
      ["operationalRule", "operational rule"],
      ["traceToBelief", "trace to the Core Belief"],
    ] as const)
      if (!row[field].trim()) problems.push(`Grid ${action.toUpperCase()}: missing ${label}`);
  }

  for (const action of GRID_ACTIONS) {
    const row = commitments.friction.rows.find((entry) => entry.action === action);
    if (!row) {
      problems.push(`Friction: no ${action} row`);
      continue;
    }
    for (const source of FRICTION_SOURCES)
      if (!row.sources[source]?.level) problems.push(`Friction ${action.toUpperCase()}: ${source} not assessed`);
  }
  if (!commitments.friction.lowestFrictionCompetitor.trim())
    problems.push("Friction: the lowest-friction competitor isn't named");

  const undecided = commitments.confrontations.pastAudit.filter(
    (row) => row.beliefSays === "no" && row.decision === "undecided",
  );
  if (undecided.length)
    problems.push(
      `Past-behaviour audit: ${undecided.length} contradiction${undecided.length === 1 ? "" : "s"} undecided — refine the belief or document the pivot`,
    );

  if (!commitments.costOfCommitment.costs.length)
    problems.push("Cost of commitment is empty — a commitment with no costs isn't real");

  const failedAdvocate = commitments.advocate.challenges.filter(
    (challenge) => challenge.verdict === "fails",
  );
  if (failedAdvocate.length)
    problems.push(
      `Advocate challenges failed: ${failedAdvocate.map((challenge) => ADVOCATE_CHALLENGES.find((entry) => entry.id === challenge.id)?.prompt).join("; ")} — Outcome X is the honest result`,
    );

  // CMQG_03 — every M03-routed acknowledged risk must have landed somewhere.
  for (const risk of commitments.upstream.carriedForward.acknowledgedRisks)
    if (risk.routing === "m03" && risk.landedIn === null)
      problems.push(
        `Acknowledged risk "${risk.label}" was routed to this module and hasn't landed — place it in friction or the risk flags`,
      );

  // Judgement must be complete before an outcome is recordable.
  const judgement = commitments.judgement;
  if (!judgement.recommendation.trim() || !judgement.professionalCall)
    problems.push("The strategic judgement isn't recorded yet");

  return { canA: problems.length === 0, problems };
}

export const RELIANCE_SCOPE_A =
  "Module 04 hypothesis-mode analysis only — does not authorise Module 05 lock";
export const RELIANCE_SCOPE_X = "Return route only — no authorised strategy handoff";

/** Record the outcome. The upstream ceiling applies mechanically: Outcome A always lands
 * provisional, whatever grade the market evidence carried. */
export function confirmOutcome(commitments: Commitments, body: OutcomeBody) {
  const check = outcomeCheck(commitments);
  if (body.outcome === "a" && !check.canA)
    throw new Error(`Outcome A isn't recordable: ${check.problems.join(" — ")}`);
  if (body.outcome === "x" && !body.returnDoc)
    throw new Error("Outcome X needs the return document — which module, what to refine, what this run produced");
  commitments.outcome = {
    outcome: body.outcome,
    statement: body.statement,
    returnDoc: body.returnDoc,
  };
  commitments.state = {
    ...commitments.state,
    runtime: body.outcome === "a" ? "provisional" : "outcome_x",
    evidenceState:
      commitments.upstream.m02Outcome === "validated_a"
        ? "builder-verified (upstream validated)"
        : "builder-verified (upstream provisional)",
    relianceScope: body.outcome === "a" ? RELIANCE_SCOPE_A : RELIANCE_SCOPE_X,
  };
  return check;
}
