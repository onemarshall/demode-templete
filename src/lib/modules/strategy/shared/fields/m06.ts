import {
  area,
  bool,
  list,
  object,
  objectList,
  select,
  text,
  type StageDefinition,
} from "./types.js";

const statementIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"] as const;

export const M06_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance: {
    label: "Inheritance",
    purpose: "Quote the inherited conviction, journey and declarations exactly, and record what each means.",
    fields: [
      object("convictions", "Convictions (verbatim)", [
        area("brokenThing", "The broken thing"),
        area("hiddenTruth", "The hidden truth"),
        area("marketDeployableHiddenTruth", "Market-deployable hidden truth"),
        area("nonNegotiable", "The non-negotiable"),
        area("hardWonTeaching", "The hard-won teaching"),
        area("legacy", "The legacy"),
        area("coreBelief", "Core belief"),
      ]),
      object("journey", "Belief shift journey (verbatim)", [area("from", "FROM"), area("to", "TO")]),
      object("claimsBoundary", "Claims boundary", [
        list("canClaim", "Can claim", undefined, { minItems: 1 }),
        list("mustQualify", "Must qualify"),
        list("cannotClaim", "Cannot claim"),
      ]),
      list("governingDeclarations", "Governing declarations", undefined, { minItems: 3, maxItems: 5 }),
      object("foundationSummary", "Foundation summary", [
        area("business", "What the business is"),
        area("practicalOutcome", "Practical outcome"),
        area("distinction", "Distinction"),
      ]),
      object("permissionRecord", "Permission record", [
        list("permittedInterpretations", "Permitted interpretations", undefined, { minItems: 1 }),
        list("prohibitedInterpretations", "Prohibited interpretations"),
        text("translationRights", "Translation rights"),
        text("compressionBoundary", "Compression boundary"),
        text("ownershipBoundary", "Ownership boundary"),
        text("generationAuthority", "Generation authority"),
      ]),
      objectList(
        "meaningRecords",
        "Meaning records",
        [
          text("id", "ID"),
          area("sourceWords", "Source words"),
          text("sourceRef", "Source reference"),
          area("interpretation", "Interpretation"),
          area("alternative", "Strongest rejected alternative"),
          area("situation", "Recognition situation"),
          area("boundary", "Boundary"),
          area("repeatBack", "Repeat-back confirmation"),
          select("state", "State", ["confirmed", "revision-requested", "not-established", "return-upstream"]),
          text("owner", "Owner"),
          text("confirmedBy", "Confirmed by"),
        ],
        "Cover the five convictions, both journey statements and every declaration.",
        { minItems: 1 },
      ),
    ],
  },
  foundation: {
    label: "Brand foundation",
    purpose: "Restate the foundation Marketing inherits from the sealed Brand Strategy.",
    fields: [
      area("brandPositioning", "Brand positioning"),
      area("brandPromise", "Brand promise"),
      object("manifestoSpine", "Manifesto spine", [
        area("see", "What we see"),
        area("reject", "What we reject"),
        area("believe", "What we believe"),
        area("protect", "What we protect"),
        area("choose", "What we choose"),
        area("intendToChange", "What we intend to change"),
        area("commitTo", "What we commit to"),
        area("becomesPossible", "What becomes possible"),
      ]),
      list("declarations", "Governing declarations", undefined, { minItems: 3, maxItems: 5 }),
      area("positioningBasis", "Positioning basis"),
    ],
  },
  audience: {
    label: "Belief-ready audience",
    purpose: "Segments and their belief position, taken from the inherited record.",
    fields: [
      text("primaryId", "Primary segment id"),
      objectList(
        "segments",
        "Segments",
        [
          text("id", "ID"),
          text("name", "Name"),
          select("beliefStage", "Belief stage", [
            "unaware",
            "problem-aware",
            "solution-aware",
            "belief-aware",
            "converted",
          ]),
          area("situation", "Situation"),
          area("currentBelief", "Current belief"),
          area("desiredBelief", "Desired belief"),
          text("reachableHow", "Reachable how"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  positioning: {
    label: "Brand positioning",
    purpose: "One position that traces to the belief, with a competitor test and a proof basis.",
    fields: [
      area("statement", "Positioning statement"),
      area("rationale", "Why it holds"),
      area("competitorTest", "Competitor test"),
      area("beliefTrace", "Belief trace"),
      area("proofBasis", "Proof basis"),
    ],
  },
  expressions: {
    label: "Belief-shift messaging",
    purpose: "All ten statements, including the three anchors, each traced and sourced.",
    fields: [
      objectList(
        "statements",
        "Statements",
        [
          select("id", "Statement", statementIds),
          area("text", "Text"),
          area("beliefTrace", "Belief trace"),
          list("sourceRefs", "Source references", undefined, { minItems: 1 }),
          bool("anchor", "Anchor statement"),
        ],
        "All ten statements are required, with s8–s10 marked as anchors.",
        { minItems: 10, maxItems: 10 },
      ),
    ],
  },
  routes: {
    label: "Channel strategy",
    purpose: "Channels with their function, disposition, audience and honest evidence confidence.",
    fields: [
      objectList(
        "routes",
        "Routes",
        [
          text("id", "ID"),
          text("channel", "Channel"),
          select("function", "Function", ["reach", "convince", "convert", "retain"]),
          select("disposition", "Disposition", ["primary", "supporting", "deferred", "excluded"]),
          text("audienceId", "Audience id"),
          select("evidenceConfidence", "Evidence confidence", ["high", "medium", "low", "unproven"]),
          area("rationale", "Rationale"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  activation: {
    label: "Implementation plan",
    purpose: "Sequence, owner, budget basis and the first three actions.",
    fields: [
      text("owner", "Owner"),
      list("sequence", "Sequence", undefined, { minItems: 1 }),
      area("budgetBasis", "Budget basis"),
      list("firstActions", "First actions", undefined, { minItems: 3 }),
    ],
  },
  measurement: {
    label: "Measurement",
    purpose: "At least two metrics, each with baseline, target, source and review cadence.",
    fields: [
      objectList(
        "metrics",
        "Metrics",
        [
          text("id", "ID"),
          text("metric", "Metric"),
          text("baseline", "Baseline"),
          text("target", "Target"),
          text("source", "Source"),
          text("reviewCadence", "Review cadence"),
        ],
        undefined,
        { minItems: 2 },
      ),
    ],
  },
};
