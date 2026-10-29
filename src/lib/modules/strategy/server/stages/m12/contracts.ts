import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });

export const STAGES = [
  "eligibility",
  "inheritance",
  "assets",
  "rhythm",
  "schedule",
  "response",
  "scorecard",
  "rules",
  "checklist",
  "transition",
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

/**
 * FW_24: M12 preserves M11's exact quantities, ownership commitments, route, proof actions and
 * thresholds. It owns dates, dependencies, scheduling and tracking — nothing else.
 */
export const Inheritance = z.object({
  quantities: z.array(z.object({ consequenceId: text, quantity: text, threshold: text })).min(1),
  owners: z.array(z.object({ area: text, owner: text })).min(1),
  strategicRoute: text,
  proofActions: z.array(text).min(1),
  reviewEvent: text,
  cycleVersion: z.object({ versionId: text, hash: text }),
  directionVersionId: text,
});
export type Inheritance = z.infer<typeof Inheritance>;

export const ASSET_STATES = ["available", "needed", "missing", "external"] as const;

export const Assets = z.object({
  assets: z
    .array(
      z.object({
        id: text,
        name: text,
        kind: text,
        state: z.enum(ASSET_STATES),
        owner: text,
        dependency: z.string().default(""),
      }),
    )
    .min(1),
});
export type Assets = z.infer<typeof Assets>;

export const Rhythm = z.object({
  weeklyCadence: text,
  checkpoints: z.array(z.object({ name: text, when: text, purpose: text })).min(1),
  reviewForum: text,
  escalation: text,
});
export type Rhythm = z.infer<typeof Rhythm>;

export const Schedule = z.object({
  items: z
    .array(
      z.object({
        id: text,
        consequenceId: text,
        work: text,
        owner: text,
        start: text,
        due: text,
        dependency: z.string().default(""),
        proofAction: text,
      }),
    )
    .min(1),
});
export type Schedule = z.infer<typeof Schedule>;

export const RESPONSE_STATES = ["retry", "escalate", "descope", "stop"] as const;

export const Response = z.object({
  protocols: z
    .array(
      z.object({
        id: text,
        trigger: text,
        response: z.enum(RESPONSE_STATES),
        owner: text,
        note: z.string().default(""),
      }),
    )
    .min(1),
});
export type Response = z.infer<typeof Response>;

export const Scorecard = z.object({
  measures: z
    .array(
      z.object({
        consequenceId: text,
        measure: text,
        target: text,
        current: text,
        source: text,
        reviewCadence: text,
      }),
    )
    .min(1),
});
export type Scorecard = z.infer<typeof Scorecard>;

export const Rules = z.object({
  operatingRules: z.array(text).min(1),
  definitionOfDone: text,
  qualityBar: text,
  handoffRule: text,
});
export type Rules = z.infer<typeof Rules>;

export const Checklist = z.object({
  items: z
    .array(
      z.object({
        id: text,
        work: text,
        readyCriteria: z.array(text).min(1),
        doneCriteria: z.array(text).min(1),
        blockedIf: z.string().default(""),
      }),
    )
    .min(1),
});
export type Checklist = z.infer<typeof Checklist>;

export const Transition = z.object({
  closeOut: text,
  reviewInputs: z.array(text).min(1),
  carryOver: z.array(text).min(1),
  nextCycleTrigger: text,
});
export type Transition = z.infer<typeof Transition>;

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-assets",
  "gate-2-rhythm",
  "gate-3-schedule",
  "gate-4-response",
  "gate-5-scorecard",
  "gate-6-rules",
  "gate-7-checklist",
  "gate-8-transition",
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
  "quantity-fidelity",
  "schedule-feasibility",
  "dependency-honesty",
  "response-readiness",
  "tracking-honesty",
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
        disposition: z.enum(["pending", "fix-in-m12", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({ offered: z.boolean(), alternative: z.string().default(""), whyNotStronger: z.string().default("") }),
  verdict: z.enum(["pass", "revise-m12", "return-upstream", "invalid", "pending"]),
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
  assets: Assets,
  rhythm: Rhythm,
  schedule: Schedule,
  response: Response,
  scorecard: Scorecard,
  rules: Rules,
  checklist: Checklist,
  transition: Transition,
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
  module: z.literal("m12"),
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
export type M12Session = z.infer<typeof Session>;

export const M12SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("m12"),
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
  cycleVersionId: text,
  hashes: z.object({ record: hex64, render: hex64 }),
});
export type M12SealReceipt = z.infer<typeof M12SealReceipt>;
