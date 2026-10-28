import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TypedEconomicInputSchema,
  weakestInputType,
  sumEconomicInputs,
  calculateContribution,
  calculateBreakEven,
  assessBreakEvenCapacity,
  calculateCashRunway,
  assessServiceIncomeCapacity,
  calculatePriceSensitivity,
  compareContributionScenarios,
} from "../../src/lib/modules/strategy/server/stages/m04/economics";
import type {
  KnownEconomicInput,
  TypedEconomicInput,
} from "../../src/lib/modules/strategy/server/stages/m04/economics";

function input(
  id: string,
  value: number | { low: number; high: number } | null,
  type: "unknown",
  extra?: Record<string, unknown>,
): Extract<TypedEconomicInput, { input_type: "unknown" }>;
function input(
  id: string,
  value: number | { low: number; high: number },
  type?: "actual" | "estimate" | "hypothesis",
  extra?: Record<string, unknown>,
): KnownEconomicInput;
function input(
  id: string,
  value: number | { low: number; high: number } | null,
  type: "actual" | "estimate" | "hypothesis" | "unknown" = "actual",
  extra: Record<string, unknown> = {},
): TypedEconomicInput {
  return TypedEconomicInputSchema.parse({
    input_id: id,
    name: id,
    input_type: type,
    value_or_range: value,
    unit: "GBP",
    period: "month",
    currency: "GBP",
    source_id: `src-${id}`,
    source_ref: `ref-${id}`,
    source_date: "2026-10-13",
    owner: "owner",
    confidence: "recorded",
    calculation_use: "test only",
    derivation: "direct source",
    review_trigger: "review on change",
    strategic_version: "v1",
    ...extra,
  });
}

describe("typed economic inputs and deterministic calculations", () => {
  it("keeps unknown distinct from zero and validates evidence typing", () => {
    assert.equal(input("u", null, "unknown").value_or_range, null);
    assert.throws(() => input("bad", 0, "unknown"));
    assert.throws(() => input("bad-range", { low: 8, high: 2 }));
    assert.equal(weakestInputType([input("a", 10), input("h", 2, "hypothesis")]), "hypothesis");
    const total = sumEconomicInputs([input("a", 10), input("u", null, "unknown")]);
    assert.equal(total.status, "unknown");
    assert.equal(total.value, undefined);
  });

  it("rejects mixed currencies, units and periods rather than converting", () => {
    const mismatch = input("eur", 4, "actual", { currency: "EUR" });
    assert.equal(sumEconomicInputs([input("gbp", 10), mismatch]).status, "not_estimable");
    const wrongPeriod = input("annual", 4, "actual", { period: "year" });
    assert.equal(sumEconomicInputs([input("monthly", 10), wrongPeriod]).status, "not_estimable");
    const wrongUnit = input("units", 4, "actual", { unit: "clients", currency: undefined });
    assert.equal(sumEconomicInputs([input("money", 10), wrongUnit]).status, "not_estimable");
  });

  it("calculates direct contribution and refuses an empty cost list", () => {
    const result = calculateContribution(input("revenue", 100, "estimate"), [
      input("delivery", 35, "actual"),
    ]);
    assert.equal(result.value, 65);
    assert.equal(result.weakest_input_type, "estimate");
    assert.equal(calculateContribution(input("revenue", 100), []).status, "not_estimable");
    const bounded = calculateContribution(input("r", { low: 90, high: 110 }, "estimate"), [
      input("c", { low: 30, high: 40 }, "hypothesis"),
    ]);
    assert.deepEqual(bounded.value, { low: 50, high: 80 });
    assert.equal(bounded.weakest_input_type, "hypothesis");
  });

  it("calculates break-even, conditional range and explicit capacity status", () => {
    const fixed = input("fixed", 1000);
    const contribution = calculateContribution(input("price", 100), [input("cost", 60)]);
    const be = calculateBreakEven(fixed, contribution, "clients");
    assert.equal(be.value, 25);
    assert.equal(
      assessBreakEvenCapacity(
        be,
        input("capacity", 30, "estimate", { unit: "clients", currency: undefined }),
      ).status,
      "within_capacity",
    );
    assert.equal(
      assessBreakEvenCapacity(
        be,
        input("capacity-low", 20, "actual", { unit: "clients", currency: undefined }),
      ).status,
      "capacity_shortfall",
    );
    const crossing = calculateContribution(input("p", 100), [
      input("c", { low: 80, high: 110 }, "estimate"),
    ]);
    const conditional = calculateBreakEven(fixed, crossing, "clients");
    assert.equal(conditional.status, "conditional");
    assert.deepEqual(conditional.value, { low: 50, high: null });
    assert.equal(
      assessBreakEvenCapacity(
        conditional,
        input("cap", 80, "actual", { unit: "clients", currency: undefined }),
      ).status,
      "overlap_uncertain",
    );
    const loss = calculateContribution(input("p2", 100), [input("c2", 110)]);
    assert.equal(calculateBreakEven(fixed, loss, "clients").status, "no_finite_break_even");
  });

  it("separates cash runway from profit and preserves open-ended burn ranges", () => {
    assert.equal(calculateCashRunway(input("cash", 12000), input("burn", 3000)).value, 4);
    const uncertain = calculateCashRunway(
      input("cash-range", { low: 9000, high: 12000 }, "estimate"),
      input("burn-range", { low: 0, high: 3000 }, "hypothesis"),
    );
    assert.equal(uncertain.status, "conditional");
    assert.deepEqual(uncertain.value, { low: 3, high: null });
    assert.equal(
      calculateCashRunway(input("cash", 12000), input("inflow", -100)).status,
      "not_depleting",
    );
    assert.equal(
      calculateCashRunway(
        input("cash-eur", 10, "actual", { currency: "EUR" }),
        input("burn-gbp", 2),
      ).status,
      "not_estimable",
    );
  });

  it("checks service income floor against client contribution and capacity", () => {
    const result = assessServiceIncomeCapacity({
      incomeFloor: input("floor", 6000),
      otherIncome: input("other", 1000),
      contributionPerClient: calculateContribution(input("fee", 2500), [input("delivery", 500)]),
      maximumClients: input("max-clients", 3, "estimate", { unit: "clients", currency: undefined }),
    });
    assert.equal(result.status, "within_capacity");
    assert.equal(result.required_clients, 2.5);
    assert.equal(
      assessServiceIncomeCapacity({
        incomeFloor: input("floor", 9000),
        otherIncome: input("other", 0),
        contributionPerClient: calculateContribution(input("fee", 2000), [input("delivery", 500)]),
        maximumClients: input("max", 2, "actual", { unit: "clients", currency: undefined }),
      }).status,
      "capacity_shortfall",
    );
  });

  it("keeps scenario sets explicit and price sensitivity bounded", () => {
    const revenue = input("price", { low: 80, high: 120 }, "estimate", { price_role: "proposed" });
    const points = calculatePriceSensitivity(revenue, [input("cost", 40)], [80, 100, 120]);
    assert.equal(points.points.length, 3);
    assert.equal(
      calculatePriceSensitivity(revenue, [input("cost", 40)], [130]).status,
      "not_estimable",
    );
    assert.equal(
      calculatePriceSensitivity(
        input("competitor", 100, "actual", { price_role: "competitor" }),
        [input("c", 40)],
        [100],
      ).status,
      "not_estimable",
    );
    const scenarios = compareContributionScenarios([
      {
        id: "base",
        name: "Base",
        revenue_per_unit: input("p1", 100, "estimate"),
        direct_costs_per_unit: [input("c1", 40)],
        assumption_note: "supplied case",
      },
      {
        id: "down",
        name: "Downside",
        revenue_per_unit: input("p2", 80, "hypothesis"),
        direct_costs_per_unit: [input("c2", 50, "estimate")],
        assumption_note: "explicit alternative",
      },
    ]);
    assert.deepEqual(
      scenarios.map((scenario) => scenario.result.value),
      [60, 30],
    );
  });
});
