import { area, list, object, objectList, select, text, type StageDefinition } from "./types.js";

export const M08_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
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
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  mission: {
    label: "Mission",
    purpose: "The content mission, its audience and the belief shift it serves.",
    fields: [
      area("statement", "Statement"),
      text("audienceId", "Audience id"),
      area("beliefShift", "Belief shift"),
      area("purpose", "Purpose"),
    ],
  },
  pillars: {
    label: "Pillars",
    purpose: "At least three pillars, each anchored in the belief with a proof type.",
    fields: [
      objectList(
        "pillars",
        "Pillars",
        [
          text("id", "ID"),
          text("name", "Name"),
          area("beliefAnchor", "Belief anchor"),
          select("proofType", "Proof type", ["demonstration", "evidence", "teaching", "refusal"]),
          text("audience", "Audience"),
          area("rationale", "Rationale"),
        ],
        undefined,
        { minItems: 3 },
      ),
    ],
  },
  library: {
    label: "Library",
    purpose: "Assets against pillars, with evidence and honest state.",
    fields: [
      objectList(
        "assets",
        "Assets",
        [
          text("id", "ID"),
          text("title", "Title"),
          text("pillarId", "Pillar id"),
          text("format", "Format"),
          text("evidenceRef", "Evidence reference"),
          select("state", "State", ["planned", "drafted", "published", "retired"]),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  gaps: {
    label: "Proof gaps",
    purpose: "Real gaps with severity and a remedy.",
    fields: [
      objectList(
        "gaps",
        "Gaps",
        [
          text("id", "ID"),
          text("pillarId", "Pillar id"),
          area("missing", "What is missing"),
          area("why", "Why it matters"),
          select("severity", "Severity", ["blocking", "material", "minor"]),
          area("remedy", "Remedy"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  "sales-map": {
    label: "Content to objection map",
    purpose: "Each sales objection mapped to assets, with honest coverage.",
    fields: [
      objectList(
        "mappings",
        "Mappings",
        [
          text("id", "ID"),
          text("objectionId", "Objection id"),
          list("assetIds", "Asset ids", undefined, { minItems: 1 }),
          select("coverage", "Coverage", ["full", "partial", "none"]),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  claims: {
    label: "Claims",
    purpose: "Each claim classified against the inherited boundary.",
    fields: [
      objectList(
        "claims",
        "Claims",
        [
          text("id", "ID"),
          area("claim", "Claim"),
          select("boundary", "Boundary", ["can-claim", "must-qualify", "cannot-claim"]),
          text("evidenceRef", "Evidence reference"),
          area("approvedWording", "Approved wording"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  distribution: {
    label: "Distribution",
    purpose: "Channels with a pillar, cadence and owner.",
    fields: [
      objectList(
        "channels",
        "Channels",
        [text("id", "ID"), text("channel", "Channel"), text("pillarId", "Pillar id"), text("cadence", "Cadence"), text("owner", "Owner")],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  production: {
    label: "Production",
    purpose: "The production workflow, step by step.",
    fields: [
      objectList(
        "workflow",
        "Workflow",
        [text("stage", "Stage"), text("owner", "Owner"), text("input", "Input"), text("output", "Output"), text("sla", "Turnaround")],
        undefined,
        { minItems: 3 },
      ),
    ],
  },
  measures: {
    label: "Measures",
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
  operations: {
    label: "Operations",
    purpose: "Who runs content, how often, and where issues escalate.",
    fields: [
      text("owner", "Owner"),
      text("cadence", "Cadence"),
      text("reviewForum", "Review forum"),
      text("escalation", "Escalation"),
    ],
  },
  compliance: {
    label: "Compliance",
    purpose: "Each compliance check recorded honestly.",
    fields: [
      objectList(
        "checks",
        "Checks",
        [
          text("id", "ID"),
          text("item", "Item"),
          select("result", "Result", ["pass", "fail", "not-applicable"]),
          text("evidenceRef", "Evidence reference"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
};
