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

const gridRows = (kind: "grid" | "proof") =>
  kind === "grid"
    ? objectList(
        "rows",
        "Grid rows",
        [
          select("action", "Action", ["question", "reject", "commit", "introduce"]),
          area("move", "Move"),
          area("beliefRationale", "Belief rationale"),
          area("proofCommitment", "Proof commitment"),
          area("operationalRule", "Operational rule"),
          area("specialisationSignal", "Public specialisation signal (question / reject)"),
          area("proofArtefactType", "Proof artefact type (commit / introduce)"),
          area("traceToBelief", "Trace to the core belief"),
        ],
        "One row per action.",
        { minItems: 4, maxItems: 4 },
      )
    : objectList(
        "rows",
        "Proof rows",
        [
          select("action", "Action", ["question", "reject", "commit", "introduce"]),
          area("product", "Product"),
          area("policy", "Policy"),
          area("story", "Story"),
          area("framework", "Framework"),
          select("proofEconomy", "Proof economy", ["discrete-at-cost", "compounding-public", "both"]),
          select("evidenceStatus", "Evidence status", ["supported", "prospective", "thin"]),
          area("claimBoundaryNote", "Claims-boundary note"),
          area("capturePlan", "Capture-and-review plan"),
        ],
        "One row per action.",
        { minItems: 4, maxItems: 4 },
      );

const frictionSources = [
  "beliefContradiction",
  "operationalChange",
  "culturalShift",
  "customerExplanation",
  "economicCost",
  "accumulatedProof",
  "specialistAuthority",
] as const;

export const M03_STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inputs: {
    label: "Review inputs",
    purpose: "Record whose problem-shape the positioning solves for, the commitment scope, and how the terrain shapes this run.",
    fields: [
      select("solvesFor", "Solves for", ["founder", "second_voice", "shared"]),
      area("solvesForNote", "Why that framing wins"),
      select("commitmentScope", "Commitment scope", [
        "business",
        "offer",
        "business_unit",
        "portfolio",
        "parent_brand",
        "sub_brand",
        "initiative",
      ]),
      area("scopeNote", "Scope note"),
      object("priorPositioning", "Prior positioning (optional input)", [
        bool("supplied", "Supplied"),
        text("source", "Source"),
        text("currentness", "Currentness"),
        area("text", "Material"),
        text("note", "Note"),
      ]),
      area("terrainRead", "Terrain read"),
    ],
  },
  challenge: {
    label: "Belief challenge",
    purpose: "Name the points where the conviction contradicts the market, and answer the contrarian check.",
    fields: [
      list("contradictions", "Points of contradiction", undefined, { minItems: 1 }),
      area("genuineVsContrarian", "Genuine difference or contrarianism?"),
    ],
  },
  journey: {
    label: "Belief shift journey",
    purpose: "The customer transformation the positioning enables.",
    fields: [
      area("from", "FROM belief"),
      area("to", "TO belief"),
      area("experientialChange", "Experiential change, in the customer's voice"),
      select("experienceShape", "Experience shape", [
        "product-physical",
        "community-relational",
        "b2b-operational",
        "knowledge",
      ]),
      area("discoveryMechanism", "Discovery mechanism"),
    ],
  },
  grid: {
    label: "Conviction grid",
    purpose: "Four moves that translate conviction into market position.",
    fields: [gridRows("grid")],
  },
  proof: {
    label: "Proof points",
    purpose: "For each move, the specific ways the belief will be demonstrated.",
    fields: [gridRows("proof")],
  },
  friction: {
    label: "Competitor friction",
    purpose: "What it would cost competitors to copy each move.",
    fields: [
      objectList(
        "rows",
        "Friction rows",
        [
          select("action", "Action", ["question", "reject", "commit", "introduce"]),
          object(
            "sources",
            "Friction sources",
            frictionSources.map((source) =>
              object(source, source, [
                select("level", "Level", ["high", "medium", "low"]),
                text("note", "Note"),
              ]),
            ),
          ),
        ],
        undefined,
        { minItems: 4, maxItems: 4 },
      ),
      text("lowestFrictionCompetitor", "Lowest-friction competitor"),
      area("lowestFrictionBasis", "What they would have to change"),
      area("threatAssessment", "Threat assessment"),
    ],
  },
  credibility: {
    label: "Market credibility",
    purpose: "Where the position stands in the market today.",
    fields: [
      area("referenceEvidence", "Independent reference evidence"),
      select("state", "State", ["credible", "credibility-gap", "not-yet-observable"]),
      area("cause", "Likely cause"),
      area("reviewCondition", "Review condition"),
    ],
  },
  confrontations: {
    label: "Honest confrontations",
    purpose: "Audit past behaviour against the belief, and name the future refusals.",
    fields: [
      objectList("pastAudit", "Past-behaviour audit", [
        area("item", "Item"),
        select("beliefSays", "Belief says this should happen", ["yes", "no"]),
        select("decision", "Decision", ["refine", "pivot", "undecided"], undefined, {
          optional: true,
          nullable: true,
        }),
        text("note", "Note"),
      ]),
      list("futureConfrontations", "Where we say no going forward"),
    ],
  },
  cost: {
    label: "Cost of commitment",
    purpose: "What this position actually costs.",
    fields: [list("costs", "Costs")],
  },
  advocate: {
    label: "Advocate challenges",
    purpose: "The strongest honest case against the position, with a verdict for each.",
    fields: [
      objectList(
        "challenges",
        "Challenges",
        [
          select("id", "Challenge", [
            "case-for-default",
            "funded-copycat",
            "positioning-vs-preference",
          ]),
          area("case", "Strongest honest case"),
          select("verdict", "Verdict", ["survives", "fails"]),
          text("note", "Note"),
        ],
        undefined,
        { minItems: 3, maxItems: 3 },
      ),
    ],
  },
  judgement: {
    label: "Strategic judgement",
    purpose: "The board-readable decision record.",
    fields: [
      list("optionsConsidered", "Options considered", undefined, { minItems: 2 }),
      area("recommendation", "Recommendation"),
      select("confidence", "Confidence", ["high", "moderate", "low"]),
      area("confidenceBasis", "Confidence basis"),
      object("commercialConsequences", "Commercial consequences", [
        area("ifHolds", "If the commitment holds"),
        area("ifNot", "If it does not"),
        area("ifNoDecision", "If no decision is made"),
      ]),
      area("reversalConditions", "What would change this advice"),
      area("integrityCheck", "Integrity check"),
      select("professionalCall", "Professional call", [
        "proceed",
        "proceed_conditionally",
        "gather_evidence",
        "return",
        "do_not_proceed",
      ]),
      area("nextWork", "Next work or return owner"),
    ],
  },
};

export const M03_OUTCOME_FIELDS = [
  select("outcome", "Outcome", ["a", "x"]),
  area("statement", "Outcome statement"),
  object(
    "returnDoc",
    "Return document (Outcome X)",
    [
      select("module", "Returns to", ["01", "02"]),
      area("refineWhat", "What needs refining"),
      area("evidenceProduced", "What this run produced"),
    ],
    undefined,
    { nullable: true },
  ),
];

export { nullableBool };
