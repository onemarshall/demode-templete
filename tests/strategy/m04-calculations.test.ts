import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TypedEconomicInputSchema } from "../../src/lib/modules/strategy/server/stages/m04/economics";
import {
  CALCULATION_DESCRIPTIONS,
  CALCULATION_KINDS,
  calculateM04,
} from "../../src/lib/modules/strategy/server/stages/m04/calculations";

const input = (
  id: string,
  value: number | { low: number; high: number } | null,
  type = value === null ? "unknown" : "actual",
  extra: Record<string, unknown> = {},
) =>
  TypedEconomicInputSchema.parse({
    input_id: id,
    name: id,
    input_type: type,
    value_or_range: value,
    unit: "GBP",
    period: "month",
    currency: "GBP",
    source_id: `source-${id}`,
    source_ref: `ref-${id}`,
    source_date: "2026-10-13",
    owner: "owner",
    confidence: "recorded",
    calculation_use: "test",
    derivation: "direct",
    review_trigger: "review on change",
    strategic_version: "v1",
    ...extra,
  });
const calculation = (id: string, kind: string, inputIds: string[]) => ({
  id,
  kind,
  inputIds,
  assumptions: "Explicitly supplied test fixture.",
  formula:
    CALCULATION_DESCRIPTIONS[kind as keyof typeof CALCULATION_DESCRIPTIONS]?.formula ??
    "declared unsupported",
});
const grounding = (inputs: unknown[], calculations: unknown[]) => ({
  inputs,
  calculations,
  mechanisms: Array.from({ length: 10 }, (_, i) => ({
    id: `M${i + 1}`,
    applicable: i === 9,
    reason: "Recorded decision relevance.",
    finding: "Reviewed for this case.",
    inputIds: [],
    limitation: "Bounded applicability record.",
  })),
  economicFloor: "recorded",
  convictionFloor: "recorded",
  biggestAssumption: "test assumption",
  evidence: "test evidence",
  ifWrong: "revisit",
  investmentLimit: "none",
  pricing: {
    state: "not-yet-estimable",
    finding: "not priced",
    inputIds: [],
    conditions: "none",
    claimsBoundary: "no claim",
  },
  offers: [],
  bridge: {
    applicable: false,
    job: "not applicable",
    resources: "none",
    evidenceEvent: "none",
    owner: "owner",
    limits: "none",
  },
});

describe("M04 calculation dispatcher", () => {
  it("publishes exact positional contracts and evaluates supported kinds", () => {
    assert.deepEqual(CALCULATION_KINDS, [
      "sum",
      "contribution",
      "margin",
      "break-even",
      "break-even-capacity",
      "cash-runway",
      "revenue-concentration",
      "service-income-capacity",
      "price-sensitivity-endpoints",
    ]);
    const inputs = [
      input("fixed", 1000),
      input("price", 100),
      input("cost", 60),
      input("capacity", 30, "actual", { unit: "sale-units", currency: undefined }),
      input("cash", 12000),
      input("burn", 3000),
      input("largest", 400),
      input("total", 1000),
      input("floor", 6000),
      input("other", 1000),
      input("clients", 3, "estimate", { unit: "clients", currency: undefined }),
      input("fee", 2500),
      input("delivery", 500),
      input("price-range", { low: 80, high: 120 }, "estimate", { price_role: "proposed" }),
    ];
    const cases = [
      calculation("sum", "sum", ["cash", "burn"]),
      calculation("contribution", "contribution", ["price", "cost"]),
      calculation("margin", "margin", ["price", "cost"]),
      calculation("be", "break-even", ["fixed", "price", "cost"]),
      calculation("be-cap", "break-even-capacity", ["fixed", "price", "cost", "capacity"]),
      calculation("runway", "cash-runway", ["cash", "burn"]),
      calculation("concentration", "revenue-concentration", ["largest", "total"]),
      calculation("service", "service-income-capacity", [
        "floor",
        "other",
        "clients",
        "fee",
        "delivery",
      ]),
      calculation("sensitivity", "price-sensitivity-endpoints", ["price-range", "cost"]),
    ];
    const results = calculateM04(grounding(inputs, cases));
    assert.deepEqual(
      results.map((r) => r.kind),
      CALCULATION_KINDS,
    );
    assert.equal((results[1].result as { value: number }).value, 40);
    assert.equal((results[2].result as { value: number }).value, 0.4);
    assert.equal((results[3].result as { value: number }).value, 25);
    assert.equal(
      (results[4].result as { capacity: { status: string } }).capacity.status,
      "within_capacity",
    );
    assert.equal((results[5].result as { value: number }).value, 4);
    assert.equal((results[6].result as { value: number }).value, 0.4);
    assert.equal((results[7].result as { status: string }).status, "within_capacity");
    assert.equal((results[8].result as { points: unknown[] }).points.length, 2);
  });

  it("rejects invented formula text, wrong order/arity, and missing input refs", () => {
    const args = [input("price", 100), input("cost", 40)];
    const wrong = calculation("m", "margin", ["price", "cost"]);
    wrong.formula = "revenue × margin";
    assert.throws(() => calculateM04(grounding(args, [wrong])), /must exactly match/);
    const wrongArity = calculation("cash", "cash-runway", ["price"]);
    assert.throws(() => calculateM04(grounding(args, [wrongArity])), /requires at least/);
    const missing = calculation("sum", "sum", ["not-there"]);
    assert.throws(() => calculateM04(grounding(args, [missing])), /Missing economic input/);
  });

  it("preserves unknown inputs and unsupported specialist kinds as non-results", () => {
    const unknown = input("unknown", null, "unknown");
    const unknownResult = calculateM04(
      grounding([unknown, input("known", 10)], [calculation("sum", "sum", ["unknown", "known"])]),
    );
    assert.equal((unknownResult[0].result as { status: string }).status, "unknown");
    const unsupported = calculation("forecast", "lifetime-value", ["known"]);
    const specialized = calculateM04(grounding([input("known", 10)], [unsupported]));
    assert.equal((specialized[0].result as { status: string }).status, "not_estimable");
    assert.equal(specialized[0].declaredFormula, null);
    assert.match(
      (specialized[0].result as { limitations: string[] }).limitations[0],
      /no result was invented/,
    );
  });
});
