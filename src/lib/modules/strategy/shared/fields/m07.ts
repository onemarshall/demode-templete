import { area, bool, list, object, objectList, select, text, type StageDefinition } from "./types.js";

const statementIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

export const M07_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
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
  statements: {
    label: "Statements",
    purpose: "All eight statements, with the deployable and diagnostic split.",
    fields: [
      objectList(
        "statements",
        "Statements",
        [
          select("id", "Statement", statementIds),
          area("text", "Text"),
          area("beliefTrace", "Belief trace"),
          list("sourceRefs", "Source references", undefined, { minItems: 1 }),
          bool("deployable", "Deployable"),
        ],
        "s1, s4–s8 deploy; s2 and s3 are diagnostic.",
        { minItems: 8, maxItems: 8 },
      ),
    ],
  },
  qualification: {
    label: "Qualification",
    purpose: "Criteria with real tests, prospects with evidence, and the disqualification protocol.",
    fields: [
      objectList(
        "criteria",
        "Criteria",
        [text("id", "ID"), text("name", "Name"), area("test", "Test"), area("disqualifyIf", "Disqualify if")],
        undefined,
        { minItems: 2 },
      ),
      objectList(
        "prospects",
        "Prospects",
        [
          text("id", "ID"),
          text("name", "Name"),
          select("state", "State", ["belief-ready", "belief-curious", "belief-locked"]),
          area("evidence", "Evidence"),
        ],
        undefined,
        { minItems: 1 },
      ),
      object("protocol", "Disqualification protocol", [
        text("trigger", "Trigger"),
        area("response", "Response"),
        text("returnOwner", "Return owner"),
      ]),
    ],
  },
  conversation: {
    label: "Conversation",
    purpose: "Each conversation stage with purpose, opening, questions and exit criteria.",
    fields: [
      objectList(
        "stages",
        "Stages",
        [
          text("stage", "Stage"),
          area("purpose", "Purpose"),
          area("opening", "Opening"),
          list("questions", "Questions", undefined, { minItems: 1 }),
          area("exitCriteria", "Exit criteria"),
        ],
        undefined,
        { minItems: 3 },
      ),
    ],
  },
  objections: {
    label: "Objections",
    purpose: "Each objection with the belief behind it, the honest response and its evidence.",
    fields: [
      objectList(
        "objections",
        "Objections",
        [
          text("id", "ID"),
          area("objection", "Objection"),
          area("beliefBehind", "Belief behind it"),
          area("response", "Response"),
          text("evidenceRef", "Evidence reference"),
        ],
        undefined,
        { minItems: 3 },
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
  research: {
    label: "Open research",
    purpose: "The open questions, honestly recorded with method, owner and status.",
    fields: [
      objectList(
        "requests",
        "Research requests",
        [
          text("id", "ID"),
          area("question", "Question"),
          area("why", "Why it matters"),
          text("method", "Method"),
          text("owner", "Owner"),
          select("status", "Status", ["open", "in-progress", "answered", "abandoned"]),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
};
