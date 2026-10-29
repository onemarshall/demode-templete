import {
  area,
  bool,
  list,
  nullableBool,
  object,
  objectList,
  select,
  text,
  type StageDefinition,
} from "./types.js";

const verdict = (key = "verdict") =>
  select(key, "Verdict", ["pass", "fail", "evidence-insufficient"]);

const artifactRefs = () => list("artifactRefs", "Cited artifact IDs");

export const M02_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  setup: {
    label: "Research setup",
    purpose: "Draft the cohort and research scope, then confirm it. Competitor names and URLs are leads to verify, not findings.",
    fields: [
      object("research", "Research scope", [
        objectList("competitors", "Competitors", [
          text("name", "Name"),
          text("url", "URL"),
          text("note", "Research note"),
        ], undefined, { minItems: 1, maxItems: 8 }),
        text("cohort", "Cohort"),
        text("geography", "Geography"),
        list("platforms", "Platforms or sources"),
        text("sectorGuess", "Sector guess"),
        area("rationale", "Research rationale"),
      ]),
      select("route", "Route", ["full"]),
      area("routeReason", "Route reason"),
    ],
  },
  "builder-inputs": {
    label: "Builder and evidence inputs",
    purpose: "Record the prerequisites, the founder's problem in their words, and the owned-evidence audit.",
    fields: [
      object("inputs", "Builder inputs", [
        object("p1", "P1 capability", [verdict(), area("finding", "Finding")]),
        object("p2", "P2 standing", [
          verdict(),
          text("segment", "Segment"),
          select("standingStrength", "Standing strength", ["thin", "moderate", "strong"], undefined, { optional: true, nullable: true }),
          area("finding", "Finding"),
        ]),
        object("p3", "P3 alignment", [verdict(), area("finding", "Finding")]),
        area("foundersProblem", "Founder's problem, in their words"),
        object("secondVoice", "Second-voice diagnostic", [
          nullableBool("present", "Second voice present"),
          text("name", "Name"),
          text("role", "Role"),
          area("competingDiagnosis", "Competing diagnosis"),
          area("converge", "Where they converge"),
          area("diverge", "Where they diverge"),
          text("signal", "Signal"),
        ]),
        objectList("ownedAudit", "Owned-evidence audit", [
          text("source", "Dataset"),
          text("size", "Size or period"),
          select("read", "Read", ["yes", "no", "partial"]),
          select("routing", "Routing", ["gate-3-source", "reference", "not-relevant"]),
          text("artifactRef", "Artifact reference"),
        ]),
      ]),
    ],
  },
  "gate1-terrain": {
    label: "Terrain and Gate 1",
    purpose: "Assess the market terrain and decode the observed competitor defaults.",
    fields: [
      object("terrain", "Terrain", [
        area("tam", "TAM"),
        select("trajectory", "Trajectory", ["growing", "stable", "declining"], undefined, { optional: true, nullable: true }),
        area("tailwind", "Tailwind or headwind"),
        select("diagnosis", "Diagnosis", ["cyclical", "structural-positive", "structural-negative", "ambiguous-needs-evidence"]),
        area("diagnosisEvidence", "Diagnosis evidence"),
        artifactRefs(),
      ]),
      object("gate", "Gate 1", [
        objectList("decodes", "Competitor decodes", [
          text("competitor", "Competitor"),
          objectList("beliefs", "Beliefs", [
            area("belief", "Observed belief"),
            select("confidence", "Confidence", ["high", "medium", "low"]),
            area("vulnerability", "Vulnerability"),
          ]),
        ]),
        area("descriptiveDefault", "Descriptive default"),
        text("cohort", "Cohort"),
        select("concentration", "Concentration", ["competitive", "concentrated"]),
        verdict(),
        area("finding", "Finding"),
        artifactRefs(),
      ]),
    ],
  },
  gate2: {
    label: "Gate 2 — is the default vulnerable?",
    purpose: "Separate the defenders' strongest case from the evidence that the default fails in this cohort.",
    fields: [
      object("gate", "Gate 2", [
        area("vulnerabilityEvidence", "Vulnerability evidence"),
        area("defendersCase", "Defenders' case"),
        area("rebuttal", "Rebuttal"),
        artifactRefs(),
        verdict(),
        area("finding", "Finding"),
      ]),
    ],
  },
  gate3: {
    label: "Gate 3 — customer pain",
    purpose: "Trace a customer trigger and workaround to the default. Founder testimony alone cannot pass this gate.",
    fields: [
      object("gate", "Gate 3", [
        area("trigger", "Trigger"),
        area("hack", "Workaround or hack"),
        area("pain", "Observed pain"),
        area("limitingBelief", "Limiting belief"),
        area("traceToDefault", "Trace to the descriptive default"),
        artifactRefs(),
        verdict(),
        area("finding", "Finding"),
      ]),
    ],
  },
  gate4: {
    label: "Gate 4 — willingness to pay",
    purpose: "Evidence must show a sustainable price, not just interest or tolerance.",
    fields: [
      object("gate", "Gate 4", [
        area("priceRange", "Price range"),
        area("evidence", "Evidence"),
        artifactRefs(),
        verdict(),
        area("finding", "Finding"),
      ]),
    ],
  },
  gate5: {
    label: "Gate 5 — structural risk",
    purpose: "Record all four risk patterns, with routing and a signed acknowledgment or a recorded dispute.",
    fields: [
      object("gate", "Gate 5", [
        objectList(
          "risks",
          "Risks",
          [
            text("pattern", "Pattern"),
            select("state", "State", ["present", "absent", "unclear"]),
            area("evidence", "Evidence"),
            select("severity", "Severity", ["manageable", "material", "critical"], undefined, { optional: true, nullable: true }),
            select("mitigationRouting", "Mitigation route", ["m03", "m04", "m11", "external"], undefined, { optional: true, nullable: true }),
            object("acknowledgment", "Acknowledgment", [
              text("line", "Acknowledgment line"),
              text("signedBy", "Signed by"),
              text("signedAt", "Signed at"),
              bool("declined", "Dispute instead"),
              area("dispute", "Dispute"),
            ]),
          ],
          "All four patterns must be recorded.",
          { minItems: 4, maxItems: 4 },
        ),
      ]),
    ],
  },
  gate6: {
    label: "Gate 6 — hidden truth and trace",
    purpose: "Test whether the hidden truth is evidenced in this market and whether the vacuum traces to it.",
    fields: [
      object("gate", "Gate 6", [
        area("implication", "Market implication of the hidden truth"),
        area("traceSentence", "Trace sentence"),
        nullableBool("standsWithoutTruth", "Vacuum stands without the hidden truth"),
        artifactRefs(),
        select("verdictA", "Truth evidenced", ["pass", "fail", "evidence-insufficient"]),
        select("verdictB", "Vacuum traces to truth", ["pass", "fail", "evidence-insufficient"]),
        area("finding", "Finding"),
      ]),
    ],
  },
  review: {
    label: "Evidence judgment",
    purpose: "Review evidence adequacy separately from choosing the permitted progression outcome.",
    fields: [
      object("review", "Evidence review", [
        select("disposition", "Disposition", ["sufficient_for_provisional", "insufficient", "contested"]),
        area("rationale", "Rationale"),
      ]),
    ],
  },
  outcome: {
    label: "Progression outcome",
    purpose: "Choose one of the permitted outcomes for this record.",
    fields: [
      object("outcome", "Outcome", [
        select("outcome", "Outcome", ["provisional_a", "validated_a", "outcome_b", "outcome_c"]),
        area("statement", "Outcome statement"),
        list("contrarianFlags", "Contrarian flags"),
      ]),
    ],
  },
};

export { M02_STAGE_DEFINITIONS as M02_STAGES };
