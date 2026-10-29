import { area, list, object, objectList, select, text, type StageDefinition } from "./types.js";

export const M12_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance: {
    label: "What the cycle decided",
    purpose: "Record the sealed cycle's exact quantities, owners, route, proof actions and thresholds. The gate compares them; M12 may not change a number.",
    fields: [
      objectList(
        "quantities",
        "Quantities and thresholds",
        [text("consequenceId", "Consequence id"), text("quantity", "Quantity"), text("threshold", "Threshold")],
        undefined,
        { minItems: 1 },
      ),
      objectList("owners", "Owners", [text("area", "Area"), text("owner", "Owner")], undefined, { minItems: 1 }),
      text("strategicRoute", "Strategic route"),
      list("proofActions", "Proof actions", undefined, { minItems: 1 }),
      text("reviewEvent", "Review event"),
      object("cycleVersion", "Cycle version", [text("versionId", "Version"), text("hash", "Hash")]),
      text("directionVersionId", "Direction version"),
    ],
  },
  assets: {
    label: "Assets",
    purpose: "The assets the work needs, their owner, and what a missing one blocks.",
    fields: [
      objectList(
        "assets",
        "Assets",
        [
          text("id", "ID"),
          text("name", "Name"),
          text("kind", "Kind"),
          select("state", "State", ["available", "needed", "missing", "external"]),
          text("owner", "Owner"),
          text("dependency", "Blocks"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  rhythm: {
    label: "Operating rhythm",
    purpose: "The weekly cadence, checkpoints, review forum and escalation.",
    fields: [
      text("weeklyCadence", "Weekly cadence"),
      objectList(
        "checkpoints",
        "Checkpoints",
        [text("name", "Name"), text("when", "When"), area("purpose", "Purpose")],
        undefined,
        { minItems: 1 },
      ),
      text("reviewForum", "Review forum"),
      area("escalation", "Escalation"),
    ],
  },
  schedule: {
    label: "Schedule",
    purpose: "Dated work items with owner, dependency and the proof each produces.",
    fields: [
      objectList(
        "items",
        "Items",
        [
          text("id", "ID"),
          text("consequenceId", "Consequence id"),
          area("work", "Work"),
          text("owner", "Owner"),
          text("start", "Start"),
          text("due", "Due"),
          text("dependency", "Dependency"),
          area("proofAction", "Proof action"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  response: {
    label: "When something slips",
    purpose: "The trigger, the response and its owner.",
    fields: [
      objectList(
        "protocols",
        "Protocols",
        [
          text("id", "ID"),
          area("trigger", "Trigger"),
          select("response", "Response", ["retry", "escalate", "descope", "stop"]),
          text("owner", "Owner"),
          text("note", "Note"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  scorecard: {
    label: "Scorecard",
    purpose: "Tracking measures tied to sealed-cycle consequences.",
    fields: [
      objectList(
        "measures",
        "Measures",
        [
          text("consequenceId", "Consequence id"),
          text("measure", "Measure"),
          text("target", "Target"),
          text("current", "Current"),
          text("source", "Source"),
          text("reviewCadence", "Review cadence"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  rules: {
    label: "Operating rules",
    purpose: "The rules, the definition of done, the quality bar and the handoff rule.",
    fields: [
      list("operatingRules", "Operating rules", undefined, { minItems: 1 }),
      area("definitionOfDone", "Definition of done"),
      area("qualityBar", "Quality bar"),
      area("handoffRule", "Handoff rule"),
    ],
  },
  checklist: {
    label: "Checklists",
    purpose: "Per-work-item ready and done criteria, and what blocks it.",
    fields: [
      objectList(
        "items",
        "Checklist items",
        [
          text("id", "ID"),
          text("work", "Work"),
          list("readyCriteria", "Ready criteria", undefined, { minItems: 1 }),
          list("doneCriteria", "Done criteria", undefined, { minItems: 1 }),
          text("blockedIf", "Blocked if"),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  transition: {
    label: "Close-out",
    purpose: "How the cycle closes, what it produces for review, what carries over and what starts the next one.",
    fields: [
      area("closeOut", "Close-out"),
      list("reviewInputs", "Review inputs", undefined, { minItems: 1 }),
      list("carryOver", "Carried over", undefined, { minItems: 1 }),
      text("nextCycleTrigger", "Next-cycle trigger"),
    ],
  },
};
