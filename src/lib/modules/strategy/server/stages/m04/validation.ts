import { Context, FinancialGrounding } from "./contracts";
import { TypedEconomicInputSchema } from "./economics";
import { calculateM04 } from "./calculations";
import { classifyEconomicDepth } from "./method";
import type { ProceedBiasSignals } from "./method";

const MECHANISM_IDS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"] as const;
const unique = (values: readonly string[]) => new Set(values).size === values.length;

/**
 * Validates the persisted Financial Grounding bundle at confirmation time.
 * It validates types and references; it does not convert human findings into
 * economic facts or guess a mechanism's applicability from its number alone.
 */
export function validateFinancialGrounding(contextPayload: unknown, groundingPayload: unknown) {
  const context = Context.parse(contextPayload);
  const grounding = FinancialGrounding.parse(groundingPayload);
  const depth = classifyEconomicDepth(
    context.modelQuestions.map((answer) => (answer === "unknown" ? "unknown" : answer)),
  );
  const expectedComplexity = depth.classification === "clarify" ? "unknown" : depth.classification;
  if (context.complexity !== expectedComplexity)
    throw new Error(
      `Context complexity must match its four source-defined questions (${expectedComplexity}).`,
    );
  const inputs = grounding.inputs.map((input) => TypedEconomicInputSchema.parse(input));
  if (!unique(inputs.map((input) => input.input_id)))
    throw new Error("Economic input IDs must be unique.");
  const knownIds = new Set(inputs.map((input) => input.input_id));
  const mechanisms = grounding.mechanisms;
  if (!unique(mechanisms.map((mechanism) => mechanism.id)))
    throw new Error("Each M1–M10 economic mechanism must appear once.");
  if (MECHANISM_IDS.some((id) => !mechanisms.some((mechanism) => mechanism.id === id)))
    throw new Error("Every M1–M10 economic mechanism needs a disposition.");
  const unresolvedMechanisms: string[] = [];
  for (const mechanism of mechanisms) {
    if (!mechanism.reason.trim() || !mechanism.finding.trim())
      throw new Error(
        `${mechanism.id} needs a reason and a finding, including when not applicable.`,
      );
    if (mechanism.inputIds.some((id) => !knownIds.has(id)))
      throw new Error(`${mechanism.id} references an absent economic input.`);
    if (mechanism.applicable && mechanism.inputIds.length === 0 && !mechanism.limitation.trim())
      throw new Error(`${mechanism.id} needs source inputs or an explicit limitation.`);
    if (!mechanism.applicable && !mechanism.limitation.trim())
      throw new Error(`${mechanism.id} needs a reasoned non-applicability boundary.`);
    const disposition =
      mechanism.disposition ?? (mechanism.applicable ? "applicable" : "unresolved");
    if (disposition === "applicable" && !mechanism.applicable)
      throw new Error(`${mechanism.id} disposition conflicts with its applicable flag.`);
    if (disposition === "not-applicable" && mechanism.applicable)
      throw new Error(`${mechanism.id} cannot be both applicable and not applicable.`);
    if (disposition === "unresolved" && mechanism.applicable)
      throw new Error(`${mechanism.id} unresolved applicability cannot be marked applicable.`);
    if (disposition === "unresolved") unresolvedMechanisms.push(mechanism.id);
  }
  const m10 = mechanisms.find((mechanism) => mechanism.id === "M10")!;
  if (!m10.applicable || m10.disposition === "not-applicable" || m10.disposition === "unresolved")
    throw new Error(
      "M10 consolidation is required for every completed Financial Grounding record.",
    );
  for (const calculation of grounding.calculations) {
    if (!unique(calculation.inputIds))
      throw new Error(
        `Calculation ${calculation.id} repeats an input ID; positional inputs must be explicit and unique.`,
      );
    if (calculation.inputIds.some((id) => !knownIds.has(id)))
      throw new Error(`Calculation ${calculation.id} references an absent economic input.`);
  }
  const results = calculateM04(grounding);
  return {
    context,
    grounding,
    depth,
    results,
    inputIds: [...knownIds],
    mechanisms,
    status: unresolvedMechanisms.length ? ("needs-review" as const) : ("validated" as const),
    unresolvedMechanisms,
    limitations: unresolvedMechanisms.length
      ? [
          `Applicability remains unresolved for ${unresolvedMechanisms.join(", ")}. Keep conservative depth and resolve or carry an explicit review limitation before relying on this stage.`,
        ]
      : [],
  };
}

export const PROCEED_BIAS_SIGNAL_IDS = [
  "critical_acknowledged_structural_risk",
  "two_material_r_patterns",
  "structural_negative_diagnosis",
  "cyclical_diagnosis",
  "acknowledged_risk_disputed",
  "unresolved_contrarian_trap",
  "m04_cost_materially_exceeds_m03",
  "gap_sustainability_no_or_stretch",
] as const;

export interface BiasSignalRecord {
  id: (typeof PROCEED_BIAS_SIGNAL_IDS)[number];
  present: boolean | null;
  sourceRef: string;
  basis: string;
}

/**
 * Re-derives the eight prompt signals from pinned M02/M03 evidence and M04
 * human records. Null is retained whenever the source does not establish a
 * true or false result; callers must not coerce it to false.
 */
export function deriveProceedBiasSignals(args: {
  m02Recon: {
    terrain?: { diagnosis?: string };
    gate5?: {
      risks?: Array<{
        pattern: string;
        state: string;
        severity: string | null;
        acknowledgment?: {
          line?: string;
          signedBy?: string | null;
          signedAt?: string | null;
          declined?: boolean;
          dispute?: string;
        };
      }>;
    };
  } | null;
  m03Commitments: { upstream?: { carriedForward?: { contrarianFlags?: string[] } } } | null;
  humanLoad: {
    principals?: Array<{
      gapSustainability: "yes" | "stretch" | "no" | "unknown";
      testimonySource?: string;
    }>;
  } | null;
  costComparison: { materiallyExceeds: boolean | null; sourceRef: string; basis: string } | null;
}): { signals: ProceedBiasSignals; records: BiasSignalRecord[]; unresolved: string[] } {
  const recon = args.m02Recon;
  const risks = recon?.gate5?.risks;
  const riskRows = risks ?? [];
  const riskRowsResolved =
    Boolean(risks) &&
    riskRows.every(
      (risk) =>
        risk.state !== "pending" &&
        risk.state !== "unclear" &&
        !(
          risk.state === "present" &&
          (risk.severity === null ||
            !(
              risk.acknowledgment?.declined ||
              risk.acknowledgment?.dispute?.trim() ||
              (risk.acknowledgment?.line?.trim() &&
                risk.acknowledgment.signedBy &&
                risk.acknowledgment.signedAt)
            ))
        ),
    );
  const acknowledged = (risk: (typeof riskRows)[number]) =>
    Boolean(
      risk.state === "present" &&
      risk.acknowledgment?.line?.trim() &&
      risk.acknowledgment.signedBy &&
      risk.acknowledgment.signedAt &&
      !risk.acknowledgment.declined &&
      !risk.acknowledgment.dispute?.trim(),
    );
  const disputed = (risk: (typeof riskRows)[number]) =>
    Boolean(risk.state === "present" && risk.acknowledgment?.dispute?.trim());
  const criticalCandidates = riskRows.filter(
    (risk) => risk.state === "present" && risk.severity === "critical",
  );
  const critical = criticalCandidates.some(acknowledged)
    ? true
    : !riskRowsResolved
      ? null
      : risks
        ? false
        : null;
  const materialCandidates = riskRows.filter(
    (risk) => risk.state === "present" && risk.severity === "material",
  ).length;
  const material = riskRowsResolved ? materialCandidates >= 2 : null;
  const diagnosis = recon?.terrain?.diagnosis;
  const diagnosisStructural =
    diagnosis === "structural-negative"
      ? true
      : diagnosis && diagnosis !== "pending" && diagnosis !== "ambiguous-needs-evidence"
        ? false
        : null;
  const diagnosisCyclical =
    diagnosis === "cyclical"
      ? true
      : diagnosis && diagnosis !== "pending" && diagnosis !== "ambiguous-needs-evidence"
        ? false
        : null;
  const disputedRisk = riskRows.some(disputed) ? true : riskRowsResolved ? false : null;
  const trapFlags = args.m03Commitments?.upstream?.carriedForward?.contrarianFlags;
  const trap = trapFlags ? trapFlags.length > 0 : null;
  const cost = args.costComparison?.materiallyExceeds ?? null;
  const principals = args.humanLoad?.principals;
  const gap = principals
    ? principals.some(
        (principal) =>
          principal.gapSustainability === "no" || principal.gapSustainability === "stretch",
      )
      ? true
      : principals.every((principal) => principal.gapSustainability !== "unknown")
        ? false
        : null
    : null;
  const values = [
    critical,
    material,
    diagnosisStructural,
    diagnosisCyclical,
    disputedRisk,
    trap,
    cost,
    gap,
  ] as const;
  const defaultRefs = [
    "m02.recon.gate5.risks",
    "m02.recon.gate5.risks",
    "m02.recon.terrain.diagnosis",
    "m02.recon.terrain.diagnosis",
    "m02.recon.gate5.risks",
    "m03.commitments.upstream.carriedForward.contrarianFlags",
    args.costComparison?.sourceRef ?? "m04.convictionCost.comparison",
    "m04.humanLoad.principals.gapSustainability",
  ];
  const bases = [
    critical === null
      ? "Pinned Gate 5 risk acknowledgement/severity is incomplete."
      : `Critical severity among signed, acknowledged, present structural risks: ${critical}.`,
    material === null
      ? "Gate 5 risk states or material severity are incomplete."
      : `${materialCandidates} present R-pattern risks have Material severity; threshold is two.`,
    `Pinned M02 diagnosis is ${diagnosis ?? "missing"}.`,
    `Pinned M02 diagnosis is ${diagnosis ?? "missing"}.`,
    disputedRisk === null
      ? "Pinned Gate 5 acknowledgement/dispute state is incomplete."
      : `Present Gate 5 risk documented as disputed: ${disputedRisk}.`,
    trap === null
      ? "Pinned M03 contrarian trap state is missing."
      : `Carried-forward unresolved contrarian flags: ${trapFlags!.length}.`,
    args.costComparison?.basis ?? "M04 conversation-one material comparison has not been recorded.",
    gap === null
      ? "At least one named principal has an unknown sustain-gap response."
      : `Named-principal sustain-gap response includes No/Stretch: ${gap}.`,
  ];
  const records = PROCEED_BIAS_SIGNAL_IDS.map((id, index) => ({
    id,
    present: values[index],
    sourceRef: defaultRefs[index],
    basis: bases[index],
  }));
  const unresolved = records.filter((record) => record.present === null).map((record) => record.id);
  const signals: ProceedBiasSignals = {
    any_critical_acknowledged_m02_structural_risk: critical,
    material_m02_r_pattern_count: material === null ? null : materialCandidates,
    m02_diagnosis_structural_negative: diagnosisStructural,
    m02_diagnosis_cyclical: diagnosisCyclical,
    any_m02_structural_risk_disputed: disputedRisk,
    m03_contrarian_trap_unresolved: trap,
    m04_cost_materially_exceeds_m03_cost_estimate: cost,
    can_sustain_gap_no_or_stretch: gap,
  };
  return { signals, records, unresolved };
}
