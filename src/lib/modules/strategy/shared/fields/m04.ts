/** Client-safe labels and input guidance for the M04 guided conversations. */
export type M04FieldKind =
  | "text"
  | "number"
  | "range"
  | "textarea"
  | "select"
  | "select-list"
  | "computed"
  | "boolean"
  | "nullable-boolean"
  | "list"
  | "object"
  | "object-list";
export interface M04Field {
  key: string;
  label: string;
  kind: M04FieldKind;
  help?: string;
  options?: readonly { value: string; label: string }[];
  fields?: readonly M04Field[];
  itemFields?: readonly M04Field[];
  /** Minimum number of items the schema allows — the editor enforces it. */
  minItems?: number;
  /** Maximum number of items the schema allows — the editor enforces it. */
  maxItems?: number;
  mirrorBoolean?: string;
  optional?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
}
export interface M04StageDefinition {
  label: string;
  conversation: string;
  purpose: string;
  fields: readonly M04Field[];
}

const select = (
  key: string,
  label: string,
  values: readonly string[],
  help?: string,
): M04Field => ({
  key,
  label,
  kind: "select",
  help,
  options: values.map((value) => ({
    value,
    label: value.replaceAll("-", " ").replaceAll("_", " "),
  })),
});
const text = (key: string, label: string, help?: string): M04Field => ({
  key,
  label,
  kind: "text",
  help,
});
const area = (key: string, label: string, help?: string): M04Field => ({
  key,
  label,
  kind: "textarea",
  help,
});
const list = (key: string, label: string, help?: string): M04Field => ({
  key,
  label,
  kind: "list",
  help,
});
const objectList = (
  key: string,
  label: string,
  itemFields: readonly M04Field[],
  help?: string,
): M04Field => ({ key, label, kind: "object-list", itemFields, help });
const objectField = (
  key: string,
  label: string,
  itemFields: readonly M04Field[],
  nullable = false,
  help?: string,
): M04Field => ({ key, label, kind: "object", itemFields, nullable, help });

const sourceBasisFields: M04Field[] = [
  text("id", "Source record ID"),
  text("sourceRef", "Source location"),
  area("wording", "Exact source wording"),
  text("owner", "Owning person or module"),
  text("date", "Date / version"),
  select("state", "Evidence state", ["confirmed", "reported", "inferred", "unknown", "conflicted"]),
  text("access", "Access basis"),
  text("consent", "Consent basis"),
  text("retention", "Retention basis"),
  text("quotationPermission", "Quotation permission"),
];

export const FIELD_DEFINITIONS: Record<string, M04StageDefinition> = {
  context: {
    label: "Business and decision context",
    conversation: "Before the five conversations",
    purpose:
      "Establish whose decision this is, what business is being considered, the team and stage, and the proportionality of the work. Record sources and conflicts before drawing conclusions.",
    fields: [
      text("decisionOwner", "Authorised decision owner"),
      text("authorityRef", "Decision authority reference"),
      select("operatingStage", "Business stage", [
        "pre-revenue",
        "operational-growing",
        "operational-stable",
        "operational-stuck",
        "unknown",
      ]),
      select("teamShape", "Team shape", ["solo", "family", "multiple-principals", "staff-bearing"]),
      list("principals", "Principals and relevant roles"),
      text("businessForm", "Current business form"),
      text("currentOffer", "Current offer"),
      text("plannedOffer", "Offer under consideration"),
      text("buyer", "Who pays"),
      text("user", "Who uses or receives it"),
      text("trigger", "Buying situation or trigger"),
      text("receives", "What the customer receives"),
      text("delivery", "How it is delivered or used"),
      text("geography", "Operating geography and routes"),
      text("customerOutcome", "Practical customer outcome"),
      text("distinction", "Source-backed distinction"),
      text("resources", "Current resources and capacity"),
      text("otherCommitments", "Other material commitments"),
      {
        key: "modelQuestions",
        label: "Business-model complexity questions",
        kind: "select-list",
        options: ["yes", "no", "unknown"].map((value) => ({ value, label: value })),
        help: "Answer in order: inventory/physical production; per-unit variable costs; pricing as a primary lever; recurring or multi-period economics. Unknown never defaults to low depth.",
      },
      {
        key: "complexity",
        label: "Business-model complexity",
        kind: "computed",
        help: "Derived from the four recorded business-model questions; unknown never defaults to low.",
      },
      list("mechanics", "Cost and revenue mechanics that apply"),
      select(
        "materiality",
        "Decision materiality",
        ["low", "material", "high_structural"],
        "If a decision-critical indicator is unknown or conflicted, use conservative material/high-structural depth and name the uncertainty. Never assume low materiality.",
      ),
      list("materialityIndicators", "Materiality indicators and evidence"),
      area(
        "existingValueAtRisk",
        "Existing value at risk",
        "For an existing business when materiality is not low: revenue, margin, customers, contracts, channels, capability or other exposed value.",
      ),
      area("transitionDownside", "Transition cost, downside and implementation failure"),
      text("reversibility", "Reversibility and cost of delay / inaction"),
      list("unknowns", "Unknown or conflicted business facts"),
      objectList("sourceBasis", "Source basis records", sourceBasisFields),
      objectList("conflicts", "Conflicts to preserve", [
        text("id", "Conflict ID"),
        area("leftVerbatim", "First source wording"),
        area("rightVerbatim", "Second source wording"),
        text("owner", "Owning source"),
        { key: "material", label: "Material conflict", kind: "boolean" },
        select("state", "Conflict state", ["open", "resolved", "returned"]),
        area("resolution", "Resolution record"),
      ]),
      objectList(
        "adaptations",
        "Approved adaptive interrogations",
        [
          select("rule", "Rule", ["M04-AQ-01", "M04-AQ-02", "M04-AQ-03", "M04-AQ-04"]),
          text("triggerSource", "Triggering source / finding"),
          text("findingDestination", "Existing finding destination"),
        ],
        "Only the four approved AQ rules may shape questions; record the rule, trigger and existing destination.",
      ),
    ],
  },
  "conviction-cost": {
    label: "Conviction cost",
    conversation: "1 · The Conviction Cost Surface",
    purpose:
      "Make specific costs visible that this commitment creates, compare them with M03, and preserve M03 ownership of any reconciliation.",
    fields: [
      objectList("rows", "Conviction-driven requirements", [
        text("commitmentId", "M03 commitment ID"),
        area("sourceWording", "Exact M03 commitment wording"),
        area("requirement", "What the conviction requires"),
        select("costType", "Cost pattern", ["front-loaded", "ongoing", "mixed"]),
        list("inputIds", "Typed economic input IDs"),
        area("costFinding", "Cost finding and units / range"),
        area("customerEffect", "Customer effect if removed"),
      ]),
      area("profitOnlyComparison", "What would change if optimised only for profit?"),
      select("comparison", "Comparison with M03 Cost of Commitment", [
        "agrees",
        "higher",
        "new-cost",
        "lower",
      ]),
      area("comparisonBasis", "Comparison basis"),
      area("contradiction", "Divergence / contradiction finding"),
      text("owner", "Reconciliation owner (M03 where required)"),
    ],
  },
  "market-readiness": {
    label: "Market reality",
    conversation: "2 · The Market Reality Check",
    purpose:
      "Distinguish demand capture from demand creation using the exact M02 evidence; do not revise the M02 finding here.",
    fields: [
      select("problemRecognition", "Problem recognition", ["high", "medium", "low", "unknown"]),
      select("spending", "Existing customer spending", ["existing", "adjacent", "new", "unknown"]),
      select("educationBurden", "Education burden", [
        "minimal",
        "moderate",
        "substantial",
        "unknown",
      ]),
      select("verdict", "Market readiness", ["capture", "creation", "mixed", "unknown"]),
      text("educationPeriod", "Education period before a response / revenue"),
      text("segmentSize", "M02 belief-ready segment size"),
      text("reachability", "Reachability"),
      text("growth", "Growth trajectory"),
      list("sourceRefs", "Exact M02 evidence references"),
      area("inheritedFinding", "Inherited M02 finding"),
      area("interpretation", "Economic and time implication"),
      {
        key: "changesMarketFinding",
        label: "Does this change the M02 market finding?",
        kind: "boolean",
        help: "If yes, stop and return the change to M02. M04 does not re-decide the market finding.",
      },
    ],
  },
  "human-load": {
    label: "Human and organisational load",
    conversation: "3 · The Human and Organisational Load Assessment",
    purpose:
      "Assess realistic time, energy, emotional, relational and opportunity costs for each principal, plus only the material organisational load.",
    fields: [
      objectList("principals", "Principal-by-principal assessment", [
        text("name", "Principal"),
        text("timeToRevenue", "Realistic time to revenue / traction"),
        select("gapSustainability", "Can this person sustain the gap?", [
          "yes",
          "stretch",
          "no",
          "unknown",
        ]),
        area("gapReason", "Why? Include what happens if it takes longer."),
        text("energySource", "Energy source and competing demands"),
        text("energySustainability", "Energy sustainability over time"),
        area("emotionalReadiness", "Emotional readiness under repeated setbacks"),
        area("relationshipImpact", "Relationship impact"),
        select("discussed", "Discussed with affected people?", ["yes", "no", "not-applicable"]),
        area("opportunityCost", "What this person is not doing"),
        area("simplerPath", "Simpler path considered"),
        area("whyThisPath", "Why this path"),
        text("capacity", "Available capacity and support"),
        text("breaksFirst", "What breaks first if delayed?"),
        text("testimonySource", "Testimony / capacity source"),
      ]),
      area(
        "organisationalLoad",
        "Material organisational load",
        "For staff-bearing or multi-team cases, record only relevant workload, capability, recruitment, retraining, change fatigue, governance and disruption.",
      ),
      { key: "supportGap", label: "Is there a material support or capacity gap?", kind: "boolean" },
      area("existingValueConsequences", "Existing-value consequences"),
    ],
  },
  "financial-grounding": {
    label: "Financial grounding",
    conversation: "4 · The Financial Grounding",
    purpose:
      "Use minimum decision-sufficient commercial facts and typed economic inputs. Apply only mechanisms justified by complexity and materiality; never turn unknown into zero.",
    fields: [
      {
        key: "inputs",
        label: "Typed economic inputs",
        kind: "object-list",
        help: "Each material number preserves exact source, owner, input type, unit, period, range, confidence, calculation use, derivation and review trigger. Unknown is null, never zero. Keep proposed, quoted, realised, competitor and modelled prices distinct.",
        itemFields: [
          text("input_id", "Input ID"),
          text("name", "Input name"),
          text("unit", "Unit"),
          text("period", "Period"),
          { ...text("currency", "Currency code (optional)"), optional: true },
          {
            ...select("price_role", "Price role (when this is a price)", [
              "proposed",
              "quoted",
              "realised",
              "competitor",
              "modelled",
            ]),
            optional: true,
          },
          select("input_type", "Evidence type", ["actual", "estimate", "hypothesis", "unknown"]),
          {
            key: "value_or_range",
            label: "Value or explicit range",
            kind: "range",
            help: "Unknown inputs remain null. Do not enter zero to represent an unknown.",
          },
          text("source_id", "Source ID"),
          text("source_ref", "Exact source reference"),
          text("source_date", "Source date"),
          text("owner", "Owner"),
          text("confidence", "Confidence and basis"),
          text("calculation_use", "Calculation use"),
          text("derivation", "Derivation / formula"),
          text("review_trigger", "Review trigger"),
          text("strategic_version", "Linked strategy version"),
        ],
      },
      objectList("calculations", "Economic calculations", [
        text("id", "Calculation ID"),
        text("kind", "Mechanism / calculation"),
        list("inputIds", "Input IDs used"),
        area("assumptions", "Assumptions"),
        text("formula", "Formula"),
      ]),
      objectList("mechanisms", "Proportional financial mechanisms M1–M10", [
        select("id", "Marker", ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"]),
        {
          ...select("disposition", "Applicability", ["applicable", "not-applicable", "unresolved"]),
          mirrorBoolean: "applicable",
        },
        area("reason", "Mechanic / materiality basis or not-applicable reason"),
        area("finding", "Finding"),
        list("inputIds", "Supporting input IDs"),
        text("limitation", "Limit / next evidence"),
      ]),
      area("economicFloor", "Economic floor and minimum sustainable condition"),
      area("convictionFloor", "Conviction floor"),
      area("biggestAssumption", "Biggest financial assumption"),
      area("evidence", "Evidence for the assumption"),
      area("ifWrong", "What changes if it is wrong?"),
      text("investmentLimit", "Investment / resource limit"),
      objectField("pricing", "Pricing Calibration Handoff", [
        select("state", "State", ["bounded", "not-yet-estimable", "not-applicable"]),
        area("finding", "Supported floor / range / limitation"),
        list("inputIds", "Economic input IDs"),
        area("conditions", "Unacceptable conditions and margin / capacity limits"),
        area("claimsBoundary", "Financial claims boundary"),
      ]),
      objectList("offers", "Offer feasibility findings", [
        text("suppliedOffer", "Supplied mechanic / offer"),
        text("source", "Source"),
        select("feasibility", "Feasibility", [
          "supported",
          "conditional",
          "not-yet-estimable",
          "not-applicable",
        ]),
        area("conditions", "Economic and full-cost basis / conditions"),
        area("exclusions", "Exclusions"),
      ]),
      objectField("bridge", "Demand Creation Bridge", [
        { key: "applicable", label: "Applicable", kind: "boolean" },
        area("job", "Strategic job"),
        area("resources", "Sustaining resources and time-to-response"),
        text("evidenceEvent", "Evidence event that shows movement"),
        text("owner", "Downstream owner"),
        area("limits", "Conviction-aligned limits"),
      ]),
    ],
  },
  "awareness-and-weighing": {
    label: "Awareness and weighing",
    conversation: "5 · The Informed Decision",
    purpose:
      "All eight awareness markers must be engaged. U1–U7 require both a named finding and a weighed consequence. U8 requires documented new work, cost, time or uncertainty. Allow reflection over 3–7 days before locking a response path.",
    fields: [
      objectList("markers", "Universal awareness markers", [
        select("id", "Marker", ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8"]),
        area("finding", "Named: what surfaced?"),
        area("consequence", "What this changes / exposes"),
        {
          key: "weighed",
          label: "Weighed after reflection",
          kind: "boolean",
          help: "U1–U7 require an honest consequence considered; U8 is the synthesis marker.",
        },
        area("consideration", "Weighed reflection and effect on plan / confidence"),
        list("sourceRefs", "Evidence / source references"),
        text("owner", "Owner"),
        area("moreToDo", "New work, cost, time or uncertainty (especially U8)"),
      ]),
      text("reflectionStarted", "Reflection started at"),
      text("returnedAt", "Return / review date (3–7 days)"),
      area("weighingAccount", "What changed after reflection?"),
      objectList("signals", "Proceed-Informed bias signals", [
        { ...text("id", "Signal ID"), readOnly: true },
        {
          key: "present",
          label: "Derived source state",
          kind: "boolean",
          readOnly: true,
          help: "This state is derived from the pinned M02/M03 evidence and confirmed M04 inputs. Unknown stays unresolved; do not override it here.",
        },
        { ...text("sourceRef", "Exact upstream / M04 source reference"), readOnly: true },
        { ...area("basis", "Evidence basis"), readOnly: true },
      ]),
      objectList("riskSatisfaction", "Acknowledged structural risk handling", [
        text("riskId", "Risk ID"),
        area("verbatim", "Exact risk wording"),
        select("state", "State", ["satisfied", "disputed", "return"]),
        area("decision", "Finding or disposition"),
        text("owner", "Owning module / person"),
        text("sourceRef", "Source reference"),
      ]),
      area("fullPicture", "Full financial, market, time, human and opportunity-cost picture"),
      area("proportionality", "Cost-to-market and resource proportionality"),
      area("simplerRoute", "Simpler or phased route considered"),
    ],
  },
  recommendation: {
    label: "Strategic recommendation",
    conversation: "Route Recommendation Memo",
    purpose:
      "Compare credible routes, make one evidence-bounded recommendation and present it for human review. Missing evidence can remain a bounded assumption; the recommendation never authorises itself.",
    fields: [
      objectList("routes", "Credible routes considered", [
        select("path", "Response path", [
          "proceed-informed",
          "adjust",
          "wait",
          "accept-constraint",
          "walk-away",
        ]),
        area("description", "Route and sequence"),
        area("conviction", "Conviction integrity"),
        area("marketSupport", "Market support"),
        area("capacity", "Capacity"),
        area("economics", "Economics"),
        area("humanLoad", "Human / organisational load"),
        area("reversibility", "Reversibility"),
        area("risk", "Risk and limits"),
      ]),
      area("unavailableAlternatives", "Unavailable or unsupported alternatives and why"),
      select("recommendedPath", "Recommended route", [
        "proceed-informed",
        "adjust",
        "wait",
        "accept-constraint",
        "walk-away",
      ]),
      area("recommendation", "Professional recommendation"),
      area("rationale", "Why this follows from M01–M04 evidence"),
      text("first", "What comes first"),
      text("second", "What comes second"),
      area("deferred", "What is deferred"),
      select("confidence", "Recommendation confidence", ["high", "moderate", "low"]),
      area("confidenceBasis", "Why this confidence level"),
      area("ifHolds", "Commercial consequences if it holds"),
      area("ifFails", "Commercial consequences if it fails"),
      area("ifNoDecision", "Commercial consequences if no decision is taken"),
      list("assumptions", "Assumptions"),
      list("unresolvedEvidence", "Unresolved evidence"),
      area("reversalConditions", "Conditions that change the recommendation"),
      area("integrityCheck", "Conviction / market-boundary / commitment integrity check"),
      area("professionalCall", "Direct professional guidance"),
      text("nextWork", "What is generated next if approved"),
      objectList("meaningRecords", "Meaning records", [
        text("id", "Meaning ID"),
        area("sourceWords", "Source wording"),
        text("sourceRef", "Source reference"),
        area("interpretation", "Interpretation"),
        area("alternative", "Alternative reading"),
        area("situation", "Situation"),
        area("people", "People affected"),
        area("action", "Action"),
        area("decision", "Decision"),
        area("consequence", "Consequence"),
        area("opposite", "What could be opposite"),
        area("boundary", "Boundary"),
        area("compression", "Compressed meaning"),
        area("repeatBack", "Repeat-back in client language"),
        select("state", "State", [
          "confirmed",
          "revision-requested",
          "not-established",
          "return-upstream",
        ]),
        text("owner", "Owner"),
      ]),
      objectList("accountability", "Decision accountability and measurement", [
        text("id", "Decision ID"),
        area("decision", "Decision"),
        area("observableEffect", "Observable effect"),
        area("evidence", "Evidence"),
        area("contradiction", "Possible contradiction"),
        objectList("assumptions", "Assumptions with owner, test, expiry and review", [
          text("id", "Assumption ID"),
          area("statement", "Assumption"),
          select("type", "Type", ["estimate", "hypothesis", "unknown"]),
          area("test", "Test"),
          text("owner", "Owner"),
          text("expiry", "Expiry"),
          text("review", "Review"),
        ]),
        objectList("consequences", "Required, deferred or prohibited work", [
          text("id", "Work ID"),
          area("work", "Work"),
          select("state", "State", [
            "required",
            "optional",
            "conditional",
            "deferred",
            "prohibited",
          ]),
          text("owner", "Owner"),
          text("dependency", "Dependency"),
        ]),
        objectList("costDrivers", "Cost drivers", [
          text("id", "Cost driver ID"),
          area("workUnit", "Work unit"),
          area("quantityBasis", "Quantity basis"),
          area("estimatePermission", "Estimate permission"),
          area("limitation", "Limitation"),
        ]),
        objectField("measurement", "Measurement contract", [
          area("implementationProof", "Implementation proof"),
          area("baseline", "Baseline"),
          area("qualitativeEvidence", "Qualitative evidence"),
          area("quantitativeEvidence", "Quantitative evidence"),
          text("owner", "Owner"),
          text("horizon", "Horizon"),
          area("attributionCeiling", "Attribution ceiling"),
          area("review", "Review"),
          area("strong", "Strong evidence"),
          area("partial", "Partial evidence"),
          area("weak", "Weak evidence"),
          area("stop", "Stop condition"),
          area("returnPoint", "Return point"),
        ]),
      ]),
    ],
  },
  "human-decision": {
    label: "Human route decision",
    conversation: "Authorised human decision",
    purpose:
      "Record a separate human decision after presentation of the exact recommendation version. Compare or return leaves the route unauthorised. Permitted overrides preserve evidence limits, risk acceptance and review conditions.",
    fields: [
      select("response", "Decision about the recommendation", [
        "accept",
        "override",
        "compare",
        "revise",
        "return-upstream",
      ]),
      select("path", "Human-selected response path", [
        "proceed-informed",
        "adjust",
        "wait",
        "accept-constraint",
        "walk-away",
      ]),
      {
        key: "memoHash",
        label: "Presented recommendation version",
        kind: "computed",
        help: "Filled from the exact recommendation presentation recorded above. This is not typed or edited by the human decision maker.",
      },
      area("rationale", "Decision rationale"),
      {
        key: "allowedOutputs",
        label: "Capability ceiling",
        kind: "computed",
        help: "Derived automatically from your response and route. Compare, revise, return, wait, walk-away and adjust grant no outputs; Proceed Informed permits M04 hypothesis analysis only; an accepted named constraint permits only that named reduced capability.",
      },
      list("deferredOutputs", "Deferred outputs"),
      list("prohibitedOutputs", "Prohibited outputs"),
      text("reducedName", "Named reduced capability (if applicable)"),
      text("reviewDate", "Review date"),
      text("expiry", "Expiry"),
      text("reEntryTrigger", "Re-entry trigger"),
      text("closureCondition", "Closure condition"),
      area(
        "disconfirmation",
        "Proceed-Informed disconfirmation paragraph",
        "Required when selecting Proceed Informed against a system tilt. Name specific thresholds and the findings that would switch the route.",
      ),
      list("switchFindings", "Specific findings that would trigger a switch"),
      text("inabilityReason", "If unable to disconfirm, explain; this remains a risk flag"),
      { ...select("returnOwner", "Upstream return owner", ["m01", "m02", "m03"]), nullable: true },
      text("changedPremise", "Exact premise to be changed upstream"),
      objectField(
        "override",
        "Commercial override record",
        [
          area("scope", "Override scope"),
          list("acceptedRisks", "Accepted risks"),
          area("evidenceLimits", "Evidence limitations"),
          text("reviewCondition", "Review condition"),
          text("expiry", "Override expiry"),
        ],
        true,
      ),
    ],
  },
};
