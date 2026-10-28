/** Source-defined M04 classifications and reflection/bias rules. No score is invented. */

export const ECONOMIC_SELF_ASSESSMENT_QUESTIONS = [
  "Inventory / physical production? Do you hold inventory, manufacture physical goods, or carry significant per-unit production costs?",
  "Per-unit variable cost model? Is your business governed by cost-per-unit-sold economics (as opposed to time, subscription, community support, or patronage)?",
  "Pricing as primary lever? Is the price point a primary strategic variable you control and will iterate on?",
  "Recurring revenue / multi-period unit economics? Is the business governed by subscription, retainer, membership, or marketplace take-rate economics where CAC, LTV, churn, retention, or client concentration materially shape the decision?",
] as const;

export type EconomicDepth = "low" | "mixed" | "high" | "clarify";
export type SelfAssessmentAnswer = "yes" | "no" | "unknown" | "conflicted";

export interface EconomicDepthAssessment {
  classification: EconomicDepth;
  yes_count: number;
  answered_count: number;
  conservative_depth_required: boolean;
  interpretation: string;
}

/** The exact source thresholds: 3–4 high, 1–2 mixed, 0 low. Unknown never defaults low. */
export function classifyEconomicDepth(
  answers: readonly SelfAssessmentAnswer[],
): EconomicDepthAssessment {
  if (answers.length !== 4) {
    return {
      classification: "clarify",
      yes_count: answers.filter((answer) => answer === "yes").length,
      answered_count: answers.filter((answer) => answer === "yes" || answer === "no").length,
      conservative_depth_required: true,
      interpretation:
        "Exactly four source-defined business-model questions are required; missing questions cannot default to low depth.",
    };
  }
  const yes_count = answers.filter((answer) => answer === "yes").length;
  const answered_count = answers.filter((answer) => answer === "yes" || answer === "no").length;
  if (answered_count !== 4) {
    return {
      classification: "clarify",
      yes_count,
      answered_count,
      conservative_depth_required: true,
      interpretation:
        "At least one business-model question is unknown or conflicted; clarify or use conservative depth, never assume low.",
    };
  }
  if (yes_count >= 3) {
    return {
      classification: "high",
      yes_count,
      answered_count,
      conservative_depth_required: true,
      interpretation:
        "Three or four Yes answers: apply every economic mechanism that fits the model and material decision.",
    };
  }
  if (yes_count >= 1) {
    return {
      classification: "mixed",
      yes_count,
      answered_count,
      conservative_depth_required: false,
      interpretation:
        "One or two Yes answers: apply only mechanisms that match the actual cost structure.",
    };
  }
  return {
    classification: "low",
    yes_count,
    answered_count,
    conservative_depth_required: false,
    interpretation:
      "Zero Yes answers: reflection core and typed minimum financial grounding; no forced unit-economics machinery.",
  };
}

export type DecisionMateriality = "low" | "material" | "high_structural" | "unknown" | "conflicted";

export interface EconomicDepthPlan {
  classification: EconomicDepth;
  decision_materiality: DecisionMateriality;
  clarification_required: boolean;
  conservative_depth_required: boolean;
  requires_existing_value_transition_downside_reversibility_organisational_consequence: boolean;
  financial_markers: Array<{
    marker: string;
    applicability: "required" | "not_applicable" | "unresolved";
    reason: string;
  }>;
  limitations: string[];
}

export interface EconomicMarkerContext {
  self_assessment: readonly SelfAssessmentAnswer[];
  decision_materiality: DecisionMateriality;
  meaningful_unit_economics: boolean | null;
  material_assumptions_need_ranges: boolean | null;
  baseline_is_applicable: boolean | null;
  contribution_and_break_even_apply: boolean | null;
  material_driver_count: number | null;
  pricing_is_primary_lever: boolean | null;
  bounded_scenarios_are_decision_useful: boolean | null;
  external_risk_is_material: boolean | null;
  ongoing_financial_decisions_need_guardrails: boolean | null;
}

const MARKERS = [
  "M1. Unit economics defined",
  "M2. Assumptions documented with ranges",
  "M3. Baseline modelled where applicable",
  "M4. Contribution and break-even quantified",
  "M5. Sensitivity understood",
  "M6. Price bands examined where applicable",
  "M7. Scenarios bounded",
  "M8. External risks mapped",
  "M9. Decision guardrails recorded",
  "M10. Economic findings consolidated",
] as const;

/**
 * Applies source-defined four-question tiers and case-specific mechanism fit.
 * Materiality stays orthogonal and deepens consequence work even for a simple model.
 */
export function assessEconomicMarkerApplicability(
  context: EconomicMarkerContext,
): EconomicDepthPlan {
  const depth = classifyEconomicDepth(context.self_assessment);
  const materialityUnresolved =
    context.decision_materiality === "unknown" || context.decision_materiality === "conflicted";
  const deepConsequence =
    context.decision_materiality === "material" ||
    context.decision_materiality === "high_structural" ||
    materialityUnresolved;
  const unknownReasons: string[] = [];
  if (depth.classification === "clarify")
    unknownReasons.push(
      "Business-model complexity is missing or conflicted; use conservative depth until resolved.",
    );
  if (materialityUnresolved)
    unknownReasons.push(
      "Decision materiality is missing or conflicted; clarify or apply conservative analysis.",
    );

  const values: Array<boolean | null> = [
    context.meaningful_unit_economics,
    context.material_assumptions_need_ranges,
    context.baseline_is_applicable,
    context.contribution_and_break_even_apply,
    context.material_driver_count === null ? null : context.material_driver_count >= 5,
    context.pricing_is_primary_lever,
    context.bounded_scenarios_are_decision_useful,
    context.external_risk_is_material || deepConsequence,
    context.ongoing_financial_decisions_need_guardrails,
    true,
  ];
  const reasons = [
    "A meaningful business unit makes contribution and unit economics decision-useful.",
    "Use ranges for material estimates and hypotheses; an unknown remains explicit.",
    "A baseline is required only where a usable baseline applies to this decision.",
    "Contribution and break-even apply when the business has a defensible unit and cost structure.",
    "The source identifies sensitivity as typically unnecessary below five material financial drivers.",
    "Price bands apply when pricing is a primary lever or another explicit decision need exists.",
    "Use bounded scenarios where different coherent assumptions could change the decision.",
    "Scale external-risk transmission to relevant exposure and decision materiality.",
    "Decision guardrails apply when ongoing financial decisions require governance.",
    "Consolidate economic findings, materiality, consequences and reliance limits in the M04 handoff.",
  ];
  const financial_markers = MARKERS.map((marker, index) => {
    const applies = values[index];
    if (applies === null)
      return {
        marker,
        applicability: "unresolved" as const,
        reason: `Applicability is not established. ${reasons[index]}`,
      };
    if (applies) return { marker, applicability: "required" as const, reason: reasons[index] };
    return {
      marker,
      applicability: "not_applicable" as const,
      reason: `${reasons[index]} Record the specific mechanic or evidence gap that makes it not applicable; do not represent it as zero.`,
    };
  });
  return {
    classification: depth.classification,
    decision_materiality: context.decision_materiality,
    clarification_required: depth.classification === "clarify" || materialityUnresolved,
    conservative_depth_required: depth.conservative_depth_required || materialityUnresolved,
    requires_existing_value_transition_downside_reversibility_organisational_consequence:
      deepConsequence,
    financial_markers,
    limitations: unknownReasons,
  };
}

export const UNIVERSAL_AWARENESS_MARKERS = [
  {
    marker: "U1",
    name: "Financial Sustainability",
    question: "Can you sustain the gap between investment and revenue?",
    named: "Specific investment, gap length, funding source and a twice-as-long downside.",
    weighed: "Picture the gap lasting longer than planned and identify what you would do.",
    requires_weighed: true,
  },
  {
    marker: "U2",
    name: "Personal Sustainability",
    question: "Can you sustain the energy, time and emotional demands?",
    named: "Daily/weekly human and organisational load, relationships, health and commitments.",
    weighed: "Picture the worst sustained stretch and say whether to accept or change the plan.",
    requires_weighed: true,
  },
  {
    marker: "U3",
    name: "Time Reality",
    question: "How long before revenue, and can you sustain the gap?",
    named: "Timeline with explicit assumptions and education burden where applicable.",
    weighed: "Plan for slippage and state what happens if the timeline moves.",
    requires_weighed: true,
  },
  {
    marker: "U4",
    name: "Market Readiness",
    question: "Is this demand capture or demand creation?",
    named: "Capture/creation position grounded in M02 evidence and associated education burden.",
    weighed: "Consider what the actual education period asks of the people and resources involved.",
    requires_weighed: true,
  },
  {
    marker: "U5",
    name: "Cost Proportionality",
    question: "Is the effort proportional to the likely return?",
    named: "Specific opportunity cost and simpler version considered.",
    weighed:
      "Consider paying the opportunity cost now, rather than spreading it across imagined future.",
    requires_weighed: true,
  },
  {
    marker: "U6",
    name: "Alternative Paths",
    question: "Is there a simpler route to the same conviction?",
    named: "At least one concrete lower-cost or phased alternative, or why none exists.",
    weighed:
      "Give the alternative genuine consideration and record reason for rejection/selection.",
    requires_weighed: true,
  },
  {
    marker: "U7",
    name: "Conviction Cost Explicit",
    question: "What does the belief require that a generic competitor would skip?",
    named: "Specific conviction-driven cost in concrete units where supported.",
    weighed: "Decide willingness after seeing the cost, not before.",
    requires_weighed: true,
  },
  {
    marker: "U8",
    name: "More to Do Documented",
    question: "What work, cost, time or uncertainty did reflection surface?",
    named:
      "Written list of newly surfaced work, cost, time or uncertainty; an empty list is challenged.",
    weighed: "Synthesis marker; source does not require a separate U8 weighing test.",
    requires_weighed: false,
  },
] as const;

export interface AwarenessMarkerResponse {
  marker: string;
  named: boolean;
  weighed?: boolean;
  documented_more_to_do?: string[];
}

/** All eight markers are engaged; U1–U7 require both source-defined halves. */
export function checkAwarenessMarkerEngagement(responses: readonly AwarenessMarkerResponse[]) {
  const byMarker = new Map(responses.map((response) => [response.marker, response]));
  const missing: string[] = [];
  for (const definition of UNIVERSAL_AWARENESS_MARKERS) {
    const response = byMarker.get(definition.marker);
    if (
      !response ||
      !response.named ||
      (definition.requires_weighed && response.weighed !== true)
    ) {
      missing.push(definition.marker);
      continue;
    }
    if (
      definition.marker === "U8" &&
      (!response.documented_more_to_do || response.documented_more_to_do.length === 0)
    )
      missing.push("U8:documented-more-to-do");
  }
  return { complete: missing.length === 0, missing };
}

/** The eight exact Proceed-Informed bias signals in 04-Prompt v4.4. */
export interface ProceedBiasSignals {
  any_critical_acknowledged_m02_structural_risk: boolean | null;
  material_m02_r_pattern_count: number | null;
  m02_diagnosis_structural_negative: boolean | null;
  m02_diagnosis_cyclical: boolean | null;
  any_m02_structural_risk_disputed: boolean | null;
  m03_contrarian_trap_unresolved: boolean | null;
  m04_cost_materially_exceeds_m03_cost_estimate: boolean | null;
  can_sustain_gap_no_or_stretch: boolean | null;
}

export type ProceedBiasTilt = "none" | "adjust_the_path" | "wait_or_walk_away" | "unresolved";

export interface ProceedBiasAssessment {
  applicable_signal_count: number;
  applicable_signals: string[];
  unresolved_signal_count: number;
  tilt: ProceedBiasTilt;
  proceed_informed_requires_disconfirmation: boolean;
  proceed_informed_remains_human_available: true;
  proceed_informed_route_warning: boolean;
}

export function calculateProceedBiasTilt(
  signals: ProceedBiasSignals,
  selectedPath?: string,
): ProceedBiasAssessment {
  const unresolved_signal_count = [
    signals.any_critical_acknowledged_m02_structural_risk,
    signals.material_m02_r_pattern_count,
    signals.m02_diagnosis_structural_negative,
    signals.m02_diagnosis_cyclical,
    signals.any_m02_structural_risk_disputed,
    signals.m03_contrarian_trap_unresolved,
    signals.m04_cost_materially_exceeds_m03_cost_estimate,
    signals.can_sustain_gap_no_or_stretch,
  ].filter((value) => value === null).length;
  const applicable_signals = [
    ...(signals.any_critical_acknowledged_m02_structural_risk
      ? ["Any M02 Gate 5 acknowledged Structural Risk is Critical"]
      : []),
    ...(signals.material_m02_r_pattern_count !== null && signals.material_m02_r_pattern_count >= 2
      ? ["Two or more M02 Gate 5 R-patterns have Material severity"]
      : []),
    ...(signals.m02_diagnosis_structural_negative
      ? ["M02 Cyclical-vs-Structural Diagnosis is Structural-negative"]
      : []),
    ...(signals.m02_diagnosis_cyclical ? ["M02 Cyclical-vs-Structural Diagnosis is Cyclical"] : []),
    ...(signals.any_m02_structural_risk_disputed
      ? ["An M02 Structural Risk is Disputed rather than acknowledged"]
      : []),
    ...(signals.m03_contrarian_trap_unresolved
      ? ["M03 Contrarian Trap was raised and is unresolved"]
      : []),
    ...(signals.m04_cost_materially_exceeds_m03_cost_estimate
      ? ["Conversation 1 found M04 cost materially exceeds M03 Cost of Commitment"]
      : []),
    ...(signals.can_sustain_gap_no_or_stretch
      ? ["Conversation 4 sustain-gap answer is No or Stretch"]
      : []),
  ];
  const count = applicable_signals.length;
  const tilt: ProceedBiasTilt =
    unresolved_signal_count > 0
      ? "unresolved"
      : count === 0
        ? "none"
        : count <= 2
          ? "adjust_the_path"
          : "wait_or_walk_away";
  const proceededAgainstTilt = selectedPath === "Proceed Informed" && tilt !== "none";
  return {
    applicable_signal_count: count,
    applicable_signals,
    unresolved_signal_count,
    tilt,
    proceed_informed_requires_disconfirmation: proceededAgainstTilt,
    proceed_informed_remains_human_available: true,
    proceed_informed_route_warning: proceededAgainstTilt,
  };
}

export interface DisconfirmationParagraph {
  threshold: string;
  triggered_path: "Wait" | "Walk Away";
  findings: [string, string, string] | string[];
  proceeding_reason: string;
}

/** Inability to provide the three findings becomes a risk flag; never refuses the human decision. */
export function assessProceedDisconfirmation(
  assessment: ProceedBiasAssessment,
  paragraph: DisconfirmationParagraph | null,
) {
  if (!assessment.proceed_informed_requires_disconfirmation) {
    return {
      complete: true,
      risk_flag: false,
      human_decision_refused: false as const,
      limitations: [] as string[],
    };
  }
  const findings = paragraph?.findings.map((finding) => finding.trim()).filter(Boolean) ?? [];
  const complete = Boolean(
    paragraph &&
    paragraph.threshold.trim() &&
    paragraph.proceeding_reason.trim() &&
    findings.length === 3,
  );
  return {
    complete,
    risk_flag: !complete,
    human_decision_refused: false as const,
    limitations: complete
      ? []
      : [
          "The Proceed-Informed disconfirmation is incomplete; retain this as a Risk Flag. The human choice is not refused or converted into a system veto.",
        ],
  };
}
