import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });

/** FW_24 does not add a numbered module: Commercial Direction is its own authority record. */
export const STAGES = [
  "eligibility",
  "inheritance",
  "horizon",
  "recommendation",
  "route",
  "moves",
  "sequence",
  "portfolio",
  "exclusions",
  "evidence",
  "decision",
  "sealed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

export const STATUS = ["draft", "recommended", "candidate", "sealed", "stale", "revision-required", "declined"] as const;
export const Status = z.enum(STATUS);

/** FW_24 separate state axes — never collapsed. */
export const DECISION_STATES = ["draft", "recommended", "client-approved", "client-overridden", "revision-required", "superseded"] as const;
export const EVIDENCE_STATES = ["absent", "hypothesis", "observed", "tested", "contradicted"] as const;
export const EXECUTION_PERMISSIONS = [
  "analysis-only",
  "evidence-gathering",
  "pilot-only",
  "controlled-90-day",
  "wider-execution",
  "blocked",
] as const;
export const PORTFOLIO_CLASSES = [
  "active-first-phase",
  "next",
  "later",
  "conditional",
  "excluded-not-now",
  "not-required",
] as const;
export type PortfolioClass = (typeof PORTFOLIO_CLASSES)[number];
export const DECISION_RESPONSES = ["accept", "revise", "override", "return-upstream"] as const;

// ---------- inheritance ----------

export const Inheritance = z.object({
  /** What the direction must inherit from M05–M10, per FW_24 provenance requirements. */
  inheritedDecisions: z.array(text).min(1),
  selectableOptions: z.array(text).min(1),
  lockedFields: z.array(text).min(1),
  claimsBoundary: z.object({
    canClaim: z.array(text).min(1),
    mustQualify: z.array(z.string()).default(() => []),
    cannotClaim: z.array(z.string()).default(() => []),
  }),
  invalidationTriggers: z.array(text).min(1),
  upstreamVersions: z
    .array(z.object({ module: text, sessionId: text, versionId: text, hash: text }))
    .min(1),
});
export type Inheritance = z.infer<typeof Inheritance>;

// ---------- horizon ----------

export const Horizon = z.object({
  directionalHorizon: text,
  horizonRationale: text,
  longerTermAmbition: z.string().default(""),
  evidenceCutoff: text,
  cycleHorizon: text,
  proportionality: text,
});
export type Horizon = z.infer<typeof Horizon>;

// ---------- recommendation ----------

export const Recommendation = z.object({
  outcome: text,
  priorityAudience: text,
  buyingSituation: text,
  requiredMovement: text,
});
export type Recommendation = z.infer<typeof Recommendation>;

// ---------- route ----------

export const Route = z.object({
  strategicRoute: text,
  credibleAlternative: text,
  tradeoff: text,
});
export type Route = z.infer<typeof Route>;

// ---------- moves ----------

export const Moves = z.object({
  moves: z
    .array(
      z.object({
        id: text,
        name: text,
        job: text,
        consequenceIds: z.array(text).min(1),
        evidenceState: z.enum(EVIDENCE_STATES),
      }),
    )
    .min(3)
    .max(5),
});
export type Moves = z.infer<typeof Moves>;

// ---------- sequence ----------

export const Sequence = z.object({
  phases: z
    .array(
      z.object({
        phase: text,
        horizon: text,
        work: z.array(text).min(1),
        progressionGate: text,
      }),
    )
    .min(1),
  currentCycleObjective: text,
  firstPhaseObjective: text,
  progressionCondition: text,
  firstEvidenceEvent: text,
  reviewEvent: text,
});
export type Sequence = z.infer<typeof Sequence>;

// ---------- portfolio ----------

export const Portfolio = z.object({
  consequences: z
    .array(
      z.object({
        id: text,
        source: text,
        classification: z.enum(PORTFOLIO_CLASSES),
        reason: text,
        commercialJob: text,
        dependencies: z.array(z.string()).default(() => []),
        evidenceState: z.enum(EVIDENCE_STATES),
        capacityNote: z.string().default(""),
        owner: text,
      }),
    )
    .min(1),
});
export type Portfolio = z.infer<typeof Portfolio>;

// ---------- exclusions ----------

export const Exclusions = z.object({
  exclusions: z.array(text).min(1),
  deferredAlternatives: z.array(text).min(1),
  invalidationTriggers: z.array(text).min(1),
});
export type Exclusions = z.infer<typeof Exclusions>;

// ---------- evidence ----------

export const Evidence = z.object({
  dimensions: z
    .array(
      z.object({
        dimension: text,
        state: z.enum(EVIDENCE_STATES),
        note: text,
      }),
    )
    .min(1),
  coreAssumption: text,
  preCycleTest: z.object({
    required: z.boolean(),
    id: z.string().default(""),
    effect: z.string().default(""),
    resolved: z.string().default(""),
  }),
});
export type Evidence = z.infer<typeof Evidence>;

// ---------- decision ----------

export const Decision = z.object({
  response: z.enum(DECISION_RESPONSES),
  decisionState: z.enum(DECISION_STATES),
  executionPermission: z.enum(EXECUTION_PERMISSIONS),
  owner: Actor,
  exactDecision: text,
  authorisedWork: text,
  nextReviewTrigger: text,
});
export type Decision = z.infer<typeof Decision>;

export const STAGE_SCHEMAS = {
  inheritance: Inheritance,
  horizon: Horizon,
  recommendation: Recommendation,
  route: Route,
  moves: Moves,
  sequence: Sequence,
  portfolio: Portfolio,
  exclusions: Exclusions,
  evidence: Evidence,
  decision: Decision,
} as const;

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-horizon",
  "gate-2-recommendation",
  "gate-3-route",
  "gate-4-moves",
  "gate-5-sequence",
  "gate-6-portfolio",
  "gate-7-exclusions",
  "gate-8-evidence",
  "gate-9-decision",
] as const;

export const CheckFinding = z.object({ code: text, message: text, ref: z.string().default("") });
export type CheckFinding = z.infer<typeof CheckFinding>;

export const Checks = z.object({
  gates: z
    .array(
      z.object({
        id: z.enum(GATE_IDS),
        result: z.enum(["pass", "fail", "unassessed"]),
        basis: z.string().default(""),
        findings: z.array(CheckFinding).default(() => []),
      }),
    )
    .length(GATE_IDS.length),
  rendered: z.string().default(""),
  renderHash: z.string().default(""),
  candidateHash: z.string().default(""),
  frozenAt: z.string().default(""),
  ranAt: z.string().default(""),
});
export type Checks = z.infer<typeof Checks>;

export const Receipt = z.object({
  actor: Actor,
  at: text,
  decision: text,
  target: text,
  revision: z.number().int(),
  hash: text,
  sourceHash: text,
});

export const Session = z.object({
  module: z.literal("cd"),
  sessionId: SessionId,
  folder: FolderName,
  revision: z.number().int().nonnegative(),
  createdAt: text,
  updatedAt: text,
  stage: Stage,
  status: Status,
  sourceHash: text,
  sources: z.unknown(),
  capability: text,
  confirmations: z.record(z.string(), Receipt).default(() => ({})),
  data: z.record(z.string(), z.unknown()).default(() => ({})),
  drafts: z.record(z.string(), z.unknown()).default(() => ({})),
  history: z.array(z.unknown()).default(() => []),
  candidateHash: z.string().nullable().default(null),
  seal: z.object({ versionId: text, hash: text, at: text, path: text }).nullable().default(null),
  parentSessionId: SessionId.optional(),
});
export type CDSession = z.infer<typeof Session>;

export const CDSealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("cd"),
  status: z.literal("sealed"),
  receiptId: z.uuid(),
  sealHash: hex64,
  sessionId: SessionId,
  folder: FolderName,
  sealedAt: z.string(),
  sealedBy: z.string().min(1),
  sourceHash: z.string(),
  candidateHash: hex64,
  renderHash: hex64,
  gates: z.array(z.object({ id: z.string(), result: z.string() })),
  decisionState: z.enum(DECISION_STATES),
  executionPermission: z.enum(EXECUTION_PERMISSIONS),
  hashes: z.object({ record: hex64, render: hex64 }),
});
export type CDSealReceipt = z.infer<typeof CDSealReceipt>;

/**
 * The handoff M11's consumer accepts. Field names and shapes mirror
 * `HandoffCommercialDirection` in the legacy consumer exactly, because that is the interface the
 * downstream gate validates against.
 */
export const Ref = z.object({ runId: text, versionId: text, hash: text });

export const HandoffCommercialDirection = z.object({
  versionId: text,
  hash: text,
  approvalState: text,
  envelope: z.record(z.string(), z.unknown()),
  downstream: z.object({
    m11Permission: z.string(),
    reasons: z.array(z.string()),
    strategyRef: Ref,
    direction: z.object({
      directionId: text,
      version: text,
      decisionState: text,
      executionPermission: text,
      directionalHorizon: text,
      horizonRationale: text,
      twelveMonthOutcome: text,
      priorityBuyingSituation: text,
      strategicRoute: text,
      strategicMoveId: text,
      strategicMoveJob: z.string().default(""),
      firstPhaseObjective: text,
      activeConsequenceIds: z.array(z.string()).min(1),
      exclusions: z.array(z.string()).min(1),
      progressionCondition: text,
      firstEvidenceEvent: text,
      coreAssumption: z.string().default(""),
      reviewEvent: z.string().default(""),
      preCycleTest: z.object({
        required: z.boolean(),
        id: z.string().default(""),
        effect: z.string().default(""),
        resolved: z.string().default(""),
      }),
    }),
    claimsBoundary: z.object({
      canClaim: z.array(z.string()),
      mustQualify: z.array(z.string()),
      cannotClaim: z.array(z.string()),
    }),
    invalidationTriggers: z.array(z.string()),
  }),
});
export type HandoffCommercialDirection = z.infer<typeof HandoffCommercialDirection>;
