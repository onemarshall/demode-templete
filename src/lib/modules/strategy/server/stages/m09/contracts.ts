import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const Actor = z.object({ name: text, role: text, authorityRef: text });

export const STAGES = [
  "eligibility",
  "inheritance",
  "direction",
  "destinations",
  "gates",
  "comparison",
  "briefs",
  "measurement",
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

export const Direction = z.object({
  positioning: text,
  audience: text,
  beliefShift: text,
  architecturePrinciples: z.array(text).min(3),
  constraints: z.array(z.string()).default(() => []),
});
export type Direction = z.infer<typeof Direction>;

export const Destinations = z.object({
  destinations: z
    .array(
      z.object({
        id: text,
        name: text,
        purpose: text,
        audienceId: text,
        primaryAction: text,
        beliefRole: text,
      }),
    )
    .min(2),
});
export type Destinations = z.infer<typeof Destinations>;

export const Gates = z.object({
  decisions: z
    .array(
      z.object({
        id: text,
        decision: text,
        options: z.array(text).min(2),
        chosen: text,
        rationale: text,
        evidenceRef: text,
      }),
    )
    .min(1),
});
export type Gates = z.infer<typeof Gates>;

export const Comparison = z.object({
  competitors: z
    .array(
      z.object({
        id: text,
        name: text,
        reference: z.string().default(""),
        strength: text,
        weakness: text,
        learning: text,
      }),
    )
    .min(1),
});
export type Comparison = z.infer<typeof Comparison>;

export const Briefs = z.object({
  briefs: z
    .array(
      z.object({
        id: text,
        destinationId: text,
        objective: text,
        audience: text,
        proof: text,
        sections: z.array(text).min(2),
        primaryAction: text,
        measurementId: text,
      }),
    )
    .min(1),
});
export type Briefs = z.infer<typeof Briefs>;

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

export const GATE_IDS = [
  "gate-0-inheritance",
  "gate-1-direction",
  "gate-2-destinations",
  "gate-3-decisions",
  "gate-4-comparison",
  "gate-5-briefs",
  "gate-6-measurement",
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
  "destination-clarity",
  "brief-usefulness",
  "belief-fidelity",
  "comparison-honesty",
  "measurement-honesty",
  "architecture-coherence",
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
        disposition: z.enum(["pending", "fix-in-m09", "return-upstream", "accepted-limit"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  alternative: z.object({ offered: z.boolean(), alternative: z.string().default(""), whyNotStronger: z.string().default("") }),
  verdict: z.enum(["pass", "revise-m09", "return-upstream", "invalid", "pending"]),
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

export const STAGE_SCHEMAS = {
  inheritance: Inheritance,
  direction: Direction,
  destinations: Destinations,
  gates: Gates,
  comparison: Comparison,
  briefs: Briefs,
  measurement: Measurement,
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
  module: z.literal("09"),
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
export type M09Session = z.infer<typeof Session>;

export const M09SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("09"),
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
export type M09SealReceipt = z.infer<typeof M09SealReceipt>;
