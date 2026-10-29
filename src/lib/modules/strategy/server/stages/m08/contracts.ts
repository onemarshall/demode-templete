import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;

export const STAGES = [
  "eligibility",
  "inheritance",
  "mission",
  "pillars",
  "library",
  "gaps",
  "sales-map",
  "claims",
  "distribution",
  "production",
  "measures",
  "operations",
  "compliance",
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

export const RouteKind = z.enum(["full", "constrained", "light"]);

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
  permissionRecord: z.object({
    permittedInterpretations: z.array(text).min(1),
    prohibitedInterpretations: z.array(z.string()).default(() => []),
    translationRights: text,
    compressionBoundary: text,
    ownershipBoundary: text,
    generationAuthority: text,
  }),
  meaningRecords: z.array(MeaningRecord).min(1),
});
export type Inheritance = z.infer<typeof Inheritance>;

// ---------- mission ----------

export const Mission = z.object({
  statement: text,
  audienceId: text,
  beliefShift: text,
  purpose: text,
});
export type Mission = z.infer<typeof Mission>;

// ---------- pillars ----------

export const Pillars = z.object({
  pillars: z
    .array(
      z.object({
        id: text,
        name: text,
        beliefAnchor: text,
        proofType: z.enum(["demonstration", "evidence", "teaching", "refusal"]),
        audience: text,
        rationale: text,
      }),
    )
    .min(3),
});
export type Pillars = z.infer<typeof Pillars>;

// ---------- library ----------

export const LIBRARY_STATES = ["planned", "drafted", "published", "retired"] as const;

export const Library = z.object({
  assets: z
    .array(
      z.object({
        id: text,
        title: text,
        pillarId: text,
        format: text,
        evidenceRef: text,
        state: z.enum(LIBRARY_STATES),
      }),
    )
    .min(1),
});
export type Library = z.infer<typeof Library>;

// ---------- gaps ----------

export const Gaps = z.object({
  gaps: z
    .array(
      z.object({
        id: text,
        pillarId: text,
        missing: text,
        why: text,
        severity: z.enum(["blocking", "material", "minor"]),
        remedy: text,
      }),
    )
    .min(1),
});
export type Gaps = z.infer<typeof Gaps>;

// ---------- sales map ----------

export const SalesMap = z.object({
  mappings: z
    .array(
      z.object({
        id: text,
        objectionId: text,
        assetIds: z.array(text).min(1),
        coverage: z.enum(["full", "partial", "none"]),
      }),
    )
    .min(1),
});
export type SalesMap = z.infer<typeof SalesMap>;

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

// ---------- distribution ----------

export const Distribution = z.object({
  channels: z
    .array(
      z.object({
        id: text,
        channel: text,
        pillarId: text,
        cadence: text,
        owner: text,
      }),
    )
    .min(1),
});
export type Distribution = z.infer<typeof Distribution>;

// ---------- production ----------

export const Production = z.object({
  workflow: z
    .array(
      z.object({
        stage: text,
        owner: text,
        input: text,
        output: text,
        sla: text,
      }),
    )
    .min(3),
});
export type Production = z.infer<typeof Production>;

// ---------- measures ----------

export const Measures = z.object({
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
export type Measures = z.infer<typeof Measures>;

// ---------- operations ----------

export const Operations = z.object({
  owner: text,
  cadence: text,
  reviewForum: text,
  escalation: text,
});
export type Operations = z.infer<typeof Operations>;

// ---------- compliance ----------

export const Compliance = z.object({
  checks: z
    .array(
      z.object({
        id: text,
        item: text,
        result: z.enum(["pass", "fail", "not-applicable"]),
        evidenceRef: text,
      }),
    )
    .min(1),
});
export type Compliance = z.infer<typeof Compliance>;

// ---------- checks, review, decision ----------

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-mission",
  "gate-2-pillars",
  "gate-3-library",
  "gate-4-gaps",
  "gate-5-sales-map",
  "gate-6-claims",
  "gate-7-distribution",
  "gate-8-production",
  "gate-9-measures",
  "gate-10-operations",
  "gate-11-compliance",
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
  "pillar-integrity",
  "proof-sufficiency",
  "sales-usefulness",
  "claims-safety",
  "production-feasibility",
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
    .array(z.object({ id: z.enum(LENS_IDS), result: z.enum(["pass", "concern", "fail"]), note: z.string().default("") }))
    .length(LENS_IDS.length),
  findings: z
    .array(
      z.object({
        id: text,
        lens: z.enum(LENS_IDS),
        severity: z.enum(["blocker", "material", "minor"]),
        objection: text,
        disposition: z.enum(["pending", "fix-in-m08", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({ offered: z.boolean(), alternative: z.string().default(""), whyNotStronger: z.string().default("") }),
  verdict: z.enum(["pass", "revise-m08", "return-upstream", "invalid", "pending"]),
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
  mission: Mission,
  pillars: Pillars,
  library: Library,
  gaps: Gaps,
  "sales-map": SalesMap,
  claims: Claims,
  distribution: Distribution,
  production: Production,
  measures: Measures,
  operations: Operations,
  compliance: Compliance,
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
  module: z.literal("08"),
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
export type M08Session = z.infer<typeof Session>;

export const M08SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("08"),
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
export type M08SealReceipt = z.infer<typeof M08SealReceipt>;
