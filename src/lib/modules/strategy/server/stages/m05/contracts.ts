import { z } from "zod";
import { FolderName, SessionId } from "../../../shared/types";

const text = z.string().trim().min(1);
const texts = z.array(text).min(1);

/** The client decision names a human; attribution of mutations uses the authenticated actor. */
export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;

export const STAGES = [
  "eligibility",
  "inheritance",
  "semantic",
  "identity",
  "audience",
  "character",
  "expression",
  "synthesis",
  "packet",
  "checks",
  "review",
  "package",
  "client-decision",
  "sealed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

// The manifest's honest end states. "candidate" = frozen exact version under or past independent
// review; "approved"/"declined" record the client call; "return-upstream" and "stale" close the
// session without a seal.
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

// ---------- FW_35 — Meaning Records ----------

export const MEANING_STATES = [
  "confirmed",
  "revision-requested",
  "not-established",
  "return-upstream",
] as const;

export const MeaningRecord = z.object({
  id: text,
  sourceWords: text,
  sourceRef: text,
  interpretation: z.string().default(""),
  // The strongest alternative reading honestly considered and rejected.
  alternative: z.string().default(""),
  // The concrete situation a right reader should recognise.
  situation: z.string().default(""),
  people: z.string().default(""),
  action: z.string().default(""),
  decision: z.string().default(""),
  consequence: z.string().default(""),
  opposite: z.string().default(""),
  // What this record does NOT authorise.
  boundary: z.string().default(""),
  compression: z.string().default(""),
  // The confirmation — what the human repeated back in their own words.
  repeatBack: z.string().default(""),
  state: z.enum(MEANING_STATES),
  owner: text,
  confirmedBy: z.string().default(""),
  consumers: z.array(z.string()).default(() => []),
  staleCondition: z.string().default(""),
});
export type MeaningRecord = z.infer<typeof MeaningRecord>;

// ---------- 05_00 — Inheritance ----------

export const ENGAGEMENT_DISPOSITIONS = [
  "carry-forward",
  "refine-here",
  "open-for-m05",
  "missing-blocking",
  "return-upstream",
  "not-applicable",
] as const;

export const BRAND_STATES = ["new", "rebuild", "migration", "refresh", "portfolio"] as const;
export const BRAND_SCOPES = [
  "business",
  "offer",
  "business-unit",
  "portfolio",
  "parent-brand",
  "sub-brand",
  "initiative",
] as const;

export const SuppliedAsset = z.object({
  name: text,
  reference: z.string().default(""),
  state: z.enum(["supplied", "missing", "unverified", "recreated", "deferred"]),
  permission: z.enum(["permitted", "restricted", "not-confirmed"]),
  note: z.string().default(""),
});
export type SuppliedAsset = z.infer<typeof SuppliedAsset>;

export const PermissionRecord = z.object({
  permittedInterpretations: texts,
  prohibitedInterpretations: z.array(z.string()).default(() => []),
  translationRights: text,
  compressionBoundary: text,
  returnConditions: texts,
  ownershipBoundary: text,
  approvalAuthority: text,
  generationAuthority: text,
});
export type PermissionRecord = z.infer<typeof PermissionRecord>;

export const Inheritance = z.object({
  // Verbatim carriers — quoted exactly, never paraphrased at this stage.
  convictions: z.object({
    brokenThing: text,
    hiddenTruth: text,
    marketDeployableHiddenTruth: text,
    nonNegotiable: text,
    hardWonTeaching: text,
    legacy: text,
    coreBelief: text,
  }),
  // M03 Belief Shift Journey — ingested unchanged per the contract.
  journey: z.object({
    from: text,
    to: text,
    experientialChange: z.string().default(""),
    experienceShape: z.string().default(""),
    discoveryMechanism: z.string().default(""),
  }),
  claimsBoundary: z.object({
    canClaim: texts,
    mustQualify: z.array(z.string()).default(() => []),
    cannotClaim: z.array(z.string()).default(() => []),
  }),
  // Verbatim from the sealed Foundation manifesto.
  governingDeclarations: texts.min(3).max(5),
  foundationSummary: z.object({
    business: text,
    plainTerms: text,
    practicalOutcome: text,
    distinction: text,
    foundersUnderstanding: text,
  }),
  permissionRecord: PermissionRecord,
  // Phase 0 engagement inheritance check — every business-definition field the engagement record
  // carries gets an honest disposition.
  engagementCheck: z
    .array(
      z.object({
        field: text,
        disposition: z.enum(ENGAGEMENT_DISPOSITIONS),
        sourceRef: z.string().default(""),
        note: z.string().default(""),
      }),
    )
    .min(1),
  brandContext: z.object({
    state: z.enum(BRAND_STATES),
    scope: z.enum(BRAND_SCOPES),
    namingScope: z.string().default(""),
    scopeBasis: text,
    existingEquity: z.string().default(""),
    protectedElements: z.array(z.string()).default(() => []),
    openElements: z.array(z.string()).default(() => []),
    equityEvidence: z.string().default(""),
    brandRights: z.object({
      state: z.enum(["established", "pending", "unverified", "none"]),
      evidence: z.string().default(""),
      owner: z.string().default(""),
    }),
    owner: text,
  }),
  suppliedAssets: z.array(SuppliedAsset).default(() => []),
  // Required set: each five conviction elements + journey FROM/TO + each governing declaration.
  meaningRecords: z.array(MeaningRecord).min(1),
});
export type Inheritance = z.infer<typeof Inheritance>;

export const ENGAGEMENT_CHECK_FIELDS = [
  "decision-owner",
  "business-form",
  "current-offer",
  "planned-offer",
  "payer-user",
  "buying-trigger",
  "customer-receipt",
  "delivery",
  "geography",
  "customer-outcome",
  "distinction",
  "commercial-model",
  "existing-positioning",
  "brand-assets",
  "brand-name",
] as const;

// ---------- FW_34 — Semantic Inheritance Ledger + hierarchy ----------

export const HIERARCHY_LEVELS = [
  "governing-identity",
  "broken-condition",
  "governing-stand",
  "purpose",
  "vision",
  "customer-reality",
  "belief-movement",
  "strategic-position",
  "mechanism",
  "operating-commitments",
  "distinction",
  "proof-evidence",
  "boundary",
  "expression-system",
] as const;
export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];

export const AUTHORITY_LEVELS = [
  "fixed-source",
  "approved-decision",
  "evidence-bounded",
  "derived-strategy",
  "expression-candidate",
] as const;
export const EVIDENCE_STATES = [
  "substantiated",
  "qualified",
  "illustrative",
  "hypothesis",
  "cannot-claim",
  "not-applicable",
] as const;

export const LedgerItem = z.object({
  id: text,
  sourceId: text,
  sourceSection: z.string().default(""),
  exactLanguage: text,
  meaningRecordId: z.string().default(""),
  confirmedMeaning: text,
  semanticRole: text,
  authorityLevel: z.enum(AUTHORITY_LEVELS),
  mustPreserve: z.enum(["exact", "meaning", "scope", "no"]),
  mayTranslate: z.enum(["yes", "no", "context-only"]),
  expressionPermission: z.enum([
    "internal-only",
    "public-within-boundary",
    "role-specific",
    "prohibited",
  ]),
  promotionPermission: z.enum(["prohibited", "gate-required", "already-authorised-for-role"]),
  promotionRequiresReason: z.boolean(),
  publicCopyState: z.enum([
    "fixed-authority",
    "candidate",
    "approved-for-role",
    "qualified",
    "prohibited",
  ]),
  headlinePermission: z.enum(["yes", "no", "gate-required"]),
  knownBoundaries: z.array(z.string()).default(() => []),
  evidenceState: z.enum(EVIDENCE_STATES),
  invalidationCondition: text,
  recognitionCue: z.string().default(""),
});
export type LedgerItem = z.infer<typeof LedgerItem>;

export const PromotionRecord = z.object({
  id: text,
  itemId: text,
  toRole: text,
  reason: text,
  basis: text,
  decidedBy: z.string().default(""),
  state: z.enum(["granted", "refused", "held", "revoked"]),
  conditions: z.array(z.string()).default(() => []),
});
export type PromotionRecord = z.infer<typeof PromotionRecord>;

export const Semantic = z.object({
  items: z.array(LedgerItem).min(1),
  hierarchy: z
    .array(
      z.object({
        level: z.enum(HIERARCHY_LEVELS),
        itemIds: z.array(z.string()).default(() => []),
        role: z.enum(["inherited", "m05-decision", "expression", "mixed"]),
        state: z.enum(["derived", "not-derivable", "not-required"]),
        note: z.string().default(""),
      }),
    )
    .length(HIERARCHY_LEVELS.length),
  collapsePoint: z.object({
    level: z.enum(HIERARCHY_LEVELS).nullable(),
    itemId: z.string().default(""),
    reason: z.string().default(""),
  }),
  promotions: z.array(PromotionRecord).default(() => []),
  adversarial: z
    .array(
      z.object({
        id: text,
        kind: z.enum(["promotion", "boundary", "collapse", "translation", "evidence", "recognition"]),
        target: text,
        finding: text,
        state: z.enum(["pass", "fail", "open"]),
        resolution: z.string().default(""),
      }),
    )
    .default(() => []),
  recognition: z
    .array(
      z.object({
        itemId: text,
        cue: text,
        state: z.enum(["held", "broken", "untested"]),
        note: z.string().default(""),
      }),
    )
    .default(() => []),
  exactAuthorityCheck: z.object({
    declarationsVerbatim: z.enum(["pass", "fail", "unassessed"]),
    coreBeliefFromOwner: z.enum(["pass", "fail", "unassessed"]),
    ownerFieldsVerbatim: z.enum(["pass", "fail", "unassessed"]),
    mislabelledInherited: z.array(z.string()).default(() => []),
    unclassifiedLoadBearing: z.array(z.string()).default(() => []),
  }),
  recommendation: z.object({
    state: z.enum(["proceed", "proceed-conditionally", "return-upstream", "wait"]),
    reason: text,
    conditions: z.array(z.string()).default(() => []),
  }),
});
export type Semantic = z.infer<typeof Semantic>;

// ---------- Element stages ----------

export const Identity = z.object({
  purpose: z.object({
    statement: text,
    whyItMatters: text,
    servesWhom: text,
    costIfAbsent: text,
    usp: text,
    // Why a competitor with opposite beliefs could not claim it.
    competitorTest: text,
    proofPoints: texts,
    evidenceBasis: text,
  }),
  vision: z.object({
    statement: text,
    beliefDependency: text,
    legacyAlignment: text,
    horizons: z
      .array(z.object({ horizon: text, state: text, proofMilestone: text }))
      .min(2),
    nonPromises: texts,
    competitorTest: text,
  }),
  values: z
    .array(
      z.object({
        name: text,
        protects: text,
        rejects: text,
        behaviourEvidence: text,
        expression: text,
      }),
    )
    .min(3)
    .max(5),
  worldBelief: text,
  customerBelief: text,
  brandBelief: text,
  brandBeliefs: z
    .array(
      z.object({
        statement: text,
        standing: z.enum(["observed", "approved-decision", "supported-hypothesis"]),
        evidenceOrStanding: text,
      }),
    )
    .min(1),
  // FROM/TO stay verbatim from M03 — the check enforces equality.
  beliefShift: z.object({ from: text, to: text, journeyDescription: text }),
});
export type Identity = z.infer<typeof Identity>;

export const JOURNEY_STAGES = [
  "unaware",
  "problem-aware",
  "solution-aware",
  "converted",
  "advocate",
] as const;

export const Audience = z.object({
  primary: z.object({
    segment: text,
    situation: text,
    currentBelief: text,
    beliefOrigin: text,
    costOfBelief: text,
    readiness: z.enum(["high", "medium", "low"]),
    beliefTrigger: text,
    desiredBelief: text,
    problemInTheirWords: text,
    reachableNow: text,
    reachableHow: text,
  }),
  secondary: z
    .array(z.object({ segment: text, whySecondary: text }))
    .default(() => []),
  antiAudience: z.object({
    who: text,
    opposedBelief: text,
    whyItCosts: text,
    costEvidence: text,
    refusalBoundary: text,
    handlingApproach: text,
  }),
  readinessSignals: z
    .array(z.object({ signal: text, observable: text, source: z.string().default("") }))
    .min(1),
  channels: z.array(z.object({ channel: text, whyBeliefReady: text })).min(1),
  journeyMap: z
    .array(z.object({ stage: z.enum(JOURNEY_STAGES), experience: text, movesForward: text }))
    .length(JOURNEY_STAGES.length),
});
export type Audience = z.infer<typeof Audience>;

export const AWARENESS_LEVELS = [
  "unaware",
  "name-aware",
  "category-aware",
  "belief-aware",
  "belief-aligned",
] as const;

export const Character = z.object({
  awareness: z.object({
    convictionIdeal: z.object({
      thinkOfUs: text,
      understandBelief: text,
      describeToOthers: text,
      feelAboutUs: text,
      expectFromUs: text,
    }),
    levels: z
      .array(z.object({ level: z.enum(AWARENESS_LEVELS), estimate: text, evidence: text }))
      .length(AWARENESS_LEVELS.length),
    gaps: z
      .array(z.object({ gap: text, kind: text, priority: z.enum(["high", "medium", "low"]) }))
      .min(1),
    barriers: z.array(z.object({ barrier: text, kind: z.enum(["external", "internal"]) })).min(3),
    objectives: z
      .array(
        z.object({
          objective: text,
          fromLevel: text,
          toLevel: text,
          metric: text,
          timeline: text,
        }),
      )
      .min(1),
  }),
  personality: z.object({
    traits: z
      .array(
        z.object({
          trait: text,
          derivedFrom: text,
          tooLittle: text,
          justRight: text,
          tooMuch: text,
          oppositeBeliefCouldClaim: z.boolean(),
        }),
      )
      .min(3)
      .max(6),
    neverBehaviours: texts.min(4),
    scenarios: z
      .array(z.object({ context: text, response: text, beliefConnection: text }))
      .min(4),
  }),
  voice: z.object({
    attributes: z.array(z.object({ attribute: text, beliefConnection: text })).min(4).max(6),
    wordsWeUse: z.array(z.object({ word: text, reason: text })).min(3),
    wordsWeAvoid: z.array(z.object({ word: text, contradicts: text })).min(3),
    tones: z
      .array(
        z.object({
          context: z.enum([
            "teaching",
            "celebrating",
            "addressing-problems",
            "handling-criticism",
            "refusing",
          ]),
          approach: text,
        }),
      )
      .length(5),
    examples: z.array(z.object({ context: text, text: text })).min(4),
    platforms: z
      .array(
        z.object({
          platform: text,
          register: text,
          formatFit: text,
          voiceError: text,
          example: text,
        }),
      )
      .min(1),
  }),
  attributes: z.object({
    xFactor: z.object({
      statement: text,
      beliefEnables: text,
      competitorFriction: z
        .array(z.object({ element: text, whyCostly: text }))
        .min(2),
      frictionAcknowledgement: text,
      proof: text,
    }),
    mapping: z
      .array(
        z.object({
          attribute: text,
          tier: z.enum(["conviction", "value", "capability", "table-stakes"]),
          claimsStatus: text,
          proof: z.string().default(""),
        }),
      )
      .min(4),
    hierarchy: z.object({
      primaryDifferentiators: texts,
      supporting: texts,
      tableStakes: texts,
    }),
    wholeDistinction: z.object({
      candidate: text,
      alternatives: z.array(z.object({ option: text, rejectedWhy: text })).min(1),
      verdict: z.enum(["holds", "qualified", "rejected"]),
      reason: text,
    }),
    personalBrandRitual: z.object({
      applicable: z.enum(["yes", "no", "deferred"]),
      ritual: z.string().default(""),
      timing: z.string().default(""),
      owner: z.string().default(""),
    }),
  }),
});
export type Character = z.infer<typeof Character>;

export const Expression = z.object({
  filter: z.object({
    forRule: text,
    notForRule: text,
    question: text,
    beliefChecks: z
      .array(
        z.object({
          check: z.enum(["core-belief", "brand-beliefs", "values", "non-negotiables"]),
          test: text,
        }),
      )
      .length(4),
    audienceChecks: z
      .array(
        z.object({
          check: z.enum([
            "primary-audience",
            "not-anti-audience",
            "belief-shift-language",
            "belief-ready-resonance",
          ]),
          test: text,
        }),
      )
      .length(4),
    refusals: z
      .array(
        z.object({
          refusal: z.enum([
            "claims-beyond-evidence",
            "competitor-language",
            "anti-audience-appeal",
            "belief-contradiction",
            "generic",
            "unkeepable-promise",
          ]),
          note: text,
        }),
      )
      .length(6),
    edgeCases: z.array(z.object({ scenario: text, ruling: text })).min(2),
  }),
  tagline: z.object({
    state: z.enum(["established", "deferred", "not-required"]),
    primary: z.string().default(""),
    beliefExpressed: z.string().default(""),
    desiredReaction: z.string().default(""),
    claimsStatus: z.enum(["can-claim", "must-qualify", "not-assessed"]).default("not-assessed"),
    alternatives: z
      .array(z.object({ tagline: text, context: text }))
      .default(() => []),
    competitorTest: z.string().default(""),
    voiceMatch: z.string().default(""),
    deferredReason: z.string().default(""),
    namingState: z.enum(["retain", "new-required", "defer"]),
    namingReason: z.string().default(""),
  }),
  visual: z.object({
    direction: text,
    colours: z
      .array(z.object({ colour: text, role: text, beliefConnection: text }))
      .min(1),
    typography: z.array(z.object({ trait: text, typeDirection: text })).min(1),
    imagery: z.object({ style: text, beliefConnection: text }),
    neverDo: texts.min(4),
    evidence: text,
  }),
  copywriting: z.object({
    moves: z.array(z.object({ name: text, when: text, example: text })).min(2),
    principles: texts.min(3),
    claimsRules: z
      .array(
        z.object({
          rule: z.enum([
            "verified-against-boundaries",
            "qualifiers-where-required",
            "no-cannot-claim",
            "approved-vocabulary",
          ]),
          note: text,
        }),
      )
      .length(4),
    channelVariations: z.array(z.object({ channel: text, rule: text })).min(1),
  }),
  assets: z.array(SuppliedAsset).default(() => []),
});
export type Expression = z.infer<typeof Expression>;

export const STORY_BEATS = [
  "world-as-it-was",
  "awakening",
  "discovery",
  "commitment",
  "building",
  "invitation",
  "vision",
] as const;

export const Synthesis = z.object({
  story: z
    .array(
      z.object({
        beat: z.enum(STORY_BEATS),
        text: text,
        beliefAtThisMoment: text,
        sourceRefs: texts,
      }),
    )
    .length(STORY_BEATS.length),
  core: z.object({
    positioningStatement: text,
    organisingIdea: text,
    decisionSummary: text,
    driftGuards: texts,
    convictionChecks: texts.min(3),
  }),
  traceability: z.array(z.object({ field: text, sourceRefs: texts })).min(1),
});
export type Synthesis = z.infer<typeof Synthesis>;

// ---------- FW_40 — Decision Packet ----------

export const PACKET_STATES = ["open", "resolved", "deferred", "waived", "blocked"] as const;
export const RESOLUTION_STATES = [
  "unresolved",
  "locked",
  "deferred",
  "return-upstream",
  "not-required",
] as const;
export const WORDING_CLASSES = [
  "verbatim",
  "approved-compression",
  "bounded-paraphrase",
  "new-expression",
] as const;

export const PacketRecord = z.object({
  id: text,
  name: text,
  element: text,
  field: text,
  state: z.enum(PACKET_STATES),
  sourceRefs: texts,
  exactSource: text,
  decision: text,
  boundary: text,
  evidenceState: z.enum(["observed", "approved-decision", "supported-hypothesis", "unknown"]),
  freedom: z.enum(["fixed", "bounded"]),
  authorisedRange: z.string().default(""),
  renderRequirement: z.enum(["render-required", "internal-only"]),
  renderLocation: text,
  renderValue: text,
  wordingClass: z.enum(WORDING_CLASSES),
  resolutionState: z.enum(RESOLUTION_STATES),
  material: z.boolean(),
  returnOwner: z.string().default(""),
  resolvedBy: z.string().default(""),
  resolvedAt: z.string().default(""),
});
export type PacketRecord = z.infer<typeof PacketRecord>;

export const Packet = z.object({
  records: z.array(PacketRecord).min(1),
  builtFromHash: z.string().default(""),
  builtAt: z.string().default(""),
});
export type Packet = z.infer<typeof Packet>;

// ---------- checks — gates 0–6 + coverage + candidate freeze ----------

export const GATE_IDS = [
  "gate-0-pre-suite",
  "gate-1-core-identity",
  "gate-2-audience",
  "gate-3-expression-foundation",
  "gate-4-expression-application",
  "gate-5-synthesis",
  "gate-6-coherence",
] as const;
export type GateId = (typeof GATE_IDS)[number];

export const CheckFinding = z.object({
  code: text,
  message: text,
  ref: z.string().default(""),
});
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
  coverage: z.object({
    required: z.array(z.string()).default(() => []),
    rendered: z.array(z.string()).default(() => []),
    missing: z.array(z.string()).default(() => []),
  }),
  rendered: z.string().default(""),
  renderHash: z.string().default(""),
  packetHash: z.string().default(""),
  candidateHash: z.string().default(""),
  frozenAt: z.string().default(""),
  ranAt: z.string().default(""),
});
export type Checks = z.infer<typeof Checks>;

// ---------- review — Gate 7 independent stress test ----------

export const LENS_IDS = [
  "recommendation-strength",
  "distinctiveness-copyability",
  "cost-refusal-courage",
  "audience-truth",
  "character-voice-reality",
  "expression-pressure",
  "downstream-survivability",
  "credibility-evidence-boundary",
] as const;
export type LensId = (typeof LENS_IDS)[number];

export const VERDICTS = ["pass", "revise-m05", "return-upstream", "invalid", "pending"] as const;

export const StressFinding = z.object({
  id: text,
  lens: z.enum(LENS_IDS),
  severity: z.enum(["blocker", "material", "minor"]),
  element: text,
  objection: text,
  missedWhy: text,
  returnPoint: text,
  minDecision: text,
  disposition: z.enum(["pending", "fix-in-m05", "return-upstream", "accepted-limit"]),
  note: z.string().default(""),
});
export type StressFinding = z.infer<typeof StressFinding>;

export const StressReview = z.object({
  reviewer: z.object({
    identity: text,
    model: z.string().default(""),
    independence: z.enum(["valid", "invalid"]),
    independenceBasis: text,
  }),
  candidateHash: text,
  scopedHash: z.string().default(""),
  hashMatch: z.boolean().default(false),
  lenses: z
    .array(
      z.object({
        id: z.enum(LENS_IDS),
        result: z.enum(["pass", "concern", "fail"]),
        note: z.string().default(""),
      }),
    )
    .length(LENS_IDS.length),
  findings: z.array(StressFinding).default(() => []),
  alternative: z.object({
    offered: z.boolean(),
    alternative: z.string().default(""),
    whyNotStronger: z.string().default(""),
  }),
  verdict: z.enum(VERDICTS),
  verdictBasis: z.string().default(""),
  ranAt: z.string().default(""),
});
export type StressReview = z.infer<typeof StressReview>;

// ---------- package — derived views after candidate release ----------

export const VIEW_IDS = [
  "brand-strategy",
  "brand-story",
  "executive-view",
  "strategy-summary",
  "presentation",
  "practitioner-brief",
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export const Package = z.object({
  views: z
    .array(
      z.object({
        id: z.enum(VIEW_IDS),
        title: text,
        path: text,
        collection: text,
        state: z.enum(["rendered", "pending", "failed"]),
        hash: z.string().default(""),
      }),
    )
    .length(VIEW_IDS.length),
  reconciliation: z.enum(["pass", "fail", "unassessed"]),
  notes: z.string().default(""),
});
export type Package = z.infer<typeof Package>;

// ---------- client decision — the joined human call ----------

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
  semantic: Semantic,
  identity: Identity,
  audience: Audience,
  character: Character,
  expression: Expression,
  synthesis: Synthesis,
  packet: Packet,
  checks: Checks,
  review: StressReview,
  package: Package,
  "client-decision": ClientDecision,
} as const;
export const DATA_KEYS = {
  inheritance: "inheritance",
  semantic: "semantic",
  identity: "identity",
  audience: "audience",
  character: "character",
  expression: "expression",
  synthesis: "synthesis",
  packet: "packet",
  checks: "checks",
  review: "review",
  package: "package",
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
export type Receipt = z.infer<typeof Receipt>;

export const Session = z.object({
  module: z.literal("05"),
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
  // The route capability the sealed Foundation granted — recorded for the envelope.
  capability: text,
  confirmations: z.record(z.string(), Receipt).default(() => ({})),
  data: z.record(z.string(), z.unknown()).default(() => ({})),
  drafts: z.record(z.string(), z.unknown()).default(() => ({})),
  history: z.array(z.unknown()).default(() => []),
  // Frozen exact candidate identity. Any later edit to the rendered strategy invalidates the
  // review and every downstream view.
  candidateHash: z.string().nullable().default(null),
  candidateVersionId: z.string().nullable().default(null),
  seal: z
    .object({ versionId: text, hash: text, at: text, path: text })
    .nullable()
    .default(null),
  parentSessionId: SessionId.optional(),
});
export type M05Session = z.infer<typeof Session>;
