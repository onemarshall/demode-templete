import { z } from "zod";
import { createHash } from "node:crypto";
import { FolderName, SessionId, RouteKind } from "../../../shared/types";
import { ArtifactKind, type ArtifactStore } from "./evidence";

// ---------- Session stage machine ----------

// Mirrors the plan's session shape: upstream-check → setup → gather →
// artefact-review → builder-inputs → gates → risk → outcome → judgements →
// sealed. A failed upstream check emits only a dependency notice — no session
// is created — so "blocked_upstream" is a transient state on the check
// response, not a stored stage.
export const M02_STAGES = [
  "setup",
  "gather",
  "artefact-review",
  "builder-inputs",
  "gates",
  "risk",
  "outcome",
  "judgements",
  "sealed",
] as const;

export type M02Stage = (typeof M02_STAGES)[number];

export const Confirmation = z.object({
  by: z.string().min(1),
  at: z.string(),
  note: z.string().optional(),
});

export type Confirmation = z.infer<typeof Confirmation>;

// The pre-drafted research form — infer-and-confirm, not a quiz (Step 0b).
export const Competitor = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  note: z.string().optional(),
  // Draft-time reachability probe — inferred URLs are model guesses until
  // verified. Recorded so the operator sees which were hallucinated.
  urlCheck: z.enum(["ok", "blocked", "dead"]).optional(),
  // Where the URL came from — model recall vs. observed search result.
  urlSource: z.enum(["model", "search"]).optional(),
});

export const ResearchForm = z.object({
  competitors: z.array(Competitor).min(1).max(8),
  cohort: z.string().min(1),
  geography: z.string().min(1),
  platforms: z.array(z.string().min(1)).default(() => []),
  sectorGuess: z.string().default(""),
  rationale: z.string().default(""),
});

export type ResearchForm = z.infer<typeof ResearchForm>;

export const SectorMatchInfo = z.object({
  documentId: z.string(),
  slug: z.string(),
  title: z.string(),
  sectorSlug: z.string(),
  version: z.string(),
  status: z.string(),
  deploymentStatus: z.string(),
  approved: z.boolean(),
  devFixture: z.boolean(),
  matchedOn: z.array(z.string()),
});

export type SectorMatchInfo = z.infer<typeof SectorMatchInfo>;

export const DependencyNotice = z.object({
  ownerModule: z.literal("01"),
  ownerName: z.literal("Founder Conviction Foundation"),
  reason: z.string(),
  missing: z.array(z.string()),
  prohibition: z.string(),
  correction: z.string(),
});

export type DependencyNotice = z.infer<typeof DependencyNotice>;

export const EvidenceReviewReceipt = z.object({
  receiptId: z.string().uuid(),
  by: z.string().min(1),
  at: z.string(),
  disposition: z.enum(["sufficient_for_provisional", "insufficient", "contested"]),
  rationale: z.string().min(1),
  basisHash: z.string().regex(/^[a-f0-9]{64}$/),
  entanglement: z.object({ pass: z.boolean(), problems: z.array(z.string()) }),
  evidenceProblems: z.array(z.string()),
});

export type EvidenceReviewReceipt = z.infer<typeof EvidenceReviewReceipt>;

export const ProgressionDecisionReceipt = z.object({
  receiptId: z.string().uuid(),
  by: z.string().min(1),
  at: z.string(),
  outcome: z.enum(["provisional_a", "outcome_b", "outcome_c"]),
  statement: z.string().min(1),
  basisHash: z.string().regex(/^[a-f0-9]{64}$/),
  evidenceReceiptId: z.string().uuid(),
});

export type ProgressionDecisionReceipt = z.infer<typeof ProgressionDecisionReceipt>;

export const M02Session = z.object({
  module: z.literal("02"),
  sessionId: SessionId,
  folder: FolderName,
  createdAt: z.string(),
  updatedAt: z.string(),
  stage: z.enum(M02_STAGES),
  // The M01 run this session is built on — verbatim authority, never
  // paraphrase.
  m01: z.object({ sessionId: SessionId, sealedAt: z.string(), outputsHash: z.string() }),
  route: RouteKind,
  routeStatus: z.enum(["proposed", "confirmed"]),
  routeReason: z.string().default(""),
  sector: SectorMatchInfo.nullable().default(null),
  research: z.object({
    draft: ResearchForm.nullable().default(null),
    confirmed: ResearchForm.nullable().default(null),
  }),
  // Every human act is attributable: who confirmed, when.
  confirmations: z.record(z.string(), Confirmation).default(() => ({})),
  evidenceReview: EvidenceReviewReceipt.nullable().default(null),
  progressionDecision: ProgressionDecisionReceipt.nullable().default(null),
  revisionRequest: z
    .object({
      revisionId: z.string().uuid(),
      finding: z.string().min(1),
      sourceRefs: z.array(z.string().min(1)),
      parentM04SessionId: SessionId.nullable(),
    })
    .nullable()
    .default(null),
  halt: DependencyNotice.nullable().default(null),
});

export type M02Session = z.infer<typeof M02Session>;

export function m02EvidenceBasisHash(
  recon: ReconLog,
  artifacts: ArtifactStore,
  collection: CollectionRecord,
): string {
  const basis = {
    m01Inputs: recon.m01Inputs,
    preconditions: recon.preconditions,
    secondVoice: recon.secondVoice,
    terrain: recon.terrain,
    gate1: recon.gate1,
    gate2: recon.gate2,
    gate3: recon.gate3,
    audienceAccess: recon.audienceAccess,
    gate4: recon.gate4,
    gate5: recon.gate5,
    gate6: recon.gate6,
    riskFlags: recon.riskFlags,
    artifacts,
    collection,
  };
  return createHash("sha256").update(JSON.stringify(basis)).digest("hex");
}

// ---------- collection.json — research collection lifecycle (Step 0b) ----------

export const CollectionState = z.enum([
  "not_started",
  "in_progress",
  "partial",
  "interrupted",
  "completed",
  "incomplete_access",
  "incomplete_timeout",
  "resumed",
  "superseded",
]);

export type CollectionState = z.infer<typeof CollectionState>;

export const ExpectedArtifact = z.object({
  kind: ArtifactKind,
  target: z.string(),
  detail: z.string().default(""),
});

export const CollectionRecord = z.object({
  collectionId: z.string(),
  state: CollectionState,
  cohort: z.string().default(""),
  geography: z.string().default(""),
  expected: z.array(ExpectedArtifact).default(() => []),
  // Stable event IDs + retrieval timestamps — pause/resume updates the
  // record idempotently rather than duplicating transitions.
  events: z
    .array(
      z.object({
        id: z.string(),
        at: z.string(),
        event: z.string(),
        detail: z.string().default(""),
      }),
    )
    .default(() => []),
  reviewTrigger: z.string().default(""),
  openedAt: z.string().nullable().default(null),
  updatedAt: z.string(),
});

export type CollectionRecord = z.infer<typeof CollectionRecord>;

// ---------- recon.json — the Reconnaissance Log ----------

// Section 0 carries Module 01 verbatim. Every gate verdict cites artifact IDs
// — that reference is what the entanglement check resolves.
export const GateVerdict = z.object({
  verdict: z.enum(["pending", "pass", "fail", "evidence-insufficient"]).default("pending"),
  artifactRefs: z.array(z.string()).default(() => []),
  confidence: z.enum(["high", "medium", "low"]).nullable().default(null),
  finding: z.string().default(""),
  assessedAt: z.string().nullable().default(null),
  confirmedBy: z.string().nullable().default(null),
});

export type GateVerdict = z.infer<typeof GateVerdict>;

// zod 4 .default() wants a full output value — each sub-schema below parses {}
// once to produce it.
const P2Verdict = GateVerdict.extend({
  segment: z.string().default(""),
  standingStrength: z.enum(["pending", "thin", "moderate", "strong"]).default("pending"),
});

const Preconditions = z.object({
  p1: GateVerdict.default(() => GateVerdict.parse({})),
  p2: P2Verdict.default(() => P2Verdict.parse({})),
  p3: GateVerdict.default(() => GateVerdict.parse({})),
});

const SecondVoice = z.object({
  foundersProblem: z.string().default(""),
  present: z.boolean().nullable().default(null),
  name: z.string().default(""),
  role: z.string().default(""),
  competingDiagnosis: z.string().default(""),
  converge: z.string().default(""),
  diverge: z.string().default(""),
  signal: z.string().default(""),
});

const Terrain = z.object({
  tam: z.string().default(""),
  trajectory: z.enum(["pending", "growing", "stable", "declining"]).default("pending"),
  tailwind: z.string().default(""),
  diagnosis: z
    .enum([
      "pending",
      "cyclical",
      "structural-positive",
      "structural-negative",
      "ambiguous-needs-evidence",
    ])
    .default("pending"),
  diagnosisEvidence: z.string().default(""),
  artifactRefs: z.array(z.string()).default(() => []),
});

const CompetitorDecode = z.object({
  competitor: z.string(),
  artifactRefs: z.array(z.string()).default(() => []),
  beliefs: z
    .array(
      z.object({
        belief: z.string(),
        confidence: z.enum(["high", "medium", "low"]),
        vulnerability: z.string().default(""),
      }),
    )
    .default(() => []),
});

const Gate1Section = GateVerdict.extend({
  decodes: z.array(CompetitorDecode).default(() => []),
  descriptiveDefault: z.string().default(""),
  cohort: z.string().default(""),
  concentration: z.enum(["pending", "competitive", "concentrated"]).default("pending"),
});

const Gate2Section = GateVerdict.extend({
  vulnerabilityEvidence: z.string().default(""),
  defendersCase: z.string().default(""),
  rebuttal: z.string().default(""),
});

const OwnedAuditRow = z.object({
  source: z.string(),
  size: z.string().default(""),
  read: z.enum(["yes", "no", "partial"]).default("no"),
  routing: z.enum(["gate-3-source", "reference", "not-relevant"]).default("not-relevant"),
  artifactRef: z.string().nullable().default(null),
});

const PainProfile = z.object({
  trigger: z.string().default(""),
  hack: z.string().default(""),
  pain: z.string().default(""),
  limitingBelief: z.string().default(""),
  traceToDefault: z.string().default(""),
});

const Gate3Section = GateVerdict.extend({
  ownedAudit: z.array(OwnedAuditRow).default(() => []),
  painProfile: PainProfile.default(() => PainProfile.parse({})),
});

const AudienceRow = z.object({
  segment: z.string(),
  channelClass: z.string().default(""),
  surface: z.string().default(""),
  observedBehaviour: z.string().default(""),
  usageMindset: z.string().default(""),
  commercialReachability: z
    .enum(["open", "permissioned", "paid", "partner-mediated", "restricted", "unknown"])
    .default("unknown"),
  evidence: z.string().default(""),
  confidence: z.enum(["high", "medium", "low", "unknown"]).default("unknown"),
  artifactRefs: z.array(z.string()).default(() => []),
});

const Gate4Section = GateVerdict.extend({
  priceRange: z.string().default(""),
  evidence: z.string().default(""),
});

const RiskAcknowledgment = z.object({
  line: z.string().default(""),
  signedBy: z.string().nullable().default(null),
  signedAt: z.string().nullable().default(null),
  declined: z.boolean().default(false),
  dispute: z.string().default(""),
});

const RiskRow = z.object({
  pattern: z.enum(["r1", "r2", "r3", "r4"]),
  state: z.enum(["pending", "present", "absent", "unclear"]).default("pending"),
  evidence: z.string().default(""),
  severity: z.enum(["manageable", "material", "critical"]).nullable().default(null),
  mitigationRouting: z.enum(["m03", "m04", "m11", "external"]).nullable().default(null),
  acknowledgment: RiskAcknowledgment.default(() => RiskAcknowledgment.parse({})),
});

const Gate5Section = z.object({ risks: z.array(RiskRow).default(() => []) });

const Gate6a = GateVerdict.extend({ implication: z.string().default("") });

const Gate6b = z.object({
  verdict: z.enum(["pending", "pass", "fail", "evidence-insufficient"]).default("pending"),
  traceSentence: z.string().default(""),
  standsWithoutTruth: z.boolean().nullable().default(null),
});

const Gate6Section = z.object({
  a: Gate6a.default(() => Gate6a.parse({})),
  b: Gate6b.default(() => Gate6b.parse({})),
});

const EntanglementSection = z.object({
  pass: z.boolean().nullable().default(null),
  problems: z.array(z.string()).default(() => []),
});

const ContrarianSection = z.object({
  flags: z.array(z.string()).default(() => []),
  clear: z.boolean().nullable().default(null),
});

const SynthesisSection = z.object({
  outcome: z
    .enum(["pending", "provisional_a", "validated_a", "outcome_b", "outcome_c"])
    .default("pending"),
  statement: z.string().default(""),
  acknowledgedRisks: z.array(z.string()).default(() => []),
});

const RuntimeState = z.object({
  runtime: z
    .enum([
      "collecting",
      "evidence_partial",
      "clarification_required",
      "provisional_a",
      "validated_a",
      "outcome_b",
      "outcome_c",
      "blocked_upstream",
      "failed_recoverable",
      "stale",
      "superseded",
    ])
    .default("collecting"),
  versionState: z.string().default("draft"),
  evidenceState: z.string().default("collecting"),
  approvalState: z.string().default("unapproved"),
  gateState: z.string().default("open"),
  relianceScope: z.string().default(""),
});

export const ReconLog = z.object({
  module: z.literal("02"),
  sessionId: SessionId,
  producedAt: z.string(),
  updatedAt: z.string(),

  // 0 — Module 01 inputs, verbatim.
  m01Inputs: z.object({
    sessionId: SessionId,
    sealedAt: z.string(),
    coreBelief: z.string(),
    brokenThing: z.string(),
    hiddenTruth: z.string(),
    marketDeployableHiddenTruth: z.string(),
    nonNegotiable: z.string(),
    hardWonTeaching: z.string(),
    legacy: z.string(),
    claimsBoundaryInputs: z.object({
      canClaim: z.array(z.string()),
      mustQualify: z.array(z.string()),
      cannotClaim: z.array(z.string()),
    }),
  }),

  // 1 — Builder preconditions: P1 capability, P2 standing (graduated), P3 alignment.
  preconditions: Preconditions.default(() => Preconditions.parse({})),

  // 1b — Second-Voice Diagnostic (informational, not a gate).
  secondVoice: SecondVoice.default(() => SecondVoice.parse({})),

  // 2 — Terrain Pre-Check + Cyclical-vs-Structural diagnosis.
  terrain: Terrain.default(() => Terrain.parse({})),

  // 3 — Gate 1: Descriptive Default per cohort.
  gate1: Gate1Section.default(() => Gate1Section.parse({})),

  // 4 — Gate 2: Default is Vulnerable (defender's case + evidence rebuttal).
  gate2: Gate2Section.default(() => Gate2Section.parse({})),

  // 5 — Gate 3: customer pain traced to Default; 5a owned-evidence audit first.
  gate3: Gate3Section.default(() => Gate3Section.parse({})),

  // 5c — Audience Access Evidence (typed input for Module 06; never channel picks).
  audienceAccess: z.array(AudienceRow).default(() => []),

  // 6 — Gate 4: willingness to pay at sustainable price.
  gate4: Gate4Section.default(() => Gate4Section.parse({})),

  // 7 — Gate 5 (Condition Gate): R1–R4 + signed acknowledgments. Cannot fail-route.
  gate5: Gate5Section.default(() => Gate5Section.parse({})),

  // 8 — Gate 6a + 6b: Hidden Truth evidenced + vacuum traces to THIS truth.
  gate6: Gate6Section.default(() => Gate6Section.parse({})),

  // 9 — Entanglement: Gates 2/3/6a on distinct sources.
  entanglement: EntanglementSection.default(() => EntanglementSection.parse({})),

  // 10 — Contrarian-trap audit.
  contrarianTrap: ContrarianSection.default(() => ContrarianSection.parse({})),

  // 11 — Synthesis + outcome.
  synthesis: SynthesisSection.default(() => SynthesisSection.parse({})),

  // 12 — Risk flags + runtime state.
  riskFlags: z.array(z.string()).default(() => []),
  state: RuntimeState.default(() => RuntimeState.parse({})),
});

export type ReconLog = z.infer<typeof ReconLog>;

export const M02SealReceipt = z.object({
  version: z.literal(1),
  module: z.literal("02"),
  status: z.literal("sealed"),
  receiptId: z.string().uuid(),
  sealHash: z.string().regex(/^[a-f0-9]{64}$/),
  sessionId: SessionId,
  folder: FolderName,
  sealedAt: z.string(),
  sealedBy: z.string().min(1),
  outcome: z.enum(["provisional_a", "outcome_b", "outcome_c"]),
  progressionDecision: ProgressionDecisionReceipt,
  evidenceReview: EvidenceReviewReceipt,
  upstream: z.object({
    m01: z.object({
      sessionId: SessionId,
      sealedAt: z.string(),
      outputsHash: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  }),
  hashes: z.object({
    session: z.string().regex(/^[a-f0-9]{64}$/),
    recon: z.string().regex(/^[a-f0-9]{64}$/),
    artifacts: z.string().regex(/^[a-f0-9]{64}$/),
    collection: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  snapshots: z.object({
    session: z.string(),
    recon: z.string(),
    artifacts: z.string(),
    collection: z.string(),
  }),
});

export type M02SealReceipt = z.infer<typeof M02SealReceipt>;

// ---------- builder-inputs → gates ----------

export const BuilderInputBody = z.object({
  p1: z.object({
    verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
    finding: z.string().default(""),
  }),
  p2: z.object({
    verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
    segment: z.string().default(""),
    standingStrength: z.enum(["thin", "moderate", "strong"]).nullable().default(null),
    finding: z.string().default(""),
  }),
  p3: z.object({
    verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
    finding: z.string().default(""),
  }),
  foundersProblem: z.string().min(1, "Record the founder's problem in their words"),
  secondVoice: z
    .object({
      present: z.boolean().nullable().default(null),
      name: z.string().default(""),
      role: z.string().default(""),
      competingDiagnosis: z.string().default(""),
      converge: z.string().default(""),
      diverge: z.string().default(""),
      signal: z.string().default(""),
    })
    .default(() => ({
      present: null,
      name: "",
      role: "",
      competingDiagnosis: "",
      converge: "",
      diverge: "",
      signal: "",
    })),
  ownedAudit: z
    .array(
      z.object({
        source: z.string().min(1, "Name the dataset"),
        size: z.string().default(""),
        read: z.enum(["yes", "no", "partial"]).default("no"),
        routing: z.enum(["gate-3-source", "reference", "not-relevant"]).default("not-relevant"),
        artifactRef: z.string().nullable().default(null),
      }),
    )
    .default(() => []),
});

export type BuilderInputBody = z.infer<typeof BuilderInputBody>;
