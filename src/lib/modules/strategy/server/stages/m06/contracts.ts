import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;

export const STAGES = [
  "eligibility",
  "inheritance",
  "foundation",
  "audience",
  "positioning",
  "expressions",
  "routes",
  "activation",
  "measurement",
  "checks",
  "review",
  "client-decision",
  "sealed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

export const STATUS = [
  "draft",
  "blocked",
  "candidate",
  "approved",
  "sealed",
  "stale",
  "revision-requested",
  "return-upstream",
  "declined",
] as const;
export const Status = z.enum(STATUS);
export type Status = z.infer<typeof Status>;

export const RouteKind = z.enum(["full", "constrained", "light"]);
export type RouteKind = z.infer<typeof RouteKind>;

// ---------- inheritance ----------

export const MEANING_STATES = ["confirmed", "revision-requested", "not-established", "return-upstream"] as const;

export const MeaningRecord = z.object({
  id: text,
  sourceWords: text,
  sourceRef: text,
  interpretation: z.string().default(""),
  alternative: z.string().default(""),
  situation: z.string().default(""),
  boundary: z.string().default(""),
  repeatBack: z.string().default(""),
  state: z.enum(MEANING_STATES),
  owner: text,
  confirmedBy: z.string().default(""),
});
export type MeaningRecord = z.infer<typeof MeaningRecord>;

export const PermissionRecord = z.object({
  permittedInterpretations: z.array(text).min(1),
  prohibitedInterpretations: z.array(z.string()).default(() => []),
  translationRights: text,
  compressionBoundary: text,
  ownershipBoundary: text,
  generationAuthority: text,
});
export type PermissionRecord = z.infer<typeof PermissionRecord>;

export const Inheritance = z.object({
  convictions: z.object({
    brokenThing: text,
    hiddenTruth: text,
    marketDeployableHiddenTruth: text,
    nonNegotiable: text,
    hardWonTeaching: text,
    legacy: text,
    coreBelief: text,
  }),
  journey: z.object({ from: text, to: text }),
  claimsBoundary: z.object({
    canClaim: z.array(text).min(1),
    mustQualify: z.array(z.string()).default(() => []),
    cannotClaim: z.array(z.string()).default(() => []),
  }),
  governingDeclarations: z.array(text).min(3).max(5),
  foundationSummary: z.object({
    business: text,
    practicalOutcome: text,
    distinction: text,
  }),
  permissionRecord: PermissionRecord,
  meaningRecords: z.array(MeaningRecord).min(1),
});
export type Inheritance = z.infer<typeof Inheritance>;

// ---------- foundation ----------

export const Foundation = z.object({
  brandPositioning: text,
  brandPromise: text,
  manifestoSpine: z.object({
    see: text,
    reject: text,
    believe: text,
    protect: text,
    choose: text,
    intendToChange: text,
    commitTo: text,
    becomesPossible: text,
  }),
  declarations: z.array(text).min(3).max(5),
  positioningBasis: text,
});
export type Foundation = z.infer<typeof Foundation>;

// ---------- audience ----------

export const BELIEF_STAGES = ["unaware", "problem-aware", "solution-aware", "belief-aware", "converted"] as const;

export const Audience = z.object({
  primaryId: text,
  segments: z
    .array(
      z.object({
        id: text,
        name: text,
        beliefStage: z.enum(BELIEF_STAGES),
        situation: text,
        currentBelief: text,
        desiredBelief: text,
        reachableHow: text,
      }),
    )
    .min(1),
});
export type Audience = z.infer<typeof Audience>;

// ---------- positioning ----------

export const Positioning = z.object({
  statement: text,
  rationale: text,
  competitorTest: text,
  beliefTrace: text,
  proofBasis: text,
});
export type Positioning = z.infer<typeof Positioning>;

// ---------- expressions ----------

export const STATEMENT_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"] as const;
export type StatementId = (typeof STATEMENT_IDS)[number];
export const ANCHOR_IDS = ["s8", "s9", "s10"] as const;

export const STATEMENT_LABELS: Record<StatementId, string> = {
  s1: "Positioning",
  s2: "Value proposition",
  s3: "Promise",
  s4: "Proof statement",
  s5: "Category frame",
  s6: "Differentiation",
  s7: "Audience frame",
  s8: "Anchor: core belief",
  s9: "Anchor: non-negotiable",
  s10: "Anchor: legacy",
};

export const Expressions = z.object({
  statements: z
    .array(
      z.object({
        id: z.enum(STATEMENT_IDS),
        text: text,
        beliefTrace: text,
        sourceRefs: z.array(text).min(1),
        anchor: z.boolean(),
      }),
    )
    .length(STATEMENT_IDS.length),
});
export type Expressions = z.infer<typeof Expressions>;

// ---------- routes ----------

export const ROUTE_FUNCTIONS = ["reach", "convince", "convert", "retain"] as const;
export const ROUTE_DISPOSITIONS = ["primary", "supporting", "deferred", "excluded"] as const;
export const EVIDENCE_CONFIDENCE = ["high", "medium", "low", "unproven"] as const;

export const Routes = z.object({
  routes: z
    .array(
      z.object({
        id: text,
        channel: text,
        function: z.enum(ROUTE_FUNCTIONS),
        disposition: z.enum(ROUTE_DISPOSITIONS),
        audienceId: text,
        evidenceConfidence: z.enum(EVIDENCE_CONFIDENCE),
        rationale: text,
      }),
    )
    .min(1),
});
export type Routes = z.infer<typeof Routes>;

// ---------- activation ----------

export const Activation = z.object({
  owner: text,
  sequence: z.array(text).min(1),
  budgetBasis: text,
  firstActions: z.array(text).min(3),
});
export type Activation = z.infer<typeof Activation>;

// ---------- measurement ----------

export const Measurement = z.object({
  metrics: z
    .array(
      z.object({
        id: text,
        metric: text,
        baseline: text,
        target: text,
        source: text,
        reviewCadence: text,
      }),
    )
    .min(2),
});
export type Measurement = z.infer<typeof Measurement>;

// ---------- checks, review, decision ----------

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-foundation",
  "gate-2-audience",
  "gate-3-positioning",
  "gate-4-expressions",
  "gate-5-routes",
  "gate-6-activation",
  "gate-7-measurement",
] as const;
export type GateId = (typeof GATE_IDS)[number];

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
  "positioning-strength",
  "audience-truth",
  "expression-coherence",
  "route-plausibility",
  "activation-capacity",
  "measurement-honesty",
] as const;

export const StressReview = z.object({
  reviewer: z.object({
    identity: text,
    model: z.string().default(""),
    independence: z.enum(["valid", "invalid"]),
    independenceBasis: text,
  }),
  candidateHash: text,
  lenses: z
    .array(
      z.object({ id: z.enum(LENS_IDS), result: z.enum(["pass", "concern", "fail"]), note: z.string().default("") }),
    )
    .length(LENS_IDS.length),
  findings: z
    .array(
      z.object({
        id: text,
        lens: z.enum(LENS_IDS),
        severity: z.enum(["blocker", "material", "minor"]),
        objection: text,
        disposition: z.enum(["pending", "fix-in-m06", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({
    offered: z.boolean(),
    alternative: z.string().default(""),
    whyNotStronger: z.string().default(""),
  }),
  verdict: z.enum(["pass", "revise-m06", "return-upstream", "invalid", "pending"]),
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

// ---------- session ----------

export const STAGE_SCHEMAS = {
  inheritance: Inheritance,
  foundation: Foundation,
  audience: Audience,
  positioning: Positioning,
  expressions: Expressions,
  routes: Routes,
  activation: Activation,
  measurement: Measurement,
  checks: Checks,
  review: StressReview,
  "client-decision": ClientDecision,
} as const;
export const DATA_KEYS = {
  inheritance: "inheritance",
  foundation: "foundation",
  audience: "audience",
  positioning: "positioning",
  expressions: "expressions",
  routes: "routes",
  activation: "activation",
  measurement: "measurement",
  checks: "checks",
  review: "review",
  "client-decision": "clientDecision",
} as const;
export type DataStage = keyof typeof DATA_KEYS;

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
  module: z.literal("06"),
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
export type M06Session = z.infer<typeof Session>;

export const M06SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("06"),
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
  hashes: z.object({ record: hex64, render: hex64 }),
});
export type M06SealReceipt = z.infer<typeof M06SealReceipt>;
