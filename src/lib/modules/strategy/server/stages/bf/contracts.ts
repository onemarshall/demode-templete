import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);

/** The client decision names a human; attribution of mutations uses the authenticated actor. */
export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;

export const STAGES = ["assessment", "manifesto", "document", "client-decision", "sealed"] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

/** The sixteen required realities from Business-Definition-Input-Assessment-Template.md v1.6. */
export const ASSESSMENT_ROWS = [
  "factual-identity",
  "business-form",
  "current-offers",
  "payer-user",
  "buying-trigger",
  "customer-receipt",
  "delivery",
  "commercial-model",
  "market-geography",
  "practical-outcome",
  "distinction",
  "founder-belief",
  "evidence-for-claims",
  "offer-states",
  "operating-mechanism",
  "unknowns",
] as const;
export type AssessmentRowId = (typeof ASSESSMENT_ROWS)[number];

export const AssessmentState = z.enum([
  "sufficient",
  "partial",
  "missing",
  "conflicted",
  "not-applicable",
]);
export const AssessmentBasis = z.enum([
  "observed-fact",
  "approved-decision",
  "supported-hypothesis",
  "unsupported-assertion",
  "unknown",
]);
export const ReturnOwner = z.enum(["entry", "m01", "m02", "m03", "m04"]);

export const Assessment = z.object({
  rows: z
    .array(
      z.object({
        id: z.enum(ASSESSMENT_ROWS),
        state: AssessmentState,
        basis: AssessmentBasis,
        evidence: text,
        owner: text,
        nextAction: z.string().default(""),
        capabilityBlocked: z.string().default(""),
      }),
    )
    .length(16),
  contradictions: z
    .array(
      z.object({
        id: text,
        issue: text,
        owningSource: text,
        whyItMatters: text,
        requiredAction: text,
        blocksFoundation: z.boolean(),
      }),
    )
    .default(() => []),
  decision: z.object({
    state: z.enum(["passed", "remediation_required", "blocked", "awaiting_owner_decision"]),
    reason: text,
    questions: z.array(z.string()).default(() => []),
    returnOwners: z.array(ReturnOwner).default(() => []),
    manifestoRoute: z.enum(["permitted", "refused"]),
  }),
  assessedBy: text,
});
export type Assessment = z.infer<typeof Assessment>;

export const Spine = z.object({
  see: text,
  reject: text,
  believe: text,
  protect: text,
  choose: text,
  intendToChange: text,
  commitTo: text,
  becomesPossible: text,
});
export type Spine = z.infer<typeof Spine>;

export const SPINE_LABELS: Record<keyof Spine, string> = {
  see: "What we see",
  reject: "What we reject",
  believe: "What we believe",
  protect: "What we protect",
  choose: "What we choose",
  intendToChange: "What we intend to change",
  commitTo: "What we commit to",
  becomesPossible: "What becomes possible",
};

export const DECLARATION_TEST_IDS = [
  "derivation",
  "no-invention",
  "line-in-the-sand",
  "stakes",
  "specificity",
  "courage",
  "spoken",
  "claims",
  "role-boundary",
  "coherence",
  "foundation-implications",
] as const;
export type DeclarationTestId = (typeof DECLARATION_TEST_IDS)[number];

export const Manifesto = z.object({
  convictions: z
    .array(z.object({ statement: text, evidence: text, consequence: text }))
    .min(3)
    .max(7),
  spine: Spine,
  manifesto: text.min(120),
  declarations: z.array(text).min(3).max(5),
  implications: z
    .array(
      z.object({
        id: text,
        implication: text,
        disposition: z.enum(["reflected", "returned", "unresolved-blocking"]),
        target: z.string().default(""),
      }),
    )
    .min(1),
  sourceTrace: z.array(z.object({ item: text, sourceRef: text })).min(1),
  declarationTests: z
    .array(
      z.object({
        id: z.enum(DECLARATION_TEST_IDS),
        result: z.enum(["pass", "fail", "unassessed"]),
        basis: text,
      }),
    )
    .length(DECLARATION_TEST_IDS.length),
});
export type Manifesto = z.infer<typeof Manifesto>;

export const OfferForm = z.enum([
  "service",
  "physical-product",
  "software",
  "platform",
  "methodology-or-intellectual-system",
  "licensed-intellectual-property",
  "hybrid-or-portfolio",
]);
export const ExplanatoryDependency = z.enum(["required", "helpful", "not-required", "unresolved"]);

export const STRUCTURAL_TEST_IDS = [
  "category",
  "transaction",
  "customer",
  "outcome",
  "delivery",
  "specificity",
  "consistency",
  "distinction",
  "evidence",
  "portfolio",
] as const;
export type StructuralTestId = (typeof STRUCTURAL_TEST_IDS)[number];

export const REQUIRED_SECTIONS = [
  "executive-overview",
  "what-the-business-is",
  "why-it-exists",
  "who-it-serves",
  "what-it-produces",
  "products-services",
  "portfolio",
  "practical-outcome",
  "distinction",
  "founders-understanding",
  "capability-created",
  "manifesto",
  "approval",
] as const;

export const FoundationDoc = z.object({
  business: text,
  purposeText: text,
  plainTerms: text,
  atAGlance: z.object({
    form: text,
    buyNow: text,
    payer: text,
    user: text,
    trigger: text,
    receives: text,
    delivery: text,
    operates: text,
  }),
  whatTheBusinessIs: text,
  whyItExists: text,
  whoItServes: text,
  whatItProduces: text,
  productsServices: z
    .array(
      z.object({
        name: text,
        what: text,
        whoFor: text,
        state: z.enum([
          "current",
          "conditional",
          "validating",
          "planned",
          "forthcoming",
          "deferred",
          "retired",
        ]),
      }),
    )
    .min(1),
  scope: z.enum(["whole-business", "portfolio", "individual-offer"]),
  portfolio: z.array(z.object({ name: text, role: text, status: text, relationship: text })).min(1),
  practicalOutcome: text,
  distinction: text,
  foundersUnderstanding: text,
  capabilityCreated: text,
  placeInSystem: text,
  approvalAuthorises: text,
  offerForm: OfferForm,
  explanatoryDependency: ExplanatoryDependency,
  operatingMechanism: z
    .object({
      customerValue: text,
      operatingModel: text,
      methodologyRelation: text,
      modelState: z.enum(["proposed", "approved", "unresolved"]),
    })
    .nullable(),
  includeSpine: z.boolean(),
  sectionLineage: z
    .array(
      z.object({
        section: text,
        sources: z.array(text).min(1),
        basis: text,
        limitation: z.string().default(""),
      }),
    )
    .min(1),
  structuralTests: z
    .array(
      z.object({
        id: z.enum(STRUCTURAL_TEST_IDS),
        result: z.enum(["pass", "fail", "unassessed"]),
        basis: text,
      }),
    )
    .length(STRUCTURAL_TEST_IDS.length),
  distillation: z.object({
    loadBearingMinimum: text,
    hostileReading: text,
    variablesPreserved: z.array(text).min(1),
  }),
});
export type FoundationDoc = z.infer<typeof FoundationDoc>;

/** Bounded fresh review of the exact candidate — FW_28 §9. */
export const FindingClass = z.enum([
  "wrong-conclusion",
  "source-conflict",
  "unclear-expression",
  "honest-unknown",
]);
export const FreshReview = z.object({
  model: text,
  at: text,
  findings: z.array(
    z.object({
      id: text,
      classification: FindingClass,
      finding: text,
      disposition: z.enum([
        "pending",
        "corrected-locally",
        "returned-upstream",
        "accepted-limit",
        "blocking",
      ]),
      note: z.string().default(""),
    }),
  ),
  recheck: z
    .object({ at: text, result: z.enum(["pass", "findings-remain"]), note: z.string().default("") })
    .nullable(),
});
export type FreshReview = z.infer<typeof FreshReview>;

/** The joined client decision — FW_28 §3/§9, approval record template v2.1. */
export const ClientDecision = z.object({
  response: z.enum(["approve", "revision-requested", "source-disputed"]),
  businessConfirmed: z.boolean(),
  standConfirmed: z.boolean(),
  approver: Actor,
  exactResponse: text,
  revisionNote: z.string().default(""),
  disputedField: z.string().default(""),
  returnOwner: ReturnOwner.nullable(),
});
export type ClientDecision = z.infer<typeof ClientDecision>;

export const STAGE_SCHEMAS = {
  assessment: Assessment,
  manifesto: Manifesto,
  document: FoundationDoc,
} as const;
export const DATA_KEYS = {
  assessment: "assessment",
  manifesto: "manifesto",
  document: "document",
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

export const Gate = z.object({
  downstreamGateState: z.enum(["open", "blocked"]),
  m05Permission: z.enum(["granted", "denied"]),
  reasons: z.array(z.string()),
});
export type Gate = z.infer<typeof Gate>;

/** The pinned upstream bundle: engagement authority plus the sealed viability tuple. */
export const BFSource = z.object({
  folder: FolderName,
  entry: z.object({ receipt: z.record(z.string(), z.unknown()) }),
  m04: z.object({
    sessionId: SessionId,
    sealVersionId: text,
    sealHash: text,
    sealedAt: text,
    routeAuthorization: z.record(z.string(), z.unknown()),
    sources: z.unknown(),
    data: z.record(z.string(), z.unknown()),
  }),
});
export type BFSource = z.infer<typeof BFSource>;

export const Session = z.object({
  module: z.literal("bf"),
  sessionId: SessionId,
  folder: FolderName,
  revision: z.number().int().nonnegative(),
  createdAt: text,
  updatedAt: text,
  stage: Stage,
  status: z.enum([
    "draft",
    "awaiting-input",
    "revision-requested",
    "source-disputed",
    "dependency-return",
    "sealed",
    "stale",
  ]),
  sourceHash: text,
  sources: z.unknown(),
  confirmations: z.record(z.string(), Receipt).default(() => ({})),
  review: FreshReview.nullable().default(null),
  data: z.record(z.string(), z.unknown()).default(() => ({})),
  drafts: z.record(z.string(), z.unknown()).default(() => ({})),
  history: z.array(z.unknown()).default(() => []),
  gate: Gate.nullable().default(null),
  seal: z.object({ versionId: text, hash: text, at: text, path: text }).nullable().default(null),
  parentSessionId: SessionId.optional(),
});
export type BFSession = z.infer<typeof Session>;

export const BFDraft = z.object({
  candidate: z.unknown(),
  model: z.string(),
  usage: z.unknown().nullable().default(null),
  at: z.string(),
  methodRelease: z.string(),
  sourceHash: z.string(),
});
export type BFDraft = z.infer<typeof BFDraft>;

/** Immutable receipt carried in the sealed version payload. */
export const BFSealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("bf"),
  status: z.literal("sealed"),
  receiptId: z.uuid(),
  sealHash: z.string().regex(/^[a-f0-9]{64}$/),
  sessionId: SessionId,
  folder: FolderName,
  sealedAt: z.string(),
  sealedBy: z.string().min(1),
  sourceHash: z.string(),
  approvalState: z.literal("approved"),
  gate: Gate,
  hashes: z.object({
    record: z.string().regex(/^[a-f0-9]{64}$/),
    data: z.string().regex(/^[a-f0-9]{64}$/),
    render: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
export type BFSealReceipt = z.infer<typeof BFSealReceipt>;
