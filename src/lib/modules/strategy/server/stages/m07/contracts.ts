import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;

export const STAGES = [
  "eligibility",
  "inheritance",
  "statements",
  "qualification",
  "conversation",
  "objections",
  "claims",
  "measurement",
  "research",
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
  foundationSummary: z.object({ business: text, practicalOutcome: text, distinction: text }),
  permissionRecord: PermissionRecord,
  meaningRecords: z.array(MeaningRecord).min(1),
});
export type Inheritance = z.infer<typeof Inheritance>;

// ---------- statements ----------

export const STATEMENT_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;
export type StatementId = (typeof STATEMENT_IDS)[number];
export const DEPLOYABLE_IDS = ["s1", "s4", "s5", "s6", "s7", "s8"] as const;
export const DIAGNOSTIC_IDS = ["s2", "s3"] as const;

export const STATEMENT_LABELS: Record<StatementId, string> = {
  s1: "Sales positioning",
  s2: "Diagnostic question",
  s3: "Belief test",
  s4: "Value statement",
  s5: "Proof statement",
  s6: "Objection pre-empt",
  s7: "Qualification statement",
  s8: "Anchor: non-negotiable",
};

export const Statements = z.object({
  statements: z
    .array(
      z.object({
        id: z.enum(STATEMENT_IDS),
        text: text,
        beliefTrace: text,
        sourceRefs: z.array(text).min(1),
        deployable: z.boolean(),
      }),
    )
    .length(STATEMENT_IDS.length),
});
export type Statements = z.infer<typeof Statements>;

// ---------- qualification ----------

export const PROSPECT_STATES = ["belief-ready", "belief-curious", "belief-locked"] as const;

export const Qualification = z.object({
  criteria: z
    .array(
      z.object({
        id: text,
        name: text,
        test: text,
        disqualifyIf: text,
      }),
    )
    .min(2),
  prospects: z
    .array(
      z.object({
        id: text,
        name: text,
        state: z.enum(PROSPECT_STATES),
        evidence: text,
      }),
    )
    .min(1),
  protocol: z.object({
    trigger: text,
    response: text,
    returnOwner: text,
  }),
});
export type Qualification = z.infer<typeof Qualification>;

// ---------- conversation ----------

export const Conversation = z.object({
  stages: z
    .array(
      z.object({
        stage: text,
        purpose: text,
        opening: text,
        questions: z.array(text).min(1),
        exitCriteria: text,
      }),
    )
    .min(3),
});
export type Conversation = z.infer<typeof Conversation>;

// ---------- objections ----------

export const Objections = z.object({
  objections: z
    .array(
      z.object({
        id: text,
        objection: text,
        beliefBehind: text,
        response: text,
        evidenceRef: text,
      }),
    )
    .min(3),
});
export type Objections = z.infer<typeof Objections>;

// ---------- claims ----------

export const CLAIM_BOUNDARIES = ["can-claim", "must-qualify", "cannot-claim"] as const;

export const Claims = z.object({
  claims: z
    .array(
      z.object({
        id: text,
        claim: text,
        boundary: z.enum(CLAIM_BOUNDARIES),
        evidenceRef: text,
        approvedWording: z.string().default(""),
      }),
    )
    .min(1),
});
export type Claims = z.infer<typeof Claims>;

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

// ---------- research ----------

export const RESEARCH_STATES = ["open", "in-progress", "answered", "abandoned"] as const;

export const Research = z.object({
  requests: z
    .array(
      z.object({
        id: text,
        question: text,
        why: text,
        method: text,
        owner: text,
        status: z.enum(RESEARCH_STATES),
      }),
    )
    .min(1),
});
export type Research = z.infer<typeof Research>;

// ---------- checks, review, decision ----------

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-statements",
  "gate-2-qualification",
  "gate-3-conversation",
  "gate-4-objections",
  "gate-5-claims",
  "gate-6-measurement",
  "gate-7-research",
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
  "qualification-honesty",
  "conversation-plausibility",
  "objection-coverage",
  "claims-safety",
  "measurement-honesty",
  "research-sufficiency",
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
    .array(z.object({ id: z.enum(LENS_IDS), result: z.enum(["pass", "concern", "fail"]), note: z.string().default("") }))
    .length(LENS_IDS.length),
  findings: z
    .array(
      z.object({
        id: text,
        lens: z.enum(LENS_IDS),
        severity: z.enum(["blocker", "material", "minor"]),
        objection: text,
        disposition: z.enum(["pending", "fix-in-m07", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({ offered: z.boolean(), alternative: z.string().default(""), whyNotStronger: z.string().default("") }),
  verdict: z.enum(["pass", "revise-m07", "return-upstream", "invalid", "pending"]),
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
  statements: Statements,
  qualification: Qualification,
  conversation: Conversation,
  objections: Objections,
  claims: Claims,
  measurement: Measurement,
  research: Research,
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
  module: z.literal("07"),
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
export type M07Session = z.infer<typeof Session>;

export const M07SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("07"),
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
export type M07SealReceipt = z.infer<typeof M07SealReceipt>;
