import { area, list, object, objectList, select, text, type StageDefinition } from "./types.js";

const inheritance: StageDefinition = {
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
      undefined,
      { minItems: 1 },
    ),
  ],
};

export const M09_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance,
  direction: {
    label: "Direction",
    purpose: "The digital direction and the architecture principles it implies.",
    fields: [
      area("positioning", "Positioning"),
      area("audience", "Audience"),
      area("beliefShift", "Belief shift"),
      list("architecturePrinciples", "Architecture principles", undefined, { minItems: 3 }),
      list("constraints", "Constraints"),
    ],
  },
  destinations: {
    label: "Destinations",
    purpose: "At least two destinations, each with a purpose, audience, primary action and belief role.",
    fields: [
      objectList(
        "destinations",
        "Destinations",
        [
          text("id", "ID"),
          text("name", "Name"),
          area("purpose", "Purpose"),
          text("audienceId", "Audience id"),
          text("primaryAction", "Primary action"),
          area("beliefRole", "Belief role"),
        ],
        undefined,
        { minItems: 2 },
      ),
    ],
  },
  gates: {
    label: "Decisions",
    purpose: "Architecture decisions with the options considered and the evidence behind the choice.",
    fields: [
      objectList(
        "decisions",
        "Decisions",
        [
          text("id", "ID"),
          area("decision", "Decision"),
          list("options", "Options", undefined, { minItems: 2 }),
          text("chosen", "Chosen option"),
          area("rationale", "Rationale"),
          text("evidenceRef", "Evidence reference"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  comparison: {
    label: "Comparison",
    purpose: "Real competitors, with strength, weakness and the learning.",
    fields: [
      objectList(
        "competitors",
        "Competitors",
        [
          text("id", "ID"),
          text("name", "Name"),
          text("reference", "Reference"),
          area("strength", "Strength"),
          area("weakness", "Weakness"),
          area("learning", "Learning"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  briefs: {
    label: "Page briefs",
    purpose: "Each page brief with objective, audience, proof, sections and a measured primary action.",
    fields: [
      objectList(
        "briefs",
        "Briefs",
        [
          text("id", "ID"),
          text("destinationId", "Destination id"),
          area("objective", "Objective"),
          text("audience", "Audience"),
          area("proof", "Proof"),
          list("sections", "Sections", undefined, { minItems: 2 }),
          text("primaryAction", "Primary action"),
          text("measurementId", "Measurement id"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  measurement: {
    label: "Measurement",
    purpose: "At least two metrics with baseline, target, source and cadence.",
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
