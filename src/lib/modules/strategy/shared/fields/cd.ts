import { area, bool, list, object, objectList, select, text, type StageDefinition } from "./types.js";

const evidenceStates = ["absent", "hypothesis", "observed", "tested", "contradicted"] as const;

export const CD_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance: {
    label: "Inheritance",
    purpose: "What the direction inherits from the M05–M10 work, what it may select, and what it may not reopen.",
    fields: [
      list("inheritedDecisions", "Decisions the direction inherits", undefined, { minItems: 1 }),
      list("selectableOptions", "Options the direction may select", undefined, { minItems: 1 }),
      list("lockedFields", "Fields it may not reopen", undefined, { minItems: 1 }),
      object("claimsBoundary", "Claims boundary", [
        list("canClaim", "Can claim", undefined, { minItems: 1 }),
        list("mustQualify", "Must qualify"),
        list("cannotClaim", "Cannot claim"),
      ]),
      list("invalidationTriggers", "Invalidation triggers", undefined, { minItems: 1 }),
      objectList(
        "upstreamVersions",
        "Pinned upstream versions",
        [text("module", "Module"), text("sessionId", "Session"), text("versionId", "Version"), text("hash", "Hash")],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  horizon: {
    label: "Horizon",
    purpose: "The selected directional horizon, why it is proportionate, and the controlled cycle.",
    fields: [
      text("directionalHorizon", "Directional horizon"),
      area("horizonRationale", "Why this horizon"),
      area("longerTermAmbition", "Longer-term ambition (client-supplied only)"),
      text("evidenceCutoff", "Evidence cut-off"),
      text("cycleHorizon", "Controlled cycle"),
      area("proportionality", "Why this is proportionate to the live decision"),
    ],
  },
  recommendation: {
    label: "Recommendation",
    purpose: "One recommendation: outcome, priority audience, buying situation and required movement.",
    fields: [
      area("outcome", "Outcome"),
      text("priorityAudience", "Priority audience"),
      area("buyingSituation", "Buying situation"),
      area("requiredMovement", "Required commercial movement"),
    ],
  },
  route: {
    label: "Route",
    purpose: "The recommended route, a credible alternative and the trade-off accepted.",
    fields: [
      area("strategicRoute", "Recommended route"),
      area("credibleAlternative", "Credible alternative"),
      area("tradeoff", "Trade-off accepted"),
    ],
  },
  moves: {
    label: "Strategic moves",
    purpose: "Three to five joined strategic moves, each with its commercial job.",
    fields: [
      objectList(
        "moves",
        "Moves",
        [
          text("id", "ID"),
          text("name", "Name"),
          area("job", "Commercial job"),
          list("consequenceIds", "Consequences", undefined, { minItems: 1 }),
          select("evidenceState", "Evidence state", evidenceStates),
        ],
        undefined,
        { minItems: 3, maxItems: 5 },
      ),
    ],
  },
  sequence: {
    label: "Sequence",
    purpose: "A compact sequence with progression gates, the first phase and the review event.",
    fields: [
      objectList(
        "phases",
        "Phases",
        [text("phase", "Phase"), text("horizon", "Horizon"), list("work", "Work", undefined, { minItems: 1 }), area("progressionGate", "Progression gate")],
        undefined,
        { minItems: 1 },
      ),
      area("currentCycleObjective", "Current cycle objective"),
      area("firstPhaseObjective", "First phase objective"),
      area("progressionCondition", "Progression condition"),
      area("firstEvidenceEvent", "First evidence event"),
      area("reviewEvent", "Review event"),
    ],
  },
  portfolio: {
    label: "Implementation portfolio",
    purpose: "Every inherited consequence classified, with its reason, job, dependencies and owner.",
    fields: [
      objectList(
        "consequences",
        "Consequences",
        [
          text("id", "ID"),
          text("source", "Source"),
          select("classification", "Classification", [
            "active-first-phase",
            "next",
            "later",
            "conditional",
            "excluded-not-now",
            "not-required",
          ]),
          area("reason", "Upstream reason"),
          area("commercialJob", "Commercial job"),
          list("dependencies", "Dependencies"),
          select("evidenceState", "Evidence state", evidenceStates),
          text("capacityNote", "Capacity note"),
          text("owner", "Strategic owner"),
        ],
        "At least one consequence must be Active / First Phase.",
        { minItems: 1 },
      ),
    ],
  },
  exclusions: {
    label: "Exclusions",
    purpose: "What is excluded, what is deferred, and what would invalidate the direction.",
    fields: [
      list("exclusions", "Excluded", undefined, { minItems: 1 }),
      list("deferredAlternatives", "Deferred alternatives", undefined, { minItems: 1 }),
      list("invalidationTriggers", "Invalidation triggers", undefined, { minItems: 1 }),
    ],
  },
  evidence: {
    label: "Evidence",
    purpose: "Dimension-specific evidence, the core assumption, and whether a pre-cycle test is required.",
    fields: [
      objectList(
        "dimensions",
        "Evidence dimensions",
        [text("dimension", "Dimension"), select("state", "State", evidenceStates), text("note", "Note")],
        undefined,
        { minItems: 1 },
      ),
      area("coreAssumption", "Core assumption"),
      object("preCycleTest", "Pre-cycle test", [
        bool("required", "Required before the cycle"),
        text("id", "Identifier"),
        text("effect", "Effect (confirm / qualify / revise / invalidate / return-upstream)"),
        text("resolved", "Resolution"),
      ]),
    ],
  },
};
