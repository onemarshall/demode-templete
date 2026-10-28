import { z } from "zod";
// Historical identity fields remain in immutable payloads; tenant ownership is supplied by scope.
const SessionId = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Session must be a UUID",
  );
const FolderName = z
  .string()
  .regex(/^[A-Za-z0-9._-]+$/)
  .refine((value) => value !== "." && value !== "..", "Folder must be a single client folder name");
const text = z.string().trim().min(1);
const texts = z.array(text);
export const Actor = z.object({ name: text, role: text, authorityRef: text });
export type Actor = z.infer<typeof Actor>;
export const STAGES = [
  "context",
  "conviction-cost",
  "market-readiness",
  "human-load",
  "financial-grounding",
  "awareness-and-weighing",
  "recommendation",
  "human-decision",
  "checks",
  "sealed",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;
export const ResponsePath = z.enum([
  "proceed-informed",
  "adjust",
  "wait",
  "accept-constraint",
  "walk-away",
]);
export const SourceBasis = z.object({
  id: text,
  sourceRef: text,
  wording: text,
  owner: text,
  date: text,
  state: z.enum(["confirmed", "reported", "inferred", "unknown", "conflicted"]),
  access: text,
  consent: text,
  retention: text,
  quotationPermission: text,
});
export const Conflict = z.object({
  id: text,
  leftVerbatim: text,
  rightVerbatim: text,
  owner: text,
  material: z.boolean(),
  state: z.enum(["open", "resolved", "returned"]),
  resolution: z.string(),
});
export const Context = z.object({
  decisionOwner: text,
  authorityRef: text,
  operatingStage: text,
  teamShape: z.enum(["solo", "family", "multiple-principals", "staff-bearing"]),
  principals: texts.min(1),
  businessForm: text,
  currentOffer: text,
  plannedOffer: text,
  buyer: text,
  user: text,
  trigger: text,
  receives: text,
  delivery: text,
  geography: text,
  customerOutcome: text,
  distinction: text,
  resources: text,
  otherCommitments: text,
  modelQuestions: z.array(z.enum(["yes", "no", "unknown"])).length(4),
  complexity: z.enum(["low", "mixed", "high", "unknown"]),
  mechanics: texts.min(1),
  materiality: z.enum(["low", "material", "high_structural"]),
  materialityIndicators: texts.min(1),
  existingValueAtRisk: text,
  transitionDownside: text,
  reversibility: text,
  unknowns: texts,
  sourceBasis: z.array(SourceBasis).min(1),
  conflicts: z.array(Conflict).default([]),
  adaptations: z
    .array(
      z.object({
        rule: z.enum(["M04-AQ-01", "M04-AQ-02", "M04-AQ-03", "M04-AQ-04"]),
        triggerSource: text,
        findingDestination: text,
      }),
    )
    .default([]),
});
export const ConvictionCost = z.object({
  rows: z
    .array(
      z.object({
        commitmentId: text,
        sourceWording: text,
        requirement: text,
        costType: z.enum(["front-loaded", "ongoing", "mixed"]),
        inputIds: texts,
        costFinding: text,
        customerEffect: text,
      }),
    )
    .min(1),
  profitOnlyComparison: text,
  comparison: z.enum(["agrees", "higher", "new-cost", "lower"]),
  comparisonBasis: text,
  contradiction: text,
  owner: text,
});
export const MarketReadiness = z.object({
  problemRecognition: z.enum(["high", "medium", "low", "unknown"]),
  spending: z.enum(["existing", "adjacent", "new", "unknown"]),
  educationBurden: z.enum(["minimal", "moderate", "substantial", "unknown"]),
  verdict: z.enum(["capture", "creation", "mixed", "unknown"]),
  educationPeriod: text,
  segmentSize: text,
  reachability: text,
  growth: text,
  sourceRefs: texts.min(1),
  inheritedFinding: text,
  interpretation: text,
  changesMarketFinding: z.boolean(),
});
export const HumanLoad = z.object({
  principals: z
    .array(
      z.object({
        name: text,
        timeToRevenue: text,
        gapSustainability: z.enum(["yes", "stretch", "no", "unknown"]),
        gapReason: text,
        energySource: text,
        energySustainability: text,
        emotionalReadiness: text,
        relationshipImpact: text,
        discussed: z.enum(["yes", "no", "not-applicable"]),
        opportunityCost: text,
        simplerPath: text,
        whyThisPath: text,
        capacity: text,
        breaksFirst: text,
        testimonySource: text,
      }),
    )
    .min(1),
  organisationalLoad: text,
  supportGap: z.boolean(),
  existingValueConsequences: text,
});
export const FinancialGrounding = z.object({
  inputs: z.array(z.unknown()),
  calculations: z.array(
    z.object({ id: text, kind: text, inputIds: texts, assumptions: text, formula: text }),
  ),
  mechanisms: z
    .array(
      z.object({
        id: z.string().regex(/^M(?:[1-9]|10)$/),
        applicable: z.boolean(),
        disposition: z.enum(["applicable", "not-applicable", "unresolved"]).optional(),
        reason: text,
        finding: text,
        inputIds: texts,
        limitation: z.string(),
      }),
    )
    .length(10),
  economicFloor: text,
  convictionFloor: text,
  biggestAssumption: text,
  evidence: text,
  ifWrong: text,
  investmentLimit: text,
  pricing: z.object({
    state: z.enum(["bounded", "not-yet-estimable", "not-applicable"]),
    finding: text,
    inputIds: texts,
    conditions: text,
    claimsBoundary: text,
  }),
  offers: z.array(
    z.object({
      suppliedOffer: text,
      source: text,
      feasibility: z.enum(["supported", "conditional", "not-yet-estimable", "not-applicable"]),
      conditions: text,
      exclusions: text,
    }),
  ),
  bridge: z.object({
    applicable: z.boolean(),
    job: text,
    resources: text,
    evidenceEvent: text,
    owner: text,
    limits: text,
  }),
});
export const Awareness = z.object({
  markers: z
    .array(
      z.object({
        id: z.string().regex(/^U[1-8]$/),
        finding: text,
        consequence: text,
        weighed: z.boolean(),
        consideration: text,
        sourceRefs: texts.min(1),
        owner: text,
        moreToDo: text,
      }),
    )
    .length(8),
  reflectionStarted: text,
  returnedAt: text,
  weighingAccount: text,
  signals: z
    .array(z.object({ id: text, present: z.boolean(), sourceRef: text, basis: text }))
    .length(8),
  riskSatisfaction: z.array(
    z.object({
      riskId: text,
      verbatim: text,
      state: z.enum(["satisfied", "disputed", "return"]),
      decision: text,
      owner: text,
      sourceRef: text,
    }),
  ),
  fullPicture: text,
  proportionality: text,
  simplerRoute: text,
});
export const Meaning = z.object({
  id: text,
  sourceWords: text,
  sourceRef: text,
  interpretation: text,
  alternative: text,
  situation: text,
  people: text,
  action: text,
  decision: text,
  consequence: text,
  opposite: text,
  boundary: text,
  compression: text,
  repeatBack: text,
  state: z.enum(["confirmed", "revision-requested", "not-established", "return-upstream"]),
  owner: text,
});
export const Accountability = z.object({
  id: text,
  decision: text,
  observableEffect: text,
  evidence: text,
  contradiction: text,
  assumptions: z.array(
    z.object({
      id: text,
      statement: text,
      type: z.enum(["estimate", "hypothesis", "unknown"]),
      test: text,
      owner: text,
      expiry: text,
      review: text,
    }),
  ),
  consequences: z.array(
    z.object({
      id: text,
      work: text,
      state: z.enum(["required", "optional", "conditional", "deferred", "prohibited"]),
      owner: text,
      dependency: text,
    }),
  ),
  costDrivers: z.array(
    z.object({
      id: text,
      workUnit: text,
      quantityBasis: text,
      estimatePermission: text,
      limitation: text,
    }),
  ),
  measurement: z.object({
    implementationProof: text,
    baseline: text,
    qualitativeEvidence: text,
    quantitativeEvidence: text,
    owner: text,
    horizon: text,
    attributionCeiling: text,
    review: text,
    strong: text,
    partial: text,
    weak: text,
    stop: text,
    returnPoint: text,
  }),
});
export const Recommendation = z.object({
  routes: z
    .array(
      z.object({
        path: ResponsePath,
        description: text,
        conviction: text,
        marketSupport: text,
        capacity: text,
        economics: text,
        humanLoad: text,
        reversibility: text,
        risk: text,
      }),
    )
    .min(1),
  unavailableAlternatives: text,
  recommendedPath: ResponsePath,
  recommendation: text,
  rationale: text,
  first: text,
  second: text,
  deferred: text,
  confidence: z.enum(["high", "moderate", "low"]),
  confidenceBasis: text,
  ifHolds: text,
  ifFails: text,
  ifNoDecision: text,
  assumptions: texts,
  unresolvedEvidence: texts,
  reversalConditions: text,
  integrityCheck: text,
  professionalCall: text,
  nextWork: text,
  meaningRecords: z.array(Meaning).min(1),
  accountability: z.array(Accountability).min(1),
});
export const Decision = z.object({
  response: z.enum(["accept", "override", "compare", "revise", "return-upstream"]),
  path: ResponsePath,
  memoHash: text,
  rationale: text,
  allowedOutputs: texts,
  deferredOutputs: texts,
  prohibitedOutputs: texts.min(1),
  reducedName: z.string(),
  reviewDate: text,
  expiry: text,
  reEntryTrigger: text,
  closureCondition: text,
  disconfirmation: text,
  switchFindings: texts,
  inabilityReason: z.string(),
  override: z
    .object({
      scope: text,
      acceptedRisks: texts.min(1),
      evidenceLimits: text,
      reviewCondition: text,
      expiry: text,
    })
    .nullable(),
  returnOwner: z.enum(["m01", "m02", "m03"]).nullable(),
  changedPremise: z.string(),
});
export const STAGE_SCHEMAS = {
  context: Context,
  "conviction-cost": ConvictionCost,
  "market-readiness": MarketReadiness,
  "human-load": HumanLoad,
  "financial-grounding": FinancialGrounding,
  "awareness-and-weighing": Awareness,
  recommendation: Recommendation,
  "human-decision": Decision,
} as const;
export const DATA_KEYS = {
  context: "context",
  "conviction-cost": "convictionCost",
  "market-readiness": "marketReadiness",
  "human-load": "humanLoad",
  "financial-grounding": "financialGrounding",
  "awareness-and-weighing": "awareness",
  recommendation: "recommendation",
  "human-decision": "decision",
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
  module: z.literal("04"),
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
    "dependency-return",
    "waiting",
    "adjustment-return",
    "terminal",
    "stale",
    "sealed",
  ]),
  route: z.enum(["full", "light", "constrained"]),
  equivalentEvidence: z.string(),
  sourceHash: text,
  sources: z.unknown(),
  confirmations: z.record(z.string(), Receipt),
  presented: z.object({ hash: text, at: text, actor: Actor }).nullable(),
  data: z.record(z.string(), z.unknown()),
  drafts: z.record(z.string(), z.unknown()),
  history: z.array(z.unknown()),
  routeAuthorization: z.record(z.string(), z.unknown()).nullable(),
  seal: z.object({ versionId: text, hash: text, at: text, path: text }).nullable(),
  parentSessionId: SessionId.optional(),
});
export type M04Session = z.infer<typeof Session>;
export const Mutation = z.object({
  folder: FolderName,
  sessionId: SessionId,
  expectedRevision: z.number().int().nonnegative(),
  actor: Actor,
  action: text,
  stage: Stage.optional(),
  payload: z.unknown().optional(),
});
