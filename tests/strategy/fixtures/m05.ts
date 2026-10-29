import { createHash, randomUUID } from "node:crypto";
import { M05_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/m05/source";
import type { SourceRecord } from "../../../src/lib/modules/strategy/server/data/repository";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const text = (value: string) => value;

export const DECLARATIONS = [
  "We publish the evidence behind every quality claim.",
  "We refuse paid placement in comparison content.",
  "We report outcomes every quarter whether or not they flatter us.",
];

const CONVICTIONS = {
  brokenThing: "The market rewards shallow proof.",
  hiddenTruth: "Buyers need observable evidence.",
  marketDeployableHiddenTruth: "Buyers choose evidence they can inspect.",
  nonNegotiable: "We will not make unsupported claims.",
  hardWonTeaching: "Proof must be visible in use.",
  legacy: "A market that trusts what it can verify.",
  coreBelief: "Visible proof changes buying decisions.",
};

const JOURNEY = {
  from: "Only large vendors can prove quality.",
  to: "Any buyer can inspect the evidence.",
  experientialChange: "Buyers compare published evidence before choosing.",
  experienceShape: "b2b-operational",
  discoveryMechanism: "A structured comparison of published proof.",
};

export function m05Chain(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const fingerprint = sha("synthetic-tuple");
  return {
    folder: "synthetic-brand",
    route: {
      version: 1,
      module: "05",
      route: "full",
      reason: "Synthetic route confirmation.",
      confirmedBy: "synthetic-operator",
      confirmedAt: "2026-10-29T12:00:00.000Z",
    },
    entry: {
      receipt: {
        version: 1,
        receiptId: "88888888-8888-4888-8888-888888888888",
        chainFingerprint: fingerprint,
        approvedBy: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
        approvedAt: "2026-10-29T12:00:00.000Z",
      },
    },
    bf: {
      sessionId: "99999999-9999-4999-8999-999999999999",
      seal: { versionId: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1", hash: sha("bf"), at: "2026-10-29T12:00:00.000Z" },
      gate: { downstreamGateState: "open", m05Permission: "granted", reasons: [] },
      approval: { response: "approve" },
      assessment: {},
      manifesto: {},
      document: {},
      handoff: {
        versionId: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        hash: sha("bf"),
        approvalState: "approved",
        downstream: {
          gate: "open",
          m05Permission: "granted",
          reasons: [],
          foundationRef: {
            runId: "99999999-9999-4999-8999-999999999999",
            versionId: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            hash: sha("bf"),
          },
        },
      },
      sources: {},
    },
    m04: {
      sessionId: "66666666-6666-4666-8666-666666666666",
      sealVersionId: "77777777-7777-4777-8777-777777777777",
      sealHash: sha("m04"),
      routeAuthorization: { authorised_capability: "full-standard" },
      data: {},
    },
    m03: { sessionId: "33333333-3333-4333-8333-333333333333", commitments: {}, sealReceipt: {} },
    m02: { sessionId: "22222222-2222-4222-8222-222222222222", recon: {}, sealReceipt: {} },
    m01: { sessionId: "11111111-1111-4111-8111-111111111111", outputs: {}, handoff: {} },
    ...overrides,
  };
}

export function m05Source(): SourceRecord {
  const body = m05Chain();
  // The fingerprint must match the tuple, exactly as the server derives it.
  const { chainFingerprint } = tupleFingerprint(body);
  (body.entry as { receipt: { chainFingerprint: string } }).receipt.chainFingerprint = chainFingerprint;
  return { id: randomUUID(), slot: M05_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

function tupleFingerprint(body: Record<string, unknown>) {
  const tuple = {
    bf: body.bf,
    m04: body.m04,
    m03: body.m03,
    m02: body.m02,
    m01: body.m01,
  };
  return { chainFingerprint: sha(JSON.stringify(tuple)) };
}

const meaning = (sourceWords: string, id: string) => ({
  id,
  sourceWords,
  sourceRef: "Synthetic source",
  interpretation: "Synthetic interpretation.",
  alternative: "Synthetic rejected alternative.",
  situation: "Synthetic recognition situation.",
  people: "Synthetic people.",
  action: "Synthetic action.",
  decision: "Synthetic decision.",
  consequence: "Synthetic consequence.",
  opposite: "Synthetic opposite.",
  boundary: "Synthetic boundary.",
  compression: "Synthetic compression.",
  repeatBack: "Synthetic repeat-back.",
  state: "confirmed" as const,
  owner: "Synthetic owner",
  confirmedBy: "Synthetic Owner",
  consumers: [],
  staleCondition: "Synthetic stale condition.",
});

export function m05Inheritance() {
  return {
    convictions: CONVICTIONS,
    journey: JOURNEY,
    claimsBoundary: { canClaim: ["Evidence can be inspected"], mustQualify: [], cannotClaim: [] },
    governingDeclarations: DECLARATIONS,
    foundationSummary: {
      business: "Synthetic Repair Co",
      plainTerms: "A repair business that publishes its evidence.",
      practicalOutcome: "Fewer repeat failures.",
      distinction: "Inspectable proof.",
      foundersUnderstanding: "Proof must be visible in use.",
    },
    permissionRecord: {
      permittedInterpretations: ["Inspectable proof"],
      prohibitedInterpretations: [],
      translationRights: "Client owns the wording.",
      compressionBoundary: "No compression of the declarations.",
      returnConditions: ["Source change"],
      ownershipBoundary: "Client owns the strategy.",
      approvalAuthority: "Client decision owner.",
      generationAuthority: "Operator with edit authority.",
    },
    engagementCheck: [
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
    ].map((field) => ({ field, disposition: "carry-forward" as const, sourceRef: "Synthetic", note: "" })),
    brandContext: {
      state: "refresh" as const,
      scope: "business" as const,
      namingScope: "",
      scopeBasis: "Synthetic basis.",
      existingEquity: "",
      protectedElements: [],
      openElements: [],
      equityEvidence: "",
      brandRights: { state: "established" as const, evidence: "Synthetic", owner: "Client" },
      owner: "Synthetic Owner",
    },
    suppliedAssets: [],
    meaningRecords: [
      ...(["brokenThing", "hiddenTruth", "marketDeployableHiddenTruth", "nonNegotiable", "hardWonTeaching"] as const).map(
        (key, index) => meaning(CONVICTIONS[key], `m-conviction-${index}`),
      ),
      meaning(JOURNEY.from, "m-journey-from"),
      meaning(JOURNEY.to, "m-journey-to"),
      ...DECLARATIONS.map((declaration, index) => meaning(declaration, `m-declaration-${index}`)),
    ],
  };
}

export function m05Semantic() {
  const levels = [
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
  return {
    items: [
      {
        id: "item-1",
        sourceId: "bf",
        sourceSection: "convictions",
        exactLanguage: CONVICTIONS.coreBelief,
        meaningRecordId: "m-conviction-0",
        confirmedMeaning: CONVICTIONS.coreBelief,
        semanticRole: "core belief",
        authorityLevel: "fixed-source" as const,
        mustPreserve: "exact" as const,
        mayTranslate: "no" as const,
        expressionPermission: "public-within-boundary" as const,
        promotionPermission: "gate-required" as const,
        promotionRequiresReason: true,
        publicCopyState: "fixed-authority" as const,
        headlinePermission: "gate-required" as const,
        knownBoundaries: ["No claim beyond the evidence"],
        evidenceState: "substantiated" as const,
        invalidationCondition: "Source change",
        recognitionCue: "Synthetic cue",
      },
    ],
    hierarchy: levels.map((level) => ({
      level,
      itemIds: level === "governing-identity" ? ["item-1"] : [],
      role: "inherited" as const,
      state: level === "governing-identity" ? ("derived" as const) : ("not-required" as const),
      note: "",
    })),
    collapsePoint: { level: null, itemId: "", reason: "" },
    promotions: [],
    adversarial: [],
    recognition: [],
    exactAuthorityCheck: {
      declarationsVerbatim: "pass" as const,
      coreBeliefFromOwner: "pass" as const,
      ownerFieldsVerbatim: "pass" as const,
      mislabelledInherited: [],
      unclassifiedLoadBearing: [],
    },
    recommendation: { state: "proceed" as const, reason: "Synthetic ledger is complete.", conditions: [] },
  };
}

export function m05Identity() {
  return {
    purpose: {
      statement: "Make proof inspectable.",
      whyItMatters: "Buyers cannot verify claims.",
      servesWhom: "Operations leads",
      costIfAbsent: "Repeat failures",
      usp: "Published evidence",
      competitorTest: "An opposite-belief vendor could not publish its failures.",
      proofPoints: ["Quarterly register"],
      evidenceBasis: "Sealed foundation",
    },
    vision: {
      statement: "A market that trusts what it can verify.",
      beliefDependency: "Inspectable proof",
      legacyAlignment: "Matches the legacy statement",
      horizons: [
        { horizon: "Year one", state: "Current", proofMilestone: "First register published" },
        { horizon: "Year three", state: "Planned", proofMilestone: "Cohort-level comparison" },
      ],
      nonPromises: ["We will not promise universal outcomes"],
      competitorTest: "Requires publishing failures",
    },
    values: [
      { name: "Inspectability", protects: "Buyer trust", rejects: "Unverifiable claims", behaviourEvidence: "Register published", expression: "Show the evidence" },
      { name: "Refusal", protects: "Independence", rejects: "Paid placement", behaviourEvidence: "Policy published", expression: "We do not sell placement" },
      { name: "Honesty", protects: "Credibility", rejects: "Cherry-picking", behaviourEvidence: "Failures reported", expression: "We report both" },
    ],
    worldBelief: "Buyers assume all claims are marketing.",
    customerBelief: "Only big vendors can prove quality.",
    brandBelief: "Inspectable proof changes buying decisions.",
    brandBeliefs: [
      { statement: "Inspectable proof changes buying decisions.", standing: "observed" as const, evidenceOrStanding: "Sealed market evidence" },
    ],
    beliefShift: { from: JOURNEY.from, to: JOURNEY.to, journeyDescription: JOURNEY.experientialChange },
  };
}

export function m05Audience() {
  const stages = ["unaware", "problem-aware", "solution-aware", "converted", "advocate"] as const;
  return {
    primary: {
      segment: "Operations leads at independent repair shops",
      situation: "Choosing a repair partner after a failure",
      currentBelief: "Only big vendors can prove quality",
      beliefOrigin: "Past experience",
      costOfBelief: "Repeat failures",
      readiness: "medium" as const,
      beliefTrigger: "A failed repair",
      desiredBelief: "Any buyer can inspect the evidence",
      problemInTheirWords: "We cannot tell who is actually good",
      reachableNow: "Yes",
      reachableHow: "Trade association list",
    },
    secondary: [],
    antiAudience: {
      who: "Price-only buyers",
      opposedBelief: "Price is the only signal",
      whyItCosts: "Margin erosion",
      costEvidence: "Synthetic",
      refusalBoundary: "We will not compete on price alone",
      handlingApproach: "Decline politely",
    },
    readinessSignals: [{ signal: "Asks for evidence", observable: "Request in sales call", source: "Synthetic" }],
    channels: [{ channel: "Trade association", whyBeliefReady: "Members already compare suppliers" }],
    journeyMap: stages.map((stage) => ({ stage, experience: `Synthetic ${stage} experience`, movesForward: "Evidence shown" })),
  };
}

export function m05Character() {
  const levels = ["unaware", "name-aware", "category-aware", "belief-aware", "belief-aligned"] as const;
  const tones = ["teaching", "celebrating", "addressing-problems", "handling-criticism", "refusing"] as const;
  return {
    awareness: {
      convictionIdeal: {
        thinkOfUs: "The one that shows its evidence",
        understandBelief: "Proof must be inspectable",
        describeToOthers: "They publish outcomes",
        feelAboutUs: "Trust",
        expectFromUs: "Evidence",
      },
      levels: levels.map((level) => ({ level, estimate: "Synthetic estimate", evidence: "Synthetic evidence" })),
      gaps: [{ gap: "Low awareness", kind: "external", priority: "high" as const }],
      barriers: [
        { barrier: "Scepticism", kind: "internal" as const },
        { barrier: "Habit", kind: "internal" as const },
        { barrier: "Budget cycles", kind: "external" as const },
      ],
      objectives: [{ objective: "Raise belief-aware share", fromLevel: "unaware", toLevel: "belief-aware", metric: "Share", timeline: "12 months" }],
    },
    personality: {
      traits: [
        { trait: "Plain-spoken", derivedFrom: "Belief", tooLittle: "Vague", justRight: "Direct", tooMuch: "Blunt", oppositeBeliefCouldClaim: false },
        { trait: "Evidence-first", derivedFrom: "Belief", tooLittle: "Assertive", justRight: "Shows proof", tooMuch: "Dry", oppositeBeliefCouldClaim: false },
        { trait: "Principled", derivedFrom: "Belief", tooLittle: "Flexible", justRight: "Refuses paid placement", tooMuch: "Rigid", oppositeBeliefCouldClaim: false },
      ],
      neverBehaviours: ["Never buys placement", "Never hides failures", "Never exaggerates", "Never mocks competitors"],
      scenarios: [
        { context: "A bad quarter", response: "Publish it", beliefConnection: "Honesty" },
        { context: "A vendor offers sponsorship", response: "Refuse", beliefConnection: "Refusal" },
        { context: "A competitor copies", response: "Publish more evidence", beliefConnection: "Inspectability" },
        { context: "A customer complains", response: "Show the record", beliefConnection: "Inspectability" },
      ],
    },
    voice: {
      attributes: [
        { attribute: "Plain", beliefConnection: "Proof must be readable" },
        { attribute: "Specific", beliefConnection: "Evidence is concrete" },
        { attribute: "Calm", beliefConnection: "No hype" },
        { attribute: "Direct", beliefConnection: "No evasion" },
      ],
      wordsWeUse: [
        { word: "evidence", reason: "Core" },
        { word: "published", reason: "Inspectable" },
        { word: "outcome", reason: "Concrete" },
      ],
      wordsWeAvoid: [
        { word: "revolutionary", contradicts: "No hype" },
        { word: "guaranteed", contradicts: "Claims boundary" },
        { word: "best-in-class", contradicts: "Evidence" },
      ],
      tones: tones.map((context) => ({ context, approach: `Synthetic ${context} approach` })),
      examples: [
        { context: "Teaching", text: "Here is how we check." },
        { context: "Celebrating", text: "The register is live." },
        { context: "Problems", text: "This quarter was worse." },
        { context: "Criticism", text: "That is fair; here is the record." },
      ],
      platforms: [{ platform: "Trade newsletter", register: "Plain", formatFit: "Short", voiceError: "Hype", example: "Evidence first." }],
    },
    attributes: {
      xFactor: {
        statement: "Published outcomes as a buying criterion.",
        beliefEnables: "Inspectable proof",
        competitorFriction: [
          { element: "Would have to publish failures", whyCostly: "Reputational" },
          { element: "Would have to stop paid placement", whyCostly: "Revenue" },
        ],
        frictionAcknowledgement: "A funded entrant could copy the register.",
        proof: "Quarterly register",
      },
      mapping: [
        { attribute: "Evidence index", tier: "conviction" as const, claimsStatus: "can-claim", proof: "Live" },
        { attribute: "Outcome register", tier: "value" as const, claimsStatus: "must-qualify", proof: "Quarterly" },
        { attribute: "Trade network", tier: "capability" as const, claimsStatus: "can-claim", proof: "Members" },
        { attribute: "Fast booking", tier: "table-stakes" as const, claimsStatus: "can-claim", proof: "System" },
      ],
      hierarchy: {
        primaryDifferentiators: ["Inspectable proof"],
        supporting: ["Trade network"],
        tableStakes: ["Fast booking"],
      },
      wholeDistinction: {
        candidate: "The repair partner that publishes its outcomes.",
        alternatives: [{ option: "The friendliest repair partner", rejectedWhy: "Copyable" }],
        verdict: "holds" as const,
        reason: "Requires publishing failures.",
      },
      personalBrandRitual: { applicable: "no" as const, ritual: "", timing: "", owner: "" },
    },
  };
}

export function m05Expression() {
  const beliefChecks = ["core-belief", "brand-beliefs", "values", "non-negotiables"] as const;
  const audienceChecks = ["primary-audience", "not-anti-audience", "belief-shift-language", "belief-ready-resonance"] as const;
  const refusals = [
    "claims-beyond-evidence",
    "competitor-language",
    "anti-audience-appeal",
    "belief-contradiction",
    "generic",
    "unkeepable-promise",
  ] as const;
  const claimsRules = ["verified-against-boundaries", "qualifiers-where-required", "no-cannot-claim", "approved-vocabulary"] as const;
  return {
    filter: {
      forRule: "For buyers who want evidence.",
      notForRule: "Not for price-only buyers.",
      question: "Does this show the evidence?",
      beliefChecks: beliefChecks.map((check) => ({ check, test: `Synthetic ${check} test` })),
      audienceChecks: audienceChecks.map((check) => ({ check, test: `Synthetic ${check} test` })),
      refusals: refusals.map((refusal) => ({ refusal, note: `Synthetic ${refusal} note` })),
      edgeCases: [
        { scenario: "A sponsored request", ruling: "Refuse" },
        { scenario: "A bad quarter", ruling: "Publish it" },
      ],
    },
    tagline: {
      state: "established" as const,
      primary: "Evidence you can inspect.",
      beliefExpressed: "Inspectable proof",
      desiredReaction: "Ask for the evidence",
      claimsStatus: "can-claim" as const,
      alternatives: [
        { tagline: "See the record.", context: "Trade press" },
        { tagline: "Proof, published.", context: "Website" },
      ],
      competitorTest: "An opposite-belief vendor could not publish its record.",
      voiceMatch: "Plain and direct",
      deferredReason: "",
      namingState: "retain" as const,
      namingReason: "Existing name retained",
    },
    visual: {
      direction: "Documentary plainness.",
      colours: [{ colour: "Ink", role: "Primary", beliefConnection: "Evidence" }],
      typography: [{ trait: "Readable", typeDirection: "Serif body" }],
      imagery: { style: "Documentary", beliefConnection: "Inspectable" },
      neverDo: ["No stock handshakes", "No gradients", "No superlatives", "No fake dashboards"],
      evidence: "Synthetic",
    },
    copywriting: {
      moves: [
        { name: "Show the record", when: "Any claim", example: "Here is the register." },
        { name: "Name the limit", when: "Any result", example: "This varied by cohort." },
      ],
      principles: ["Evidence first", "No hype", "Name the limit"],
      claimsRules: claimsRules.map((rule) => ({ rule, note: `Synthetic ${rule}` })),
      channelVariations: [{ channel: "Trade newsletter", rule: "Lead with the register" }],
    },
    assets: [],
  };
}

export function m05Synthesis() {
  const beats = ["world-as-it-was", "awakening", "discovery", "commitment", "building", "invitation", "vision"] as const;
  return {
    story: beats.map((beat) => ({
      beat,
      text: `Synthetic ${beat} text.`,
      beliefAtThisMoment: "Inspectable proof matters.",
      sourceRefs: ["bf:document"],
    })),
    core: {
      positioningStatement: "The repair partner that publishes its outcomes.",
      organisingIdea: "Evidence over assertion.",
      decisionSummary: "Commit to published outcomes and refuse paid placement.",
      driftGuards: ["No claim without a source"],
      convictionChecks: ["Does it show the evidence?", "Does it refuse placement?", "Does it name the limit?"],
    },
    traceability: [{ field: "positioning", sourceRefs: ["bf:manifesto"] }],
  };
}

export function m05Packet() {
  return {
    records: [
      {
        id: "decision-1",
        name: "Positioning statement",
        element: "synthesis",
        field: "core.positioningStatement",
        state: "resolved" as const,
        sourceRefs: ["bf:manifesto"],
        exactSource: "Inspectable proof changes buying decisions.",
        decision: "Position on inspectable proof.",
        boundary: "No claim beyond the evidence.",
        evidenceState: "approved-decision" as const,
        freedom: "bounded" as const,
        authorisedRange: "Within the claims boundary",
        renderRequirement: "render-required" as const,
        renderLocation: "core",
        renderValue: "The repair partner that publishes its outcomes.",
        wordingClass: "approved-compression" as const,
        resolutionState: "locked" as const,
        material: true,
        returnOwner: "",
        resolvedBy: "Synthetic Owner",
        resolvedAt: "2026-10-29T12:00:00.000Z",
      },
    ],
    builtFromHash: sha("packet-source"),
    builtAt: "2026-10-29T12:00:00.000Z",
  };
}

export function m05Review(candidateHash: string) {
  const lenses = [
    "recommendation-strength",
    "distinctiveness-copyability",
    "cost-refusal-courage",
    "audience-truth",
    "character-voice-reality",
    "expression-pressure",
    "downstream-survivability",
    "credibility-evidence-boundary",
  ] as const;
  return {
    reviewer: {
      identity: "synthetic-reviewer",
      model: "synthetic-model",
      independence: "valid" as const,
      independenceBasis: "Separate context from the drafting session.",
    },
    candidateHash,
    scopedHash: candidateHash,
    hashMatch: true,
    lenses: lenses.map((id) => ({ id, result: "pass" as const, note: "" })),
    findings: [],
    alternative: { offered: true, alternative: "A narrower proof-only position.", whyNotStronger: "It loses the buying criterion." },
    verdict: "pass" as const,
    verdictBasis: "The strategy is faithful to the record.",
    ranAt: "2026-10-29T12:00:00.000Z",
  };
}

export { text };
