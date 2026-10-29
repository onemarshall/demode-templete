import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });

export const STAGES = [
  "eligibility",
  "inheritance",
  "plans",
  "decision",
  "actions",
  "accountability",
  "checks",
  "review",
  "client-decision",
  "sealed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

export const STATUS = ["draft", "blocked", "candidate", "approved", "sealed", "stale", "revision-requested", "return-upstream", "declined"] as const;
export const Status = z.enum(STATUS);
export const RouteKind = z.enum(["full", "constrained", "light"]);

// ---------- inheritance ----------

/**
 * FW_24: M11 must preserve the direction's outcome, audience, route, strategic moves, first-phase
 * job, exclusions and progression condition. These are recorded here and checked against the sealed
 * direction, so M11 cannot silently reinterpret what it inherited.
 */
export const Inheritance = z.object({
  outcome: text,
  priorityAudience: text,
  strategicRoute: text,
  moveIds: z.array(text).min(1),
  firstPhaseObjective: text,
  progressionCondition: text,
  exclusions: z.array(text).min(1),
  activeConsequenceIds: z.array(text).min(1),
  claimsBoundary: z.object({
    canClaim: z.array(text).min(1),
    mustQualify: z.array(z.string()).default(() => []),
    cannotClaim: z.array(z.string()).default(() => []),
  }),
  invalidationTriggers: z.array(text).min(1),
  directionVersion: z.object({ versionId: text, hash: text }),
});
export type Inheritance = z.infer<typeof Inheritance>;

// ---------- plans ----------

/** What M11 owns: quantities, operational targets, capacity assumptions, ownership and thresholds. */
export const Plans = z.object({
  plans: z
    .array(
      z.object({
        consequenceId: text,
        quantity: text,
        operationalTarget: text,
        capacityAssumption: text,
        owner: text,
        threshold: text,
        thresholdRationale: text,
      }),
    )
    .min(1),
});
export type Plans = z.infer<typeof Plans>;

// ---------- decision ----------

export const Decision = z.object({
  commitment: text,
  committedBy: Actor,
  scope: text,
  thresholds: z.array(text).min(1),
  reviewEvent: text,
  evidencePurpose: text,
  notCommitted: z.array(text).min(1),
});
export type Decision = z.infer<typeof Decision>;

// ---------- actions ----------

export const ACTIONS_STATES = ["planned", "in-progress", "done", "blocked"] as const;

export const Actions = z.object({
  actions: z
    .array(
      z.object({
        id: text,
        consequenceId: text,
        action: text,
        owner: text,
        window: text,
        dependency: z.string().default(""),
        proofAction: text,
        state: z.enum(ACTIONS_STATES),
      }),
    )
    .min(1),
});
export type Actions = z.infer<typeof Actions>;

// ---------- accountability ----------

export const Accountability = z.object({
  owners: z.array(z.object({ area: text, owner: text })).min(1),
  cadence: text,
  escalation: text,
  preservationCheck: z.enum(["preserved", "changed-with-authority", "unresolved"]),
  preservationNote: z.string().default(""),
});
export type Accountability = z.infer<typeof Accountability>;

// ---------- checks, review, decision ----------

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-plans",
  "gate-2-decision",
  "gate-3-actions",
  "gate-4-accountability",
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

export const LENS_IDS = [
  "direction-fidelity",
  "quantity-plausibility",
  "capacity-realism",
  "action-specificity",
  "threshold-honesty",
] as const;

export const StressReview = z.object({
  reviewer: z.object({ identity: text, model: z.string().default(""), independence: z.enum(["valid", "invalid"]), independenceBasis: text }),
  candidateHash: text,
  lenses: z.array(z.object({ id: z.enum(LENS_IDS), result: z.enum(["pass", "concern", "fail"]), note: z.string().default("") })).length(LENS_IDS.length),
  findings: z
    .array(
      z.object({
        id: text,
        lens: z.enum(LENS_IDS),
        severity: z.enum(["blocker", "material", "minor"]),
        objection: text,
        disposition: z.enum(["pending", "fix-in-m11", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({ offered: z.boolean(), alternative: z.string().default(""), whyNotStronger: z.string().default("") }),
  verdict: z.enum(["pass", "revise-m11", "return-upstream", "invalid", "pending"]),
  verdictBasis: z.string().default(""),
  ranAt: z.string().default(""),
});
export type StressReview = z.infer<typeof StressReview>;

export const ClientDecision = z.object({
  response: z.enum(["accept", "revise", "decline"]),
  approver: Actor,
  exactResponse: text,
  revisionNote: z.string().default(""),
  returnStage: Stage.nullable(),
  declineReason: z.string().default(""),
});
export type ClientDecision = z.infer<typeof ClientDecision>;

export const STAGE_SCHEMAS = {
  inheritance: Inheritance,
  plans: Plans,
  decision: Decision,
  actions: Actions,
  accountability: Accountability,
  checks: Checks,
  review: StressReview,
  "client-decision": ClientDecision,
} as const;

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
  module: z.literal("m11"),
  sessionId: SessionId,
  folder: FolderName,
  revision: z.number().int().nonnegative(),
  createdAt: text,
  updatedAt: text,
  stage: Stage,
  status: Status,
  route: RouteKind,
  equivalentEvidence: z.string().default(""),
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
export type M11Session = z.infer<typeof Session>;

export const M11SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("m11"),
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
  reviewVerdict: z.string(),
  directionVersionId: text,
  hashes: z.object({ record: hex64, render: hex64 }),
});
export type M11SealReceipt = z.infer<typeof M11SealReceipt>;
