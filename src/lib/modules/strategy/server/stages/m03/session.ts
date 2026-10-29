import { z } from "zod";
import { FolderName, SessionId, RouteKind } from "../../../shared/types";

// ---------- Session stage machine ----------
//
// Mirrors 03-Prompt.md: upstream gate → review inputs → belief challenge →
// belief shift journey → conviction grid → proof → friction → credibility →
// honest confrontations → cost → advocate challenges → judgement → sealed.
// A failed upstream check emits only a dependency notice — no session is
// created — so "blocked_upstream" is a transient state on the check response,
// not a stored stage.
export const M03_STAGES = [
  "upstream",
  "inputs",
  "challenge",
  "journey",
  "grid",
  "proof",
  "friction",
  "credibility",
  "confrontations",
  "cost",
  "advocate",
  "judgement",
  "sealed",
] as const;
export type M03Stage = (typeof M03_STAGES)[number];

/** The eight steps a model may draft. Credibility and confrontations are human-only. */
export const M03_DRAFT_STEPS = [
  "challenge",
  "journey",
  "grid",
  "proof",
  "friction",
  "cost",
  "advocate",
  "judgement",
] as const;
export type M03DraftStep = (typeof M03_DRAFT_STEPS)[number];

/** Every confirmation step that advances a stage, in order. */
export const M03_CONFIRM_STEPS = [
  "inputs",
  "challenge",
  "journey",
  "grid",
  "proof",
  "friction",
  "credibility",
  "confrontations",
  "cost",
  "advocate",
  "judgement",
] as const;
export type M03ConfirmStep = (typeof M03_CONFIRM_STEPS)[number];

export const Confirmation = z.object({
  by: z.string().min(1),
  at: z.string(),
  note: z.string().optional(),
});
export type Confirmation = z.infer<typeof Confirmation>;

export const M03DependencyNotice = z.object({
  ownerModule: z.enum(["01", "02"]),
  ownerName: z.string(),
  reason: z.string(),
  missing: z.array(z.string()),
  prohibition: z.string(),
  correction: z.string(),
});
export type M03DependencyNotice = z.infer<typeof M03DependencyNotice>;

// ---------- upstream — verbatim carriers ----------

export const M01LockState = z.enum(["locked", "stale", "missing"]);

export const M01Inputs = z.object({
  sessionId: SessionId,
  sealedAt: z.string(),
  coreBelief: z.string(),
  brokenThing: z.string(),
  hiddenTruth: z.string(),
  marketDeployableHiddenTruth: z.string(),
  nonNegotiable: z.string(),
  hardWonTeaching: z.string(),
  legacy: z.string(),
  claimsBoundaryInputs: z.object({
    canClaim: z.array(z.string()),
    mustQualify: z.array(z.string()),
    cannotClaim: z.array(z.string()),
  }),
});
export type M01Inputs = z.infer<typeof M01Inputs>;

/** The sealed M02 findings M03 builds on — copied verbatim at session creation. */
export const M02Findings = z.object({
  descriptiveDefault: z.string().default(""),
  cohort: z.string().default(""),
  concentration: z.string().default(""),
  decodes: z
    .array(
      z.object({
        competitor: z.string(),
        beliefs: z.array(
          z.object({ belief: z.string(), confidence: z.string(), vulnerability: z.string() }),
        ),
      }),
    )
    .default(() => []),
  vulnerabilityEvidence: z.string().default(""),
  defendersCase: z.string().default(""),
  rebuttal: z.string().default(""),
  painProfile: z
    .object({
      trigger: z.string(),
      hack: z.string(),
      pain: z.string(),
      limitingBelief: z.string(),
      traceToDefault: z.string(),
    })
    .default(() => ({ trigger: "", hack: "", pain: "", limitingBelief: "", traceToDefault: "" })),
  priceRange: z.string().default(""),
  willingnessEvidence: z.string().default(""),
  implication: z.string().default(""),
  traceSentence: z.string().default(""),
  synthesisStatement: z.string().default(""),
});
export type M02Findings = z.infer<typeof M02Findings>;

/** A Gate-5 risk that reached M03. `routing` is the M02 decision; `landedIn` is where this run
 * actually placed it — the coverage check enforces that m03-routed risks land, never vanish. */
export const AcknowledgedRisk = z.object({
  pattern: z.string(),
  label: z.string(),
  state: z.string(),
  severity: z.string().nullable().default(null),
  routing: z.enum(["m03", "m04", "m11", "external"]).nullable().default(null),
  acknowledgmentLine: z.string().default(""),
  declined: z.boolean().default(false),
  dispute: z.string().default(""),
  landedIn: z.enum(["friction", "riskFlags", "carried-forward"]).nullable().default(null),
});
export type AcknowledgedRisk = z.infer<typeof AcknowledgedRisk>;

export const SecondVoice = z.object({
  present: z.boolean().nullable().default(null),
  name: z.string().default(""),
  role: z.string().default(""),
  competingDiagnosis: z.string().default(""),
  converge: z.string().default(""),
  diverge: z.string().default(""),
  signal: z.string().default(""),
});
export type SecondVoice = z.infer<typeof SecondVoice>;

export const CarriedForward = z.object({
  // Contrarian flags halt at the gate — this array is always empty on a live session; it stays
  // in the record so the gate verdict is visible.
  contrarianFlags: z.array(z.string()).default(() => []),
  terrainDiagnosis: z.string().default(""),
  terrainTrajectory: z.string().default(""),
  terrainTam: z.string().default(""),
  terrainTailwind: z.string().default(""),
  secondVoice: SecondVoice.default(() => SecondVoice.parse({})),
  foundersProblem: z.string().default(""),
  acknowledgedRisks: z.array(AcknowledgedRisk).default(() => []),
});
export type CarriedForward = z.infer<typeof CarriedForward>;

export const M03Upstream = z.object({
  m02SessionId: SessionId,
  m02SealedAt: z.string(),
  m02Outcome: z.enum(["provisional_a", "validated_a"]),
  m02RelianceScope: z.string().default(""),
  m02Seal: z.object({
    receiptId: z.uuid(),
    sealHash: z.string().regex(/^[a-f0-9]{64}$/),
    reconHash: z.string().regex(/^[a-f0-9]{64}$/),
    artifactsHash: z.string().regex(/^[a-f0-9]{64}$/),
    collectionHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  m01: z.object({
    sessionId: SessionId,
    sealedAt: z.string(),
    outputsHash: z.string(),
    lockState: M01LockState,
  }),
  m01Inputs: M01Inputs,
  m02Findings: M02Findings.default(() => M02Findings.parse({})),
  carriedForward: CarriedForward.default(() => CarriedForward.parse({})),
});
export type M03Upstream = z.infer<typeof M03Upstream>;

// ---------- inputs — Step 1 review decisions ----------

export const COMMITMENT_SCOPES = [
  "business",
  "offer",
  "business_unit",
  "portfolio",
  "parent_brand",
  "sub_brand",
  "initiative",
] as const;
export const CommitmentScope = z.enum(COMMITMENT_SCOPES);
export type CommitmentScope = z.infer<typeof CommitmentScope>;

export const PriorPositioning = z.object({
  supplied: z.boolean().default(false),
  source: z.string().default(""),
  currentness: z.string().default(""),
  text: z.string().default(""),
  note: z.string().default(""),
});
export type PriorPositioning = z.infer<typeof PriorPositioning>;

export const Inputs = z.object({
  // Whose problem-shape the positioning solves for — the second voice's
  // competing diagnosis can be the truer frame.
  solvesFor: z.enum(["founder", "second_voice", "shared"]).nullable().default(null),
  solvesForNote: z.string().default(""),
  commitmentScope: CommitmentScope.nullable().default(null),
  scopeNote: z.string().default(""),
  // Existing positioning is an optional input, never a required one.
  priorPositioning: PriorPositioning.default(() => PriorPositioning.parse({})),
  // How the terrain diagnosis shapes this run — recorded, not assumed away.
  terrainRead: z.string().default(""),
});
export type Inputs = z.infer<typeof Inputs>;

// ---------- challenge — Step 2 ----------

export const BeliefChallenge = z.object({
  industryDefault: z.string().default(""), // verbatim from the sealed recon
  coreBelief: z.string().default(""), // verbatim from M01
  contradictions: z.array(z.string()).default(() => []),
  genuineVsContrarian: z.string().default(""),
});
export type BeliefChallenge = z.infer<typeof BeliefChallenge>;

// ---------- journey — Step 3 ----------

export const EXPERIENCE_SHAPES = [
  "product-physical",
  "community-relational",
  "b2b-operational",
  "knowledge",
] as const;
export const Journey = z.object({
  from: z.string().default(""),
  to: z.string().default(""),
  experientialChange: z.string().default(""), // customer-voice paragraph — the Tylenol test
  experienceShape: z.enum(EXPERIENCE_SHAPES).nullable().default(null),
  discoveryMechanism: z.string().default(""),
});
export type Journey = z.infer<typeof Journey>;

// ---------- grid — Step 4 ----------

export const GRID_ACTIONS = ["question", "reject", "commit", "introduce"] as const;
export const GridAction = z.enum(GRID_ACTIONS);
export type GridAction = z.infer<typeof GridAction>;

export const GridRow = z.object({
  action: GridAction,
  move: z.string().default(""),
  beliefRationale: z.string().default(""),
  proofCommitment: z.string().default(""),
  // One rule another team can apply without re-deciding it.
  operationalRule: z.string().default(""),
  // Q/R rows: the visible refusal. C/I rows: the deployable proof artefact.
  specialisationSignal: z.string().default(""),
  proofArtefactType: z.string().default(""),
  // CMQG_01 — the explicit trace to the Core Belief.
  traceToBelief: z.string().default(""),
});
export type GridRow = z.infer<typeof GridRow>;

// ---------- proof — Step 5 ----------

export const PROOF_ECONOMIES = ["discrete-at-cost", "compounding-public", "both"] as const;
export const ProofEconomy = z.enum(PROOF_ECONOMIES);
export const EVIDENCE_STATUSES = ["supported", "prospective", "thin"] as const;
export const EvidenceStatus = z.enum(EVIDENCE_STATUSES);

export const ProofRow = z.object({
  action: GridAction,
  product: z.string().default(""),
  policy: z.string().default(""),
  story: z.string().default(""),
  framework: z.string().default(""),
  proofEconomy: ProofEconomy.nullable().default(null),
  evidenceStatus: EvidenceStatus.nullable().default(null),
  // CMQG_02 — proof stays inside the M01 draft claims boundary.
  claimBoundaryNote: z.string().default(""),
  // When thin/prospective: the capture-and-review plan, per FW_03 handling.
  capturePlan: z.string().default(""),
});
export type ProofRow = z.infer<typeof ProofRow>;

// ---------- friction — Step 6 ----------

export const FRICTION_SOURCES = [
  "beliefContradiction",
  "operationalChange",
  "culturalShift",
  "customerExplanation",
  "economicCost",
  "accumulatedProof",
  "specialistAuthority",
] as const;
export type FrictionSource = (typeof FRICTION_SOURCES)[number];

export const FrictionLevel = z.enum(["high", "medium", "low"]);
export const FrictionCell = z.object({
  level: FrictionLevel.nullable().default(null),
  note: z.string().default(""),
});
export type FrictionCell = z.infer<typeof FrictionCell>;

export const FrictionRow = z.object({
  action: GridAction,
  sources: z.record(z.string(), FrictionCell).default(() => ({})),
});
export type FrictionRow = z.infer<typeof FrictionRow>;

export const Friction = z.object({
  rows: z.array(FrictionRow).default(() => []),
  // The real copy threat is the LOWEST-friction competitor — named, required.
  lowestFrictionCompetitor: z.string().default(""),
  lowestFrictionBasis: z.string().default(""),
  threatAssessment: z.string().default(""),
});
export type Friction = z.infer<typeof Friction>;

// ---------- credibility — Step 6b ----------

export const CREDIBILITY_STATES = ["credible", "credibility-gap", "not-yet-observable"] as const;
export const Credibility = z.object({
  referenceEvidence: z.string().default(""),
  state: z.enum(CREDIBILITY_STATES).nullable().default(null),
  cause: z.string().default(""),
  reviewCondition: z.string().default(""),
});
export type Credibility = z.infer<typeof Credibility>;

// ---------- confrontations — Step 7 ----------

export const PastAuditRow = z.object({
  item: z.string().min(1),
  beliefSays: z.enum(["yes", "no"]).nullable().default(null),
  // undecided contradictions block Outcome A — refine → may trigger Outcome X;
  // pivot → documented, becomes Story Proof.
  decision: z.enum(["refine", "pivot", "undecided"]).nullable().default(null),
  note: z.string().default(""),
});
export type PastAuditRow = z.infer<typeof PastAuditRow>;

export const Confrontations = z.object({
  pastAudit: z.array(PastAuditRow).default(() => []),
  futureConfrontations: z.array(z.string()).default(() => []),
});
export type Confrontations = z.infer<typeof Confrontations>;

// ---------- cost — Step 8 ----------

export const CostOfCommitment = z.object({ costs: z.array(z.string()).default(() => []) });
export type CostOfCommitment = z.infer<typeof CostOfCommitment>;

// ---------- advocate — Step 8b ----------

export const ADVOCATE_CHALLENGES = [
  { id: "case-for-default", prompt: "What if the Industry Default is right?" },
  {
    id: "funded-copycat",
    prompt: "What happens when a well-funded competitor copies this positioning?",
  },
  {
    id: "positioning-vs-preference",
    prompt: "Is this positioning or just preference?",
  },
] as const;
export type AdvocateChallengeId = (typeof ADVOCATE_CHALLENGES)[number]["id"];

export const AdvocateRow = z.object({
  id: z.enum(["case-for-default", "funded-copycat", "positioning-vs-preference"]),
  case: z.string().default(""), // the strongest opposing case — model-drafted, human-edited
  verdict: z.enum(["survives", "fails"]).nullable().default(null),
  note: z.string().default(""),
});
export type AdvocateRow = z.infer<typeof AdvocateRow>;

export const Advocate = z.object({ challenges: z.array(AdvocateRow).default(() => []) });
export type Advocate = z.infer<typeof Advocate>;

// ---------- judgement — FW_32 block + outcome ----------

export const PROFESSIONAL_CALLS = [
  "proceed",
  "proceed_conditionally",
  "gather_evidence",
  "return",
  "do_not_proceed",
] as const;
export const ProfessionalCall = z.enum(PROFESSIONAL_CALLS);

export const CommercialConsequences = z.object({
  ifHolds: z.string().default(""),
  ifNot: z.string().default(""),
  ifNoDecision: z.string().default(""),
});
export type CommercialConsequences = z.infer<typeof CommercialConsequences>;

export const Judgement = z.object({
  optionsConsidered: z.array(z.string()).default(() => []),
  recommendation: z.string().default(""),
  confidence: z.enum(["high", "moderate", "low"]).nullable().default(null),
  confidenceBasis: z.string().default(""),
  commercialConsequences: CommercialConsequences.default(() => CommercialConsequences.parse({})),
  reversalConditions: z.string().default(""),
  integrityCheck: z.string().default(""),
  professionalCall: ProfessionalCall.nullable().default(null),
  nextWork: z.string().default(""),
});
export type Judgement = z.infer<typeof Judgement>;

export const OutcomeReturnDoc = z.object({
  module: z.enum(["01", "02"]),
  refineWhat: z.string(),
  evidenceProduced: z.string(),
});
export type OutcomeReturnDoc = z.infer<typeof OutcomeReturnDoc>;

export const Outcome = z.object({
  outcome: z.enum(["pending", "a", "x"]).default("pending"),
  statement: z.string().default(""),
  // Outcome X is a valid outcome with a structured return document.
  returnDoc: OutcomeReturnDoc.nullable().default(null),
});
export type Outcome = z.infer<typeof Outcome>;

export const RuntimeState = z.object({
  runtime: z
    .enum([
      "orientation_only",
      "constructing",
      "candidate",
      "clarification_required",
      "provisional",
      "validation_pending",
      "validated",
      "outcome_x",
      "blocked_upstream",
      "stale",
      "superseded",
    ])
    .default("constructing"),
  versionState: z.string().default("draft"),
  evidenceState: z.string().default("internal"),
  approvalState: z.string().default("unapproved"),
  gateState: z.string().default("open"),
  relianceScope: z.string().default("none"),
});
export type RuntimeState = z.infer<typeof RuntimeState>;

// ---------- the working record ----------

export const Commitments = z.object({
  module: z.literal("03"),
  sessionId: SessionId,
  producedAt: z.string(),
  updatedAt: z.string(),

  upstream: M03Upstream,
  inputs: Inputs.default(() => Inputs.parse({})),
  beliefChallenge: BeliefChallenge.default(() => BeliefChallenge.parse({})),
  journey: Journey.default(() => Journey.parse({})),
  grid: z.array(GridRow).default(() => []),
  proof: z.array(ProofRow).default(() => []),
  friction: Friction.default(() => Friction.parse({})),
  credibility: Credibility.default(() => Credibility.parse({})),
  confrontations: Confrontations.default(() => Confrontations.parse({})),
  costOfCommitment: CostOfCommitment.default(() => CostOfCommitment.parse({})),
  advocate: Advocate.default(() => Advocate.parse({})),
  judgement: Judgement.default(() => Judgement.parse({})),
  outcome: Outcome.default(() => Outcome.parse({})),
  riskFlags: z.array(z.string()).default(() => []),
  state: RuntimeState.default(() => RuntimeState.parse({})),
});
export type Commitments = z.infer<typeof Commitments>;

// ---------- session ----------

export const M03Session = z.object({
  module: z.literal("03"),
  sessionId: SessionId,
  folder: FolderName,
  createdAt: z.string(),
  updatedAt: z.string(),
  stage: z.enum(M03_STAGES),
  // The sealed M02 run this session is built on — verbatim authority.
  m02: z.object({
    sessionId: SessionId,
    sealedAt: z.string(),
    outcome: z.string(),
    relianceScope: z.string(),
    sealReceiptId: z.uuid().optional(),
    sealHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  }),
  m01: z.object({
    sessionId: SessionId,
    sealedAt: z.string(),
    outputsHash: z.string(),
    lockState: M01LockState,
  }),
  route: RouteKind,
  routeStatus: z.enum(["proposed", "confirmed"]),
  routeReason: z.string().default(""),
  revisionRequest: z
    .object({
      revisionId: z.uuid(),
      finding: z.string().min(1),
      sourceRefs: z.array(z.string().min(1)),
      parentM04SessionId: SessionId.nullable(),
    })
    .nullable()
    .default(null),
  confirmations: z.record(z.string(), Confirmation).default(() => ({})),
});
export type M03Session = z.infer<typeof M03Session>;

/** A model candidate. Never an approval, verdict or seal. */
export const M03Draft = z.object({
  candidate: z.unknown(),
  model: z.string(),
  usage: z.unknown().nullable().default(null),
  at: z.string(),
  methodRelease: z.string(),
  sourceVersionId: z.string(),
  sourceHash: z.string(),
});
export type M03Draft = z.infer<typeof M03Draft>;

export const M03Record = z.object({
  revision: z.number().int().positive(),
  session: M03Session,
  commitments: Commitments,
  drafts: z.record(z.string(), M03Draft).default(() => ({})),
  seal: z.unknown().nullable().default(null),
  sourceVersionId: z.string(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  parentSessionId: SessionId.nullable().default(null),
  successorReason: z.string().default(""),
  history: z
    .array(
      z.object({
        action: z.string(),
        actorId: z.string(),
        at: z.string(),
        methodRelease: z.string(),
      }),
    )
    .default(() => []),
});
export type M03Record = z.infer<typeof M03Record>;

/** Immutable receipt carried in the sealed version payload. */
export const M03SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("03"),
  status: z.literal("sealed"),
  receiptId: z.uuid(),
  sealHash: z.string().regex(/^[a-f0-9]{64}$/),
  sessionId: SessionId,
  folder: FolderName,
  sealedAt: z.string(),
  sealedBy: z.string().min(1),
  outcome: z.enum(["a", "x"]),
  upstream: z.object({
    m01: z.object({
      sessionId: SessionId,
      sealedAt: z.string(),
      outputsHash: z.string(),
      lockState: z.string(),
    }),
    m02: z.object({
      sessionId: SessionId,
      sealedAt: z.string(),
      outcome: z.string(),
      relianceScope: z.string(),
      sealReceiptId: z.uuid(),
      sealHash: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  }),
  passState: z.literal("provisional").nullable(),
  commitmentsHash: z.string().regex(/^[a-f0-9]{64}$/),
  relianceScope: z.string(),
  returnDoc: OutcomeReturnDoc.nullable(),
  riskObligations: z.array(
    z.object({
      pattern: z.string(),
      label: z.string(),
      routing: z.string().nullable(),
      acknowledgmentLine: z.string(),
      landedIn: z.string().nullable(),
    }),
  ),
  hashes: z.object({
    session: z.string().regex(/^[a-f0-9]{64}$/),
    commitments: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  snapshots: z.object({ session: z.string(), commitments: z.string() }),
});
export type M03SealReceipt = z.infer<typeof M03SealReceipt>;
