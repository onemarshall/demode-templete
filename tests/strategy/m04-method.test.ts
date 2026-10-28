import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyEconomicDepth,
  assessEconomicMarkerApplicability,
  UNIVERSAL_AWARENESS_MARKERS,
  checkAwarenessMarkerEngagement,
  calculateProceedBiasTilt,
  assessProceedDisconfirmation,
} from "../../src/lib/modules/strategy/server/stages/m04/method";

describe("source-defined M04 method", () => {
  it("classifies four business-model answers and does not default unknown to low", () => {
    assert.equal(classifyEconomicDepth(["yes", "yes", "yes", "no"]).classification, "high");
    assert.equal(classifyEconomicDepth(["yes", "no", "no", "no"]).classification, "mixed");
    assert.equal(classifyEconomicDepth(["no", "no", "no", "no"]).classification, "low");
    const unresolved = classifyEconomicDepth(["no", "unknown", "no", "no"]);
    assert.equal(unresolved.classification, "clarify");
    assert.equal(unresolved.conservative_depth_required, true);
  });

  it("keeps economic mechanism applicability distinct from materiality", () => {
    const plan = assessEconomicMarkerApplicability({
      self_assessment: ["no", "no", "no", "no"],
      decision_materiality: "high_structural",
      meaningful_unit_economics: false,
      material_assumptions_need_ranges: true,
      baseline_is_applicable: false,
      contribution_and_break_even_apply: false,
      material_driver_count: 2,
      pricing_is_primary_lever: false,
      bounded_scenarios_are_decision_useful: false,
      external_risk_is_material: false,
      ongoing_financial_decisions_need_guardrails: false,
    });
    assert.equal(plan.classification, "low");
    assert.equal(
      plan.requires_existing_value_transition_downside_reversibility_organisational_consequence,
      true,
    );
    assert.equal(plan.financial_markers[0].applicability, "not_applicable");
    assert.equal(plan.financial_markers[9].applicability, "required");
    assert.equal(plan.financial_markers[7].applicability, "required");
  });

  it("requires U1–U7 named and weighed plus U8 surfaced work", () => {
    const complete = UNIVERSAL_AWARENESS_MARKERS.map((marker) => ({
      marker: marker.marker,
      named: true,
      weighed: marker.requires_weighed,
      documented_more_to_do: marker.marker === "U8" ? ["check cost"] : undefined,
    }));
    assert.equal(checkAwarenessMarkerEngagement(complete).complete, true);
    complete[0].weighed = false;
    complete[7].documented_more_to_do = [];
    assert.deepEqual(checkAwarenessMarkerEngagement(complete).missing, [
      "U1",
      "U8:documented-more-to-do",
    ]);
  });

  it("applies exact bias signal count thresholds without system veto", () => {
    const base = {
      any_critical_acknowledged_m02_structural_risk: false,
      material_m02_r_pattern_count: 0,
      m02_diagnosis_structural_negative: false,
      m02_diagnosis_cyclical: false,
      any_m02_structural_risk_disputed: false,
      m03_contrarian_trap_unresolved: false,
      m04_cost_materially_exceeds_m03_cost_estimate: false,
      can_sustain_gap_no_or_stretch: false,
    };
    assert.equal(calculateProceedBiasTilt(base, "Proceed Informed").tilt, "none");
    const two = calculateProceedBiasTilt(
      { ...base, material_m02_r_pattern_count: 2 },
      "Proceed Informed",
    );
    assert.equal(two.tilt, "adjust_the_path");
    assert.equal(two.proceed_informed_requires_disconfirmation, true);
    assert.equal(assessProceedDisconfirmation(two, null).risk_flag, true);
    assert.equal(assessProceedDisconfirmation(two, null).human_decision_refused, false);
    const three = calculateProceedBiasTilt({
      ...base,
      material_m02_r_pattern_count: 2,
      m02_diagnosis_cyclical: true,
      m02_diagnosis_structural_negative: true,
    });
    assert.equal(three.tilt, "wait_or_walk_away");
    const onePattern = calculateProceedBiasTilt({ ...base, material_m02_r_pattern_count: 1 });
    assert.equal(onePattern.applicable_signal_count, 0);
  });
});
