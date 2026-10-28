import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateFinancialGrounding,
  deriveProceedBiasSignals,
  PROCEED_BIAS_SIGNAL_IDS,
} from "../../src/lib/modules/strategy/server/stages/m04/validation";
import { calculateProceedBiasTilt } from "../../src/lib/modules/strategy/server/stages/m04/method";

const context = (modelQuestions = ["no", "no", "no", "no"], complexity = "low") => ({
  decisionOwner: "Founder",
  authorityRef: "authority:founder",
  operatingStage: "pre-revenue",
  teamShape: "solo",
  principals: ["Founder"],
  businessForm: "sole trader",
  currentOffer: "none",
  plannedOffer: "service",
  buyer: "buyer",
  user: "user",
  trigger: "trigger",
  receives: "service",
  delivery: "remote",
  geography: "UK",
  customerOutcome: "outcome",
  distinction: "distinction",
  resources: "resources",
  otherCommitments: "commitments",
  modelQuestions,
  complexity,
  mechanics: ["service"],
  materiality: "material",
  materialityIndicators: ["runway"],
  existingValueAtRisk: "time",
  transitionDownside: "lost time",
  reversibility: "reversible",
  unknowns: [],
  sourceBasis: [
    {
      id: "basis",
      sourceRef: "brief",
      wording: "Authority and scope",
      owner: "Founder",
      date: "2026-10-13",
      state: "confirmed",
      access: "provided",
      consent: "provided",
      retention: "local",
      quotationPermission: "internal",
    },
  ],
});
const grounding = (
  disposition: "applicable" | "not-applicable" | "unresolved" = "not-applicable",
) => ({
  inputs: [],
  calculations: [],
  mechanisms: Array.from({ length: 10 }, (_, i) => ({
    id: `M${i + 1}`,
    applicable: i === 9 || disposition === "applicable",
    disposition: i === 9 ? "applicable" : disposition,
    reason: "case fit reviewed",
    finding: "recorded disposition",
    inputIds: [],
    limitation: "not applicable or no separate calculation",
  })),
  economicFloor: "not yet estimable",
  convictionFloor: "not yet estimable",
  biggestAssumption: "unknown",
  evidence: "evidence boundary",
  ifWrong: "review",
  investmentLimit: "none",
  pricing: {
    state: "not-yet-estimable",
    finding: "not set",
    inputIds: [],
    conditions: "none",
    claimsBoundary: "no claim",
  },
  offers: [],
  bridge: {
    applicable: false,
    job: "none",
    resources: "none",
    evidenceEvent: "none",
    owner: "Founder",
    limits: "none",
  },
});

describe("M04 validation and source-derived bias ledger", () => {
  it("validates evidence and leaves unresolved mechanism decisions in needs-review", () => {
    const result = validateFinancialGrounding(context(), grounding("unresolved"));
    assert.equal(result.status, "needs-review");
    assert.deepEqual(result.unresolvedMechanisms, [
      "M1",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "M7",
      "M8",
      "M9",
    ]);
    assert.throws(
      () => validateFinancialGrounding(context(["yes", "no", "no", "no"], "low"), grounding()),
      /must match/,
    );
  });

  it("rejects a false N/A/applicable conflict and requires M10 consolidation", () => {
    const conflict = grounding();
    conflict.mechanisms[0].applicable = true;
    assert.throws(
      () => validateFinancialGrounding(context(), conflict),
      /cannot be both applicable and not applicable/,
    );
    const missingM10 = grounding();
    missingM10.mechanisms[9].disposition = "unresolved";
    missingM10.mechanisms[9].applicable = false;
    assert.throws(() => validateFinancialGrounding(context(), missingM10), /M10 consolidation/);
  });

  it("derives the exact eight signals and preserves incomplete sources as unresolved", () => {
    const complete = deriveProceedBiasSignals({
      m02Recon: {
        terrain: { diagnosis: "structural-negative" },
        gate5: {
          risks: [
            {
              pattern: "r1",
              state: "present",
              severity: "critical",
              acknowledgment: { line: "ack", signedBy: "Founder", signedAt: "date" },
            },
            {
              pattern: "r2",
              state: "present",
              severity: "material",
              acknowledgment: { line: "ack", signedBy: "Founder", signedAt: "date" },
            },
            {
              pattern: "r3",
              state: "present",
              severity: "material",
              acknowledgment: { line: "ack", signedBy: "Founder", signedAt: "date" },
            },
            { pattern: "r4", state: "absent", severity: null, acknowledgment: {} },
          ],
        },
      },
      m03Commitments: { upstream: { carriedForward: { contrarianFlags: ["unresolved trap"] } } },
      humanLoad: {
        principals: [{ gapSustainability: "stretch", testimonySource: "human-load:founder" }],
      },
      costComparison: {
        materiallyExceeds: true,
        sourceRef: "m04.conviction-cost",
        basis: "Conversation 1 comparison: materially exceeds prior estimate.",
      },
    });
    assert.deepEqual(
      complete.records.map((signal) => signal.id),
      PROCEED_BIAS_SIGNAL_IDS,
    );
    assert.equal(complete.unresolved.length, 0);
    assert.equal(Object.values(complete.signals).filter((value) => value === true).length, 5);
    const tilt = calculateProceedBiasTilt(complete.signals, "Proceed Informed");
    assert.equal(tilt.tilt, "wait_or_walk_away");
    assert.equal(tilt.proceed_informed_requires_disconfirmation, true);

    const incomplete = deriveProceedBiasSignals({
      m02Recon: {
        terrain: { diagnosis: "pending" },
        gate5: { risks: [{ pattern: "r1", state: "unclear", severity: null }] },
      },
      m03Commitments: null,
      humanLoad: { principals: [{ gapSustainability: "unknown" }] },
      costComparison: null,
    });
    assert.ok(incomplete.unresolved.length > 0);
    assert.equal(calculateProceedBiasTilt(incomplete.signals).tilt, "unresolved");
    assert.equal(incomplete.signals.any_critical_acknowledged_m02_structural_risk, null);
  });
});
