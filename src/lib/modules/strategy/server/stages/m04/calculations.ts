import { z } from "zod";
import { FinancialGrounding } from "./contracts";
import {
  TypedEconomicInputSchema,
  calculateContribution,
  calculateContributionMargin,
  calculateBreakEven,
  assessBreakEvenCapacity,
  calculateCashRunway,
  calculateRevenueConcentration,
  sumEconomicInputs,
  assessServiceIncomeCapacity,
  calculatePriceSensitivity,
  type KnownEconomicInput,
  type TypedEconomicInput,
} from "./economics";

export const CALCULATION_KINDS = [
  "sum",
  "contribution",
  "margin",
  "break-even",
  "break-even-capacity",
  "cash-runway",
  "revenue-concentration",
  "service-income-capacity",
  "price-sensitivity-endpoints",
] as const;
export const CalculationKindSchema = z.enum(CALCULATION_KINDS);
export type CalculationKind = z.infer<typeof CalculationKindSchema>;

/**
 * These positional contracts are deliberately exact. c.inputIds is an ordered
 * argument list, not a set. Declared formulas must equal this source string.
 */
export const CALCULATION_DESCRIPTIONS: Record<
  CalculationKind,
  {
    label: string;
    inputOrder: string;
    formula: string;
    limitation: string;
  }
> = {
  sum: {
    label: "Sum compatible inputs",
    inputOrder: "all inputIds: same unit, currency and period",
    formula: "Σ(xᵢ), only where unit, explicit currency and period match",
    limitation: "Ranges are added conservatively. Unknown inputs keep the result unknown.",
  },
  contribution: {
    label: "Contribution per commercial unit",
    inputOrder: "revenue per unit, then one or more direct delivery costs per same unit",
    formula: "revenue per unit − Σ(direct delivery cost per unit)",
    limitation:
      "Does not include fixed overhead, demand response or owner income unless separately represented.",
  },
  margin: {
    label: "Contribution margin",
    inputOrder: "revenue per unit, then one or more direct delivery costs per same unit",
    formula: "(revenue per unit − Σ(direct delivery cost per unit)) ÷ revenue per unit",
    limitation:
      "No percentage is produced if revenue includes zero or the input basis is incompatible.",
  },
  "break-even": {
    label: "Break-even volume",
    inputOrder:
      "fixed cost for period, revenue per unit, then one or more direct delivery costs per unit",
    formula: "fixed cost for period ÷ contribution per unit",
    limitation:
      "Reports sale-units per fixed-cost period; the count unit is explicit in this dispatcher, but the model does not infer a break-even date or demand.",
  },
  "break-even-capacity": {
    label: "Break-even versus capacity",
    inputOrder:
      "fixed cost for period, revenue per unit, one or more direct delivery costs per unit, maximum sale-units for same period last (capacity.currency must be absent)",
    formula:
      "compare(fixed cost for period ÷ contribution per unit, maximum sale units for same period)",
    limitation:
      "Capacity overlap stays uncertain; the comparison does not establish that demand exists.",
  },
  "cash-runway": {
    label: "Cash runway",
    inputOrder: "available cash, net cash outflow per period",
    formula: "available cash ÷ net cash outflow per period",
    limitation:
      "Cash runway is not profit, solvency, or a forecast. Non-depleting cash flow has no finite runway ratio.",
  },
  "revenue-concentration": {
    label: "Largest-account revenue concentration",
    inputOrder: "largest account revenue, total revenue for same period",
    formula: "largest account revenue ÷ total revenue",
    limitation:
      "Exposure measure only; no universal concentration threshold or risk verdict is inferred.",
  },
  "service-income-capacity": {
    label: "Service income floor versus client capacity",
    inputOrder:
      "income floor per period, other income per period, maximum clients per same period, revenue per client, then one or more direct delivery costs per client",
    formula:
      "required clients = max(0, income floor − other income) ÷ contribution per client; compare with maximum clients",
    limitation:
      "Does not infer demand, retention, client concentration tolerance or owner preference.",
  },
  "price-sensitivity-endpoints": {
    label: "Bounded price-endpoint sensitivity",
    inputOrder:
      "price input with explicit range, then one or more direct delivery costs per same unit",
    formula: "contribution at explicit price-range low and high endpoints; no elasticity inferred",
    limitation:
      "A two-endpoint one-way view only; no demand response, probability or price elasticity is inferred.",
  },
};

function requireArity(kind: CalculationKind, args: readonly TypedEconomicInput[]) {
  const min =
    kind === "sum" ? 1 : kind === "cash-runway" || kind === "revenue-concentration" ? 2 : 2;
  if (args.length < min)
    throw new Error(`${kind} requires at least ${min} ordered economic input IDs.`);
}
function requireFormula(kind: CalculationKind, declared: string) {
  if (declared !== CALCULATION_DESCRIPTIONS[kind].formula) {
    throw new Error(
      `Calculation formula for ${kind} must exactly match its governed formula: ${CALCULATION_DESCRIPTIONS[kind].formula}`,
    );
  }
}
function asKnown(input: TypedEconomicInput, name: string): KnownEconomicInput {
  if (input.input_type === "unknown")
    throw new Error(
      `${name} must have a known scalar or range; unknown remains an explicit non-result.`,
    );
  return input as KnownEconomicInput;
}

/** Calculate every registered deterministic kind; unknown kinds stay visibly unsupported. */
export function calculateM04(payload: unknown) {
  const f = FinancialGrounding.parse(payload);
  const inputs = f.inputs.map((value) => TypedEconomicInputSchema.parse(value));
  if (new Set(inputs.map((input) => input.input_id)).size !== inputs.length)
    throw new Error("Economic input IDs must be unique");
  if (new Set(f.calculations.map((calculation) => calculation.id)).size !== f.calculations.length)
    throw new Error("Calculation IDs must be unique");
  const byId = new Map(inputs.map((input) => [input.input_id, input]));
  return f.calculations.map((calculation) => {
    const args = calculation.inputIds.map((id) => {
      const input = byId.get(id);
      if (!input) throw new Error(`Missing economic input ${id}`);
      return input;
    });
    const kindResult = CalculationKindSchema.safeParse(calculation.kind);
    if (!kindResult.success)
      return {
        id: calculation.id,
        kind: calculation.kind,
        declaredFormula: null,
        formulaStatus: "unsupported" as const,
        assumptions: calculation.assumptions,
        result: {
          status: "not_estimable",
          input_ids: calculation.inputIds,
          limitations: [
            `Unsupported calculation kind ${calculation.kind}; no result was invented.`,
          ],
        },
      };
    const kind = kindResult.data;
    requireFormula(kind, calculation.formula);
    requireArity(kind, args);
    let result: unknown;
    switch (kind) {
      case "sum":
        result = sumEconomicInputs(args);
        break;
      case "contribution":
        result = calculateContribution(args[0], args.slice(1));
        break;
      case "margin": {
        const contribution = calculateContribution(args[0], args.slice(1));
        result = calculateContributionMargin(contribution, args[0]);
        break;
      }
      case "break-even":
      case "break-even-capacity": {
        if (args.length < (kind === "break-even" ? 3 : 4))
          throw new Error(
            `${kind} needs fixed cost, revenue, at least one direct cost${kind === "break-even-capacity" ? ", and capacity last" : ""}.`,
          );
        const [fixed, revenue, ...tail] = args;
        const capacity = kind === "break-even-capacity" ? tail.pop()! : undefined;
        const contribution = calculateContribution(revenue, tail);
        const volume = calculateBreakEven(fixed, contribution, "sale-units");
        result = capacity
          ? { breakEven: volume, capacity: assessBreakEvenCapacity(volume, capacity) }
          : volume;
        break;
      }
      case "cash-runway":
        if (args.length !== 2)
          throw new Error(
            "cash-runway input order is exactly available cash, net cash outflow per period.",
          );
        result = calculateCashRunway(args[0], args[1]);
        break;
      case "revenue-concentration":
        if (args.length !== 2)
          throw new Error(
            "revenue-concentration input order is exactly largest account revenue, total revenue.",
          );
        result = calculateRevenueConcentration(args[0], args[1]);
        break;
      case "service-income-capacity": {
        if (args.length < 5)
          throw new Error(
            "service-income-capacity needs income floor, other income, max clients, revenue per client and at least one direct cost.",
          );
        const [floor, otherIncome, capacity, revenue, ...costs] = args;
        const contribution = calculateContribution(revenue, costs);
        result = assessServiceIncomeCapacity({
          incomeFloor: floor,
          otherIncome,
          maximumClients: capacity,
          contributionPerClient: contribution,
        });
        break;
      }
      case "price-sensitivity-endpoints": {
        const revenue = asKnown(args[0], "Price sensitivity revenue");
        if (args.length < 2)
          throw new Error(
            "price-sensitivity-endpoints needs a price range and at least one direct cost.",
          );
        if (typeof revenue.value_or_range === "number")
          throw new Error(
            "price-sensitivity-endpoints requires an explicit range, not a single point.",
          );
        const range = revenue.value_or_range;
        result = calculatePriceSensitivity(revenue, args.slice(1), [
          ...new Set([range.low, range.high]),
        ]);
        break;
      }
    }
    return {
      id: calculation.id,
      kind,
      declaredFormula: calculation.formula,
      assumptions: calculation.assumptions,
      result,
    };
  });
}
