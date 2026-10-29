import { area, list, object, objectList, select, text, type StageDefinition } from "./types.js";

export const M11_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inheritance: {
    label: "What the direction decided",
    purpose: "Record exactly what the sealed direction decided. M11 may not reinterpret it, and the gate compares this record against the direction.",
    fields: [
      area("outcome", "Outcome"),
      text("priorityAudience", "Priority audience"),
      text("strategicRoute", "Strategic route"),
      list("moveIds", "Move ids", undefined, { minItems: 1 }),
      area("firstPhaseObjective", "First-phase objective"),
      area("progressionCondition", "Progression condition"),
      list("exclusions", "Exclusions", undefined, { minItems: 1 }),
      list("activeConsequenceIds", "Active / First Phase consequences", undefined, { minItems: 1 }),
      object("claimsBoundary", "Claims boundary", [
        list("canClaim", "Can claim", undefined, { minItems: 1 }),
        list("mustQualify", "Must qualify"),
        list("cannotClaim", "Cannot claim"),
      ]),
      list("invalidationTriggers", "Invalidation triggers", undefined, { minItems: 1 }),
      object("directionVersion", "Direction version", [text("versionId", "Version"), text("hash", "Hash")]),
    ],
  },
  plans: {
    label: "First-phase plan",
    purpose: "What M11 owns: quantities, operational targets, capacity assumptions, ownership and thresholds — for Active / First Phase consequences only.",
    fields: [
      objectList(
        "plans",
        "Plans",
        [
          text("consequenceId", "Consequence id"),
          text("quantity", "Quantity"),
          area("operationalTarget", "Operational target"),
          area("capacityAssumption", "Capacity assumption"),
          text("owner", "Owner"),
          text("threshold", "Threshold"),
          area("thresholdRationale", "Why this threshold is useful now"),
        ],
        "One plan per Active / First Phase consequence; no others.",
        { minItems: 1 },
      ),
    ],
  },
  decision: {
    label: "Cycle commitment",
    purpose: "What this cycle commits, by whom, with what thresholds, and what it explicitly does not commit.",
    fields: [
      area("commitment", "Commitment"),
      object("committedBy", "Committed by", [text("name", "Name"), text("role", "Role"), text("authorityRef", "Authority reference")]),
      area("scope", "Scope"),
      list("thresholds", "Thresholds", undefined, { minItems: 1 }),
      area("reviewEvent", "Review event"),
      area("evidencePurpose", "Evidence purpose"),
      list("notCommitted", "Not committed", undefined, { minItems: 1 }),
    ],
  },
  actions: {
    label: "Actions",
    purpose: "Concrete actions with owner, window, dependency and the proof each produces.",
    fields: [
      objectList(
        "actions",
        "Actions",
        [
          text("id", "ID"),
          text("consequenceId", "Consequence id"),
          area("action", "Action"),
          text("owner", "Owner"),
          text("window", "Window"),
          text("dependency", "Dependency"),
          area("proofAction", "Proof action"),
          select("state", "State", ["planned", "in-progress", "done", "blocked"]),
        ],
        undefined,
        { minItems: 1 },
      ),
    ],
  },
  accountability: {
    label: "Accountability",
    purpose: "Owners by area, the operating cadence, escalation, and whether the direction was preserved.",
    fields: [
      objectList("owners", "Owners", [text("area", "Area"), text("owner", "Owner")], undefined, { minItems: 1 }),
      text("cadence", "Cadence"),
      area("escalation", "Escalation"),
      select("preservationCheck", "Direction preserved", ["preserved", "changed-with-authority", "unresolved"]),
      area("preservationNote", "Note (required when changed with authority)"),
    ],
  },
};
