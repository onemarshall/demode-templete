import { z } from "zod";

/** Shared Contracts §4.1. Unknown values are represented by null, never by 0. */
export const EconomicRangeSchema = z
  .object({ low: z.number().finite(), high: z.number().finite() })
  .refine((range) => range.low <= range.high, "Range low must be less than or equal to high");

const KnownValueSchema = z.union([z.number().finite(), EconomicRangeSchema]);
const PriceRoleSchema = z.enum(["proposed", "quoted", "realised", "competitor", "modelled"]);

const TypedEconomicInputCommon = {
  input_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  period: z.string().trim().min(1),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  price_role: PriceRoleSchema.optional(),
  source_id: z.string().trim().min(1),
  source_ref: z.string().trim().min(1),
  source_date: z.string().trim().min(1),
  owner: z.string().trim().min(1),
  confidence: z.string().trim().min(1),
  calculation_use: z.string().trim().min(1),
  derivation: z.string().trim().min(1),
  review_trigger: z.string().trim().min(1),
  strategic_version: z.string().trim().min(1),
};

const KnownEconomicInputSchema = z.discriminatedUnion("input_type", [
  z.object({
    ...TypedEconomicInputCommon,
    input_type: z.literal("actual"),
    value_or_range: KnownValueSchema,
  }),
  z.object({
    ...TypedEconomicInputCommon,
    input_type: z.literal("estimate"),
    value_or_range: KnownValueSchema,
  }),
  z.object({
    ...TypedEconomicInputCommon,
    input_type: z.literal("hypothesis"),
    value_or_range: KnownValueSchema,
  }),
]);

const UnknownEconomicInputSchema = z.object({
  ...TypedEconomicInputCommon,
  input_type: z.literal("unknown"),
  value_or_range: z.null(),
});

export const TypedEconomicInputSchema = z.union([
  KnownEconomicInputSchema,
  UnknownEconomicInputSchema,
]);
export type TypedEconomicInput = z.infer<typeof TypedEconomicInputSchema>;
export type KnownEconomicInput = z.infer<typeof KnownEconomicInputSchema>;
export type PriceRole = z.infer<typeof PriceRoleSchema>;
export type EconomicRange = z.infer<typeof EconomicRangeSchema>;
export interface OpenEndedEconomicRange {
  low: number;
  high: null;
}

/** Applicability is a separate disposition, never an economic input or numeric zero. */
export const EconomicApplicabilitySchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("applicable"), reason: z.string().trim().min(1) }),
  z.object({ state: z.literal("not_applicable"), reason: z.string().trim().min(1) }),
  z.object({
    state: z.literal("unresolved"),
    reason: z.string().trim().min(1),
    owner: z.string().trim().min(1),
  }),
]);
export type EconomicApplicability = z.infer<typeof EconomicApplicabilitySchema>;

export type CalculationStatus =
  | "calculated"
  | "conditional"
  | "unknown"
  | "not_estimable"
  | "not_applicable"
  | "no_finite_break_even"
  | "not_depleting";

export interface EconomicCalculation<T = number | EconomicRange> {
  status: CalculationStatus;
  value?: T;
  input_ids: string[];
  weakest_input_type: TypedEconomicInput["input_type"];
  unit: string;
  period: string;
  currency?: string;
  limitations: string[];
}

const inputTypeStrength: Record<TypedEconomicInput["input_type"], number> = {
  unknown: 0,
  hypothesis: 1,
  estimate: 2,
  actual: 3,
};

/** Returns the least-supported source type among material inputs. */
export function weakestInputType(
  inputs: readonly TypedEconomicInput[],
): TypedEconomicInput["input_type"] {
  if (inputs.length === 0) return "unknown";
  return inputs.reduce(
    (weakest, input) =>
      inputTypeStrength[input.input_type] < inputTypeStrength[weakest] ? input.input_type : weakest,
    inputs[0].input_type,
  );
}

function asRange(input: TypedEconomicInput): EconomicRange | null {
  if (input.input_type === "unknown" || input.value_or_range === null) return null;
  return typeof input.value_or_range === "number"
    ? { low: input.value_or_range, high: input.value_or_range }
    : input.value_or_range;
}

function isRange(value: EconomicRange | number): value is EconomicRange {
  return typeof value !== "number";
}

function weakestOfTypes(
  types: readonly TypedEconomicInput["input_type"][],
): TypedEconomicInput["input_type"] {
  if (types.length === 0) return "unknown";
  return types.reduce(
    (weakest, type) => (inputTypeStrength[type] < inputTypeStrength[weakest] ? type : weakest),
    types[0],
  );
}

function describeInputs(
  inputs: readonly TypedEconomicInput[],
  unit: string,
  period: string,
  currency?: string,
) {
  return {
    input_ids: inputs.map((input) => input.input_id),
    weakest_input_type: weakestInputType(inputs),
    unit,
    period,
    ...(currency ? { currency } : {}),
  };
}

function limitation(
  status: CalculationStatus,
  inputs: readonly TypedEconomicInput[],
  unit: string,
  period: string,
  reason: string,
  currency?: string,
): EconomicCalculation {
  return {
    status,
    ...describeInputs(inputs, unit, period, currency),
    limitations: [reason],
  };
}

function compatible(inputs: readonly TypedEconomicInput[], requirePeriod = true): string | null {
  if (inputs.length === 0) return "No source inputs were supplied.";
  const first = inputs[0];
  for (const input of inputs.slice(1)) {
    if (input.unit !== first.unit)
      return `Unit mismatch: ${first.input_id} uses ${first.unit}; ${input.input_id} uses ${input.unit}.`;
    if (input.currency !== first.currency)
      return `Currency mismatch: ${first.input_id} and ${input.input_id} do not use the same explicit currency.`;
    if (requirePeriod && input.period !== first.period)
      return `Period mismatch: ${first.input_id} uses ${first.period}; ${input.input_id} uses ${input.period}.`;
  }
  return null;
}

function addRanges(left: EconomicRange, right: EconomicRange): EconomicRange {
  return { low: left.low + right.low, high: left.high + right.high };
}

function subtractRanges(left: EconomicRange, right: EconomicRange): EconomicRange {
  return { low: left.low - right.high, high: left.high - right.low };
}

/** Sum same-unit, same-currency, same-period inputs without losing uncertainty. */
export function sumEconomicInputs(inputs: readonly TypedEconomicInput[]): EconomicCalculation {
  const first = inputs[0];
  if (!first)
    return limitation(
      "not_estimable",
      inputs,
      "unspecified",
      "unspecified",
      "At least one typed input is required.",
    );
  const mismatch = compatible(inputs);
  if (mismatch)
    return limitation("not_estimable", inputs, first.unit, first.period, mismatch, first.currency);
  if (inputs.some((input) => asRange(input) === null)) {
    return limitation(
      "unknown",
      inputs,
      first.unit,
      first.period,
      "At least one material input is unknown; the sum is not treated as zero.",
      first.currency,
    );
  }
  const total = inputs
    .map((input) => asRange(input)!)
    .reduce((sum, range) => addRanges(sum, range), { low: 0, high: 0 });
  const value = total.low === total.high ? total.low : total;
  return {
    status: "calculated",
    value,
    ...describeInputs(inputs, first.unit, first.period, first.currency),
    limitations: [],
  };
}

/** Revenue less direct delivery cost; price roles remain distinct source records. */
export function calculateContribution(
  revenuePerUnit: TypedEconomicInput,
  directCostsPerUnit: readonly TypedEconomicInput[],
): EconomicCalculation {
  const inputs = [revenuePerUnit, ...directCostsPerUnit];
  const mismatch = compatible(inputs);
  if (mismatch)
    return limitation(
      "not_estimable",
      inputs,
      revenuePerUnit.unit,
      revenuePerUnit.period,
      mismatch,
      revenuePerUnit.currency,
    );
  if (
    revenuePerUnit.input_type === "unknown" ||
    directCostsPerUnit.some((input) => input.input_type === "unknown")
  ) {
    return limitation(
      "unknown",
      inputs,
      revenuePerUnit.unit,
      revenuePerUnit.period,
      "Revenue or a direct cost is unknown; contribution cannot be calculated as if it were zero.",
      revenuePerUnit.currency,
    );
  }
  if (directCostsPerUnit.length === 0) {
    return limitation(
      "not_estimable",
      inputs,
      revenuePerUnit.unit,
      revenuePerUnit.period,
      "Direct delivery costs have not been decomposed; an empty cost list is not evidence of zero cost.",
      revenuePerUnit.currency,
    );
  }
  const revenue = asRange(revenuePerUnit)!;
  const costs = directCostsPerUnit
    .map((input) => asRange(input)!)
    .reduce((sum, range) => addRanges(sum, range), { low: 0, high: 0 });
  const contribution = subtractRanges(revenue, costs);
  const value = contribution.low === contribution.high ? contribution.low : contribution;
  return {
    status: "calculated",
    value,
    ...describeInputs(inputs, revenuePerUnit.unit, revenuePerUnit.period, revenuePerUnit.currency),
    limitations:
      contribution.high <= 0
        ? [
            "Contribution is non-positive across this supplied range; this is not a business verdict.",
          ]
        : [],
  };
}

/** Contribution margin is not estimable when price is unknown or crosses zero. */
export function calculateContributionMargin(
  contribution: EconomicCalculation,
  revenuePerUnit: TypedEconomicInput,
): EconomicCalculation<number | EconomicRange> {
  const inputs = [revenuePerUnit];
  if (
    contribution.status !== "calculated" ||
    contribution.value === undefined ||
    revenuePerUnit.input_type === "unknown"
  ) {
    return limitation(
      "unknown",
      inputs,
      "ratio",
      revenuePerUnit.period,
      "Contribution or revenue is not known well enough to calculate a margin.",
      undefined,
    );
  }
  if (
    contribution.currency !== revenuePerUnit.currency ||
    contribution.unit !== revenuePerUnit.unit ||
    contribution.period !== revenuePerUnit.period
  ) {
    return limitation(
      "not_estimable",
      inputs,
      "ratio",
      revenuePerUnit.period,
      "Contribution and revenue basis do not share the same unit, period and explicit currency.",
      undefined,
    );
  }
  const price = asRange(revenuePerUnit)!;
  const value = isRange(contribution.value)
    ? contribution.value
    : { low: contribution.value, high: contribution.value };
  if (price.low <= 0 && price.high >= 0) {
    return limitation(
      "not_estimable",
      inputs,
      "ratio",
      revenuePerUnit.period,
      "The supplied price range includes zero, so contribution margin has no finite ratio.",
      undefined,
    );
  }
  const ratios = [
    value.low / price.low,
    value.low / price.high,
    value.high / price.low,
    value.high / price.high,
  ];
  const result = { low: Math.min(...ratios), high: Math.max(...ratios) };
  const output = result.low === result.high ? result.low : result;
  return {
    status: "calculated",
    value: output,
    input_ids: [...contribution.input_ids, revenuePerUnit.input_id],
    weakest_input_type: weakestOfTypes([
      contribution.weakest_input_type,
      revenuePerUnit.input_type,
    ]),
    unit: "ratio",
    period: revenuePerUnit.period,
    limitations: [],
  };
}

/** Fixed-cost break-even volume, expressed per the fixed-cost period. */
export function calculateBreakEven(
  fixedCost: TypedEconomicInput,
  contributionPerUnit: EconomicCalculation<number | EconomicRange>,
  unitOfSale: string,
): EconomicCalculation<number | EconomicRange | OpenEndedEconomicRange> {
  const references = [fixedCost.input_id, ...(contributionPerUnit.input_ids ?? [])];
  if (fixedCost.input_type === "unknown" || contributionPerUnit.status === "unknown") {
    return {
      status: "unknown",
      input_ids: references,
      weakest_input_type: weakestOfTypes([
        fixedCost.input_type,
        contributionPerUnit.weakest_input_type,
      ]),
      unit: unitOfSale,
      period: fixedCost.period,
      ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
      limitations: [
        "Unknown fixed cost or contribution remains unknown; it is not treated as zero.",
      ],
    };
  }
  if (contributionPerUnit.status !== "calculated" || contributionPerUnit.value === undefined) {
    return {
      status: "not_estimable",
      input_ids: references,
      weakest_input_type: weakestOfTypes([
        fixedCost.input_type,
        contributionPerUnit.weakest_input_type,
      ]),
      unit: unitOfSale,
      period: fixedCost.period,
      ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
      limitations: ["The supplied contribution basis is not usable for break-even."],
    };
  }
  if (
    contributionPerUnit.currency !== fixedCost.currency ||
    contributionPerUnit.unit !== fixedCost.unit
  ) {
    return {
      status: "not_estimable",
      input_ids: references,
      weakest_input_type: weakestOfTypes([
        fixedCost.input_type,
        contributionPerUnit.weakest_input_type,
      ]),
      unit: unitOfSale,
      period: fixedCost.period,
      ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
      limitations: [
        "Fixed cost and contribution must use the same explicit currency and monetary unit; no conversion is inferred.",
      ],
    };
  }
  const fixed = asRange(fixedCost)!;
  const contribution =
    typeof contributionPerUnit.value === "number"
      ? { low: contributionPerUnit.value, high: contributionPerUnit.value }
      : contributionPerUnit.value;
  if (contribution.high <= 0) {
    return {
      status: "no_finite_break_even",
      input_ids: references,
      weakest_input_type: weakestInputType([fixedCost]),
      unit: unitOfSale,
      period: fixedCost.period,
      ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
      limitations: [
        "No finite break-even exists under this supplied model because contribution is non-positive.",
      ],
    };
  }
  if (contribution.low <= 0) {
    return {
      status: "conditional",
      value: { low: fixed.low / contribution.high, high: null },
      input_ids: references,
      weakest_input_type: weakestOfTypes([
        fixedCost.input_type,
        contributionPerUnit.weakest_input_type,
      ]),
      unit: unitOfSale,
      period: fixedCost.period,
      ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
      limitations: [
        "Break-even is finite only in the positive-contribution part of the range; no finite upper bound is supported.",
      ],
    };
  }
  const result = { low: fixed.low / contribution.high, high: fixed.high / contribution.low };
  const value = result.low === result.high ? result.low : result;
  return {
    status: "calculated",
    value,
    input_ids: references,
    weakest_input_type: weakestOfTypes([
      fixedCost.input_type,
      contributionPerUnit.weakest_input_type,
    ]),
    unit: unitOfSale,
    period: fixedCost.period,
    ...(fixedCost.currency ? { currency: fixedCost.currency } : {}),
    limitations: [],
  };
}

export type CapacityAssessment =
  | "within_capacity"
  | "capacity_shortfall"
  | "overlap_uncertain"
  | "unknown"
  | "not_estimable";

/** Compare required break-even volume with explicit capacity, using matching unit and period. */
export function assessBreakEvenCapacity(
  breakEven: EconomicCalculation<number | EconomicRange | OpenEndedEconomicRange>,
  capacity: TypedEconomicInput,
): { status: CapacityAssessment; limitations: string[]; input_ids: string[] } {
  const input_ids = [...breakEven.input_ids, capacity.input_id];
  if (breakEven.status === "unknown" || capacity.input_type === "unknown") {
    return {
      status: "unknown",
      input_ids,
      limitations: ["Break-even volume or capacity is unknown."],
    };
  }
  if (breakEven.status !== "calculated" && breakEven.status !== "conditional") {
    return {
      status: "not_estimable",
      input_ids,
      limitations: ["Break-even volume is not available for a capacity comparison."],
    };
  }
  if (breakEven.unit !== capacity.unit || breakEven.period !== capacity.period) {
    return {
      status: "not_estimable",
      input_ids,
      limitations: [`Capacity must use ${breakEven.unit} per ${breakEven.period}.`],
    };
  }
  if (capacity.currency !== undefined) {
    return {
      status: "not_estimable",
      input_ids,
      limitations: ["Capacity is a count, so it must not carry a currency dimension."],
    };
  }
  const required =
    typeof breakEven.value === "number"
      ? { low: breakEven.value, high: breakEven.value }
      : breakEven.value!;
  const available = asRange(capacity)!;
  if (required.high === null) {
    return required.low > available.high
      ? {
          status: "capacity_shortfall",
          input_ids,
          limitations: [
            "Even the lowest finite break-even volume exceeds the supplied maximum capacity.",
          ],
        }
      : {
          status: "overlap_uncertain",
          input_ids,
          limitations: [
            "The contribution range includes non-positive outcomes, so capacity cannot guarantee a finite break-even.",
          ],
        };
  }
  if (required.high <= available.low)
    return { status: "within_capacity", input_ids, limitations: [] };
  if (required.low > available.high)
    return { status: "capacity_shortfall", input_ids, limitations: [] };
  return {
    status: "overlap_uncertain",
    input_ids,
    limitations: [
      "The supplied ranges overlap; the evidence does not establish whether break-even fits capacity.",
    ],
  };
}

/**
 * Service/retainer capacity check: compares an explicit owner income floor and
 * other committed income with per-client contribution, then checks the client
 * count against delivery capacity. It does not infer client retention or demand.
 */
export function assessServiceIncomeCapacity(args: {
  incomeFloor: TypedEconomicInput;
  otherIncome: TypedEconomicInput;
  contributionPerClient: EconomicCalculation<number | EconomicRange>;
  maximumClients: TypedEconomicInput;
}) {
  const { incomeFloor, otherIncome, contributionPerClient, maximumClients } = args;
  const input_ids = [
    incomeFloor.input_id,
    otherIncome.input_id,
    ...contributionPerClient.input_ids,
    maximumClients.input_id,
  ];
  if (
    [incomeFloor, otherIncome, maximumClients].some((input) => input.input_type === "unknown") ||
    contributionPerClient.status === "unknown"
  ) {
    return {
      status: "unknown" as const,
      input_ids,
      required_clients: undefined,
      limitations: [
        "An income floor, other income, client contribution or delivery capacity is unknown; it is not zero.",
      ],
    };
  }
  if (
    incomeFloor.currency !== otherIncome.currency ||
    incomeFloor.currency !== contributionPerClient.currency ||
    incomeFloor.currency === undefined ||
    incomeFloor.period !== otherIncome.period ||
    incomeFloor.period !== contributionPerClient.period ||
    incomeFloor.period !== maximumClients.period ||
    contributionPerClient.unit !== incomeFloor.unit ||
    maximumClients.currency !== undefined
  ) {
    return {
      status: "not_estimable" as const,
      input_ids,
      required_clients: undefined,
      limitations: [
        "Income floor, other income and per-client contribution must share explicit currency and period; client capacity uses a count unit and no currency.",
      ],
    };
  }
  if (contributionPerClient.status !== "calculated" || contributionPerClient.value === undefined) {
    return {
      status: "not_estimable" as const,
      input_ids,
      required_clients: undefined,
      limitations: ["Per-client contribution is not available for a service capacity calculation."],
    };
  }
  const floor = asRange(incomeFloor)!;
  const other = asRange(otherIncome)!;
  const capacity = asRange(maximumClients)!;
  const contribution =
    typeof contributionPerClient.value === "number"
      ? { low: contributionPerClient.value, high: contributionPerClient.value }
      : contributionPerClient.value;
  if (floor.low < 0 || other.low < 0 || capacity.low < 0 || contribution.high <= 0) {
    return {
      status: "not_estimable" as const,
      input_ids,
      required_clients: undefined,
      limitations: [
        "The supplied income, capacity or contribution does not support a non-negative service model with positive contribution.",
      ],
    };
  }
  const gap = {
    low: Math.max(0, floor.low - other.high),
    high: Math.max(0, floor.high - other.low),
  };
  const required = { low: gap.low / contribution.high, high: gap.high / contribution.low };
  const required_clients = required.low === required.high ? required.low : required;
  const status =
    required.high <= capacity.low
      ? ("within_capacity" as const)
      : required.low > capacity.high
        ? ("capacity_shortfall" as const)
        : ("overlap_uncertain" as const);
  return {
    status,
    input_ids,
    required_clients,
    weakest_input_type: weakestOfTypes([
      incomeFloor.input_type,
      otherIncome.input_type,
      maximumClients.input_type,
      contributionPerClient.weakest_input_type,
    ]),
    unit: maximumClients.unit,
    period: incomeFloor.period,
    ...(incomeFloor.currency ? { currency: incomeFloor.currency } : {}),
    limitations: [
      "This bounded capacity comparison does not establish demand, retention, client concentration tolerance or owner preference; review those separately.",
    ],
  };
}

/** Cash runway is separate from accounting profit. Burn is net cash outflow for the declared period. */
export function calculateCashRunway(
  availableCash: TypedEconomicInput,
  netCashOutflowPerPeriod: TypedEconomicInput,
): EconomicCalculation<number | EconomicRange | OpenEndedEconomicRange> {
  const inputs = [availableCash, netCashOutflowPerPeriod];
  if (availableCash.input_type === "unknown" || netCashOutflowPerPeriod.input_type === "unknown") {
    return limitation(
      "unknown",
      inputs,
      "periods",
      netCashOutflowPerPeriod.period,
      "Cash or net cash outflow is unknown; runway is not treated as zero.",
      availableCash.currency,
    );
  }
  if (
    availableCash.unit !== netCashOutflowPerPeriod.unit ||
    availableCash.currency !== netCashOutflowPerPeriod.currency
  ) {
    return limitation(
      "not_estimable",
      inputs,
      "periods",
      netCashOutflowPerPeriod.period,
      "Cash and outflow require the same explicit currency/unit; no conversion is inferred.",
      availableCash.currency,
    );
  }
  const cash = asRange(availableCash)!;
  const burn = asRange(netCashOutflowPerPeriod)!;
  if (cash.high < 0) {
    return limitation(
      "not_estimable",
      inputs,
      "periods",
      netCashOutflowPerPeriod.period,
      "Available cash is negative across the supplied range; a runway ratio is not meaningful.",
      availableCash.currency,
    );
  }
  if (burn.high <= 0) {
    return {
      status: "not_depleting",
      ...describeInputs(inputs, "periods", netCashOutflowPerPeriod.period, availableCash.currency),
      limitations: [
        "The supplied net cash flow does not deplete available cash; this is not an accounting-profit conclusion.",
      ],
    };
  }
  if (burn.low <= 0) {
    return {
      status: "conditional",
      value: { low: Math.max(0, cash.low) / burn.high, high: null },
      ...describeInputs(inputs, "periods", netCashOutflowPerPeriod.period, availableCash.currency),
      limitations: [
        "The net cash-flow range includes non-depleting outcomes, so there is no finite upper runway bound.",
      ],
    };
  }
  const result = {
    low: Math.max(0, cash.low) / burn.high,
    high: Math.max(0, cash.high) / burn.low,
  };
  const value = result.low === result.high ? result.low : result;
  return {
    status: "calculated",
    value,
    ...describeInputs(inputs, "periods", netCashOutflowPerPeriod.period, availableCash.currency),
    limitations: [],
  };
}

/** Concentration share for a largest customer/account; this is exposure, not a risk verdict. */
export function calculateRevenueConcentration(
  largestAccountRevenue: TypedEconomicInput,
  totalRevenue: TypedEconomicInput,
): EconomicCalculation<number | EconomicRange> {
  const inputs = [largestAccountRevenue, totalRevenue];
  const mismatch = compatible(inputs);
  if (mismatch)
    return limitation(
      "not_estimable",
      inputs,
      "ratio",
      totalRevenue.period,
      mismatch,
      totalRevenue.currency,
    );
  if (inputs.some((input) => input.input_type === "unknown")) {
    return limitation(
      "unknown",
      inputs,
      "ratio",
      totalRevenue.period,
      "Largest-account or total revenue is unknown.",
      totalRevenue.currency,
    );
  }
  const largest = asRange(largestAccountRevenue)!;
  const total = asRange(totalRevenue)!;
  if (total.low <= 0 || largest.low < 0 || largest.high > total.high) {
    return limitation(
      "not_estimable",
      inputs,
      "ratio",
      totalRevenue.period,
      "Revenue ranges do not support a valid concentration ratio.",
      totalRevenue.currency,
    );
  }
  if (largest.high > total.low) {
    return limitation(
      "not_estimable",
      inputs,
      "ratio",
      totalRevenue.period,
      "Independent ranges do not establish a coherent paired largest-account and total-revenue scenario.",
      totalRevenue.currency,
    );
  }
  const result = { low: largest.low / total.high, high: largest.high / total.low };
  const value = result.low === result.high ? result.low : result;
  return {
    status: "calculated",
    value,
    ...describeInputs(inputs, "ratio", totalRevenue.period, totalRevenue.currency),
    limitations: [],
  };
}

export interface ContributionScenario {
  id: string;
  name: string;
  revenue_per_unit: TypedEconomicInput;
  direct_costs_per_unit: TypedEconomicInput[];
  assumption_note: string;
}

/** Compares explicitly authored, coherent assumption sets; it assigns no probability. */
export function compareContributionScenarios(scenarios: readonly ContributionScenario[]) {
  const ids = new Set<string>();
  return scenarios.map((scenario) => {
    const duplicate = ids.has(scenario.id);
    ids.add(scenario.id);
    if (duplicate) {
      return {
        id: scenario.id,
        name: scenario.name,
        result: limitation(
          "not_estimable",
          [scenario.revenue_per_unit, ...scenario.direct_costs_per_unit],
          scenario.revenue_per_unit.unit,
          scenario.revenue_per_unit.period,
          "Scenario IDs must be unique.",
          scenario.revenue_per_unit.currency,
        ),
        assumption_note: scenario.assumption_note,
      };
    }
    return {
      id: scenario.id,
      name: scenario.name,
      result: calculateContribution(scenario.revenue_per_unit, scenario.direct_costs_per_unit),
      assumption_note: scenario.assumption_note,
    };
  });
}

/** One-way price sensitivity only at explicitly supplied values; no elasticity is inferred. */
export function calculatePriceSensitivity(
  revenuePerUnit: KnownEconomicInput,
  directCostsPerUnit: readonly TypedEconomicInput[],
  pricePoints: readonly number[],
) {
  if (revenuePerUnit.price_role === "competitor") {
    return {
      status: "not_estimable" as const,
      limitations: ["Competitor prices are not a willingness-to-pay or realised-revenue input."],
      points: [],
    };
  }
  const baseRange = asRange(revenuePerUnit);
  if (!baseRange)
    return {
      status: "unknown" as const,
      limitations: ["The revenue input is unknown."],
      points: [],
    };
  const outside = pricePoints.some((point) => point < baseRange.low || point > baseRange.high);
  if (outside) {
    return {
      status: "not_estimable" as const,
      limitations: ["Sensitivity points must remain inside the explicitly supplied price range."],
      points: [],
    };
  }
  const points = pricePoints.map((price) => {
    const pointInput = TypedEconomicInputSchema.parse({
      ...revenuePerUnit,
      input_id: `${revenuePerUnit.input_id}:sensitivity:${price}`,
      input_type: "hypothesis",
      value_or_range: price,
      calculation_use: `${revenuePerUnit.calculation_use}; bounded one-way sensitivity point`,
    });
    return {
      price,
      contribution: calculateContribution(pointInput as KnownEconomicInput, directCostsPerUnit),
    };
  });
  return {
    status: "calculated" as const,
    limitations: [
      "This is a one-way sensitivity only; no price elasticity, probability or demand response is inferred.",
    ],
    points,
  };
}
