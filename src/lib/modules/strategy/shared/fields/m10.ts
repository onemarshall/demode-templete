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

export const M10_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance,
  spatial: {
    label: "Spatial model",
    purpose: "The spatial principle, proportions, grid, density and hierarchy.",
    fields: [
      area("spatialPrinciple", "Principle"),
      list("proportions", "Proportions", undefined, { minItems: 1 }),
      text("grid", "Grid"),
      text("density", "Density"),
      area("hierarchyNotes", "Hierarchy"),
    ],
  },
  resonance: {
    label: "Resonance",
    purpose: "The elements that carry resonance and the belief they connect to.",
    fields: [
      objectList(
        "resonances",
        "Resonances",
        [text("id", "ID"), text("element", "Element"), area("beliefConnection", "Belief connection"), area("evidence", "Evidence")],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  behaviours: {
    label: "Behaviours",
    purpose: "At least three behaviours, each tied to a context and the belief.",
    fields: [
      objectList(
        "behaviours",
        "Behaviours",
        [text("id", "ID"), text("context", "Context"), area("behaviour", "Behaviour"), area("beliefConnection", "Belief connection")],
        undefined,
        { minItems: 3 },
      ),
    ],
  },
  context: {
    label: "Contexts",
    purpose: "At least two contexts with their constraints and adaptations.",
    fields: [
      objectList(
        "contexts",
        "Contexts",
        [text("id", "ID"), text("context", "Context"), list("constraints", "Constraints", undefined, { minItems: 1 }), area("adaptation", "Adaptation")],
        undefined,
        { minItems: 2 },
      ),
    ],
  },
  "operating-model": {
    label: "Operating model",
    purpose: "Who runs the identity system, how often, with what tooling and governance.",
    fields: [
      text("owner", "Owner"),
      text("cadence", "Cadence"),
      list("tooling", "Tooling", undefined, { minItems: 1 }),
      area("governance", "Governance"),
    ],
  },
  routes: {
    label: "Routes",
    purpose: "Each route names its audience, artefact and purpose.",
    fields: [
      objectList(
        "routes",
        "Routes",
        [text("id", "ID"), text("route", "Route"), text("audience", "Audience"), text("artefactId", "Artefact id"), area("purpose", "Purpose")],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  artefact: {
    label: "Artefacts",
    purpose: "Each artefact with format, purpose and honest state.",
    fields: [
      objectList(
        "artefacts",
        "Artefacts",
        [
          text("id", "ID"),
          text("name", "Name"),
          text("format", "Format"),
          area("purpose", "Purpose"),
          select("state", "State", ["planned", "drafted", "approved", "retired"]),
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
