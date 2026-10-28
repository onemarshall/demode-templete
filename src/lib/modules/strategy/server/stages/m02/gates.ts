import { z } from "zod";
import type { ReconLog } from "./session";

// ---------- Gate 1 draft (model decode of competitor artifacts) ----------

export const Gate1Draft = z.object({
  decodes: z
    .array(
      z.object({
        competitor: z.string(),
        beliefs: z
          .array(
            z.object({
              belief: z.string(),
              confidence: z.enum(["high", "medium", "low"]),
              vulnerability: z.string().default(""),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  descriptiveDefault: z.string().default(""),
  cohort: z.string().default(""),
  concentration: z.enum(["competitive", "concentrated"]).default("competitive"),
});

export type Gate1Draft = z.infer<typeof Gate1Draft>;

export const TerrainBody = z.object({
  tam: z.string().default(""),
  trajectory: z.enum(["growing", "stable", "declining"]).nullable().default(null),
  tailwind: z.string().default(""),
  diagnosis: z.enum([
    "cyclical",
    "structural-positive",
    "structural-negative",
    "ambiguous-needs-evidence",
  ]),
  diagnosisEvidence: z.string().default(""),
});

export type TerrainBody = z.infer<typeof TerrainBody>;

export const Gate1Body = z.object({
  decodes: z
    .array(
      z.object({
        competitor: z.string().min(1),
        beliefs: z
          .array(
            z.object({
              belief: z.string().min(1, "Empty belief — remove it or write it"),
              confidence: z.enum(["high", "medium", "low"]),
              vulnerability: z.string().default(""),
            }),
          )
          .min(1, "Each decoded competitor needs at least one belief"),
      }),
    )
    .min(1, "Decode at least one competitor — no artefact, no claim"),
  descriptiveDefault: z.string().min(1, "Synthesise the default in one sentence"),
  cohort: z.string().min(1, "Name the cohort this default governs"),
  concentration: z.enum(["competitive", "concentrated"]),
  verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
  finding: z.string().default(""),
});

export type Gate1Body = z.infer<typeof Gate1Body>;

export function requireGate(recon: ReconLog, gate: "gate1" | "gate2" | "gate3" | "gate4") {
  if (recon[gate].verdict !== "pass")
    throw new Error(`${gate} hasn't passed — the vacuum gates run in order`);
}

export function artifactBlocks(
  arts: {
    target: string;
    id: string;
    source: string;
    url?: string;
    title?: string;
    verbatim: string;
    summary?: string;
  }[],
  cap = 8,
  chars = 2500,
) {
  return arts
    .slice(0, cap)
    .map(
      (a) =>
        `--- ${a.target} (${a.id}) — ${a.source}${a.url ? ` — ${a.url}` : ""}${a.title ? `\nTitle: ${a.title}` : ""}\n${(a.verbatim || a.summary || "").slice(0, chars)}`,
    );
}

// ---------- Gate 2 — Vulnerable? ----------

export const Gate2Draft = z.object({
  vulnerabilityEvidence: z.string().default(""),
  defendersCase: z.string().default(""),
  rebuttal: z.string().default(""),
});

export type Gate2Draft = z.infer<typeof Gate2Draft>;

export const Gate2Body = Gate2Draft.extend({
  artifactRefs: z.array(z.string()).default([]),
  verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
  finding: z.string().default(""),
});

export type Gate2Body = z.infer<typeof Gate2Body>;

// ---------- Gate 3 — Customer pain ----------

export const Gate3Draft = z.object({
  trigger: z.string().default(""),
  hack: z.string().default(""),
  pain: z.string().default(""),
  limitingBelief: z.string().default(""),
  traceToDefault: z.string().default(""),
});

export type Gate3Draft = z.infer<typeof Gate3Draft>;

export const Gate3Body = Gate3Draft.extend({
  artifactRefs: z.array(z.string()).default([]),
  verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
  finding: z.string().default(""),
});

export type Gate3Body = z.infer<typeof Gate3Body>;

// ---------- Gate 4 — Willingness to pay ----------

export const Gate4Draft = z.object({
  priceRange: z.string().default(""),
  evidence: z.string().default(""),
});

export type Gate4Draft = z.infer<typeof Gate4Draft>;

export const Gate4Body = Gate4Draft.extend({
  artifactRefs: z.array(z.string()).default([]),
  verdict: z.enum(["pass", "fail", "evidence-insufficient"]),
  finding: z.string().default(""),
});

export type Gate4Body = z.infer<typeof Gate4Body>;

// ---------- Gate 5 — Structural Strategic Risk (Condition Gate) ----------

export const RISK_PATTERNS = [
  {
    id: "r1",
    name: "Revenue concentration",
    threshold: "any source >25% of revenue, or top 2 >50% combined",
  },
  {
    id: "r2",
    name: "TAM trajectory",
    threshold: "cohort shrinking >3%/yr, consolidation, or regulatory absorption",
  },
  {
    id: "r3",
    name: "Demand-source fragility",
    threshold: "a single mechanism produces >60% of inbound, or only one is in use",
  },
  {
    id: "r4",
    name: "Founder-as-business risk",
    threshold: "solo founder with no succession, or single-point-of-failure on relationships",
  },
] as const;

export type RiskPattern = (typeof RISK_PATTERNS)[number]["id"];

export const RISK_LABEL: Record<RiskPattern, string> = Object.fromEntries(
  RISK_PATTERNS.map((p) => [p.id, p.name]),
) as Record<RiskPattern, string>;

const RiskDraftRow = z.object({
  pattern: z.enum(["r1", "r2", "r3", "r4"]),
  state: z.enum(["present", "absent", "unclear"]),
  evidence: z.string().default(""),
  severity: z.enum(["manageable", "material", "critical"]).nullable().default(null),
  mitigationRouting: z.enum(["m03", "m04", "m11", "external"]).nullable().default(null),
  acknowledgmentLine: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export const Gate5Draft = z.object({ risks: z.array(RiskDraftRow).default([]) });

export type Gate5Draft = z.infer<typeof Gate5Draft>;

export const Gate5Body = z.object({
  risks: z
    .array(
      RiskDraftRow.extend({
        declined: z.boolean().default(false),
        dispute: z.string().default(""),
      }),
    )
    .min(4, "All four patterns need a read — present, absent or unclear"),
});

export type Gate5Body = z.infer<typeof Gate5Body>;

// ---------- Gate 6 — Hidden Truth (two sub-tests) ----------

export const Gate6Draft = z.object({
  implication: z.string().default(""),
  traceSentence: z.string().default(""),
});

export type Gate6Draft = z.infer<typeof Gate6Draft>;

export const Gate6Body = z.object({
  implication: z.string().min(1, "Write the 6a implication"),
  traceSentence: z.string().min(1, "Write the 6b trace sentence"),
  // The removal test: read the trace sentence with the hidden truth
  // removed — does the vacuum still stand? If yes, the truth isn't
  // load-bearing and 6b fails.
  standsWithoutTruth: z.boolean({
    error: "Answer the removal test — does the vacuum still stand without the Hidden Truth?",
  }),
  artifactRefs: z.array(z.string()).default([]),
  verdictA: z.enum(["pass", "fail", "evidence-insufficient"]),
  verdictB: z.enum(["pass", "fail", "evidence-insufficient"]),
  finding: z.string().default(""),
});

export type Gate6Body = z.infer<typeof Gate6Body>;

// ---------- Outcome (entanglement + contrarian trap + synthesis) ----------

// Which outcomes the recorded verdicts actually permit — computed, not chosen.
// `blocked` covers the case the enum honestly can't express: every gate passes
// but the collection is partial — no outcome is recordable until the log is
// completed or the gaps are owned up front.
export function allowedOutcomes(
  recon: ReconLog,
  collectionState: string | null,
): { options: { outcome: string; reason: string }[]; blocked: string | null } {
  const prerequisitesPass =
    recon.preconditions.p1.verdict === "pass" &&
    recon.preconditions.p2.verdict === "pass" &&
    recon.preconditions.p3.verdict === "pass";
  const earlyGatesPass =
    recon.gate1.verdict === "pass" &&
    recon.gate2.verdict === "pass" &&
    recon.gate3.verdict === "pass";
  const g6Fail = recon.gate6.a.verdict === "fail" || recon.gate6.b.verdict === "fail";
  const riskRowsComplete =
    recon.gate5.risks.length === 4 &&
    recon.gate5.risks.every(
      (risk) =>
        risk.state !== "pending" &&
        (risk.state !== "present" ||
          (!!risk.mitigationRouting &&
            (risk.acknowledgment.declined
              ? !!risk.acknowledgment.dispute.trim()
              : !!risk.acknowledgment.signedBy &&
                !!risk.acknowledgment.signedAt &&
                !!risk.acknowledgment.line.trim()))),
    );
  const allPass =
    prerequisitesPass &&
    earlyGatesPass &&
    recon.gate4.verdict === "pass" &&
    recon.gate6.a.verdict === "pass" &&
    recon.gate6.b.verdict === "pass" &&
    recon.entanglement.pass === true &&
    riskRowsComplete &&
    recon.contrarianTrap.flags.length === 0;
  const options: { outcome: string; reason: string }[] = [];
  if (allPass) {
    if (collectionState === "completed")
      options.push({
        outcome: "provisional_a",
        reason:
          "All gates pass — internal hypothesis-grade evidence permits provisional M03 work only",
      });
    else
      return {
        options: [],
        blocked:
          "Every gate passes but the collection is partial — an Outcome A cannot be claimed on an incomplete log. Complete the missing items in Artifacts, or re-review the log honestly, before a verdict is recorded.",
      };
  } else if (prerequisitesPass && earlyGatesPass && recon.gate4.verdict === "pass" && g6Fail) {
    options.push({
      outcome: "outcome_c",
      reason:
        "Gate 6 failed — the hidden truth isn't evidenced here or the vacuum doesn't trace to it",
    });
  } else if (prerequisitesPass && earlyGatesPass && recon.gate4.verdict === "fail") {
    options.push({
      outcome: "outcome_b",
      reason:
        "Gates 1–3 pass, but Gate 4 does not establish willingness to pay at a sustainable price",
    });
  } else {
    return {
      options: [],
      blocked:
        "Resolve the earliest failed or incomplete prerequisite/vacuum gate before recording an outcome; later outcomes cannot skip an earlier failed gate.",
    };
  }
  return {
    options,
    blocked: options.length
      ? null
      : "The verdicts don't reach a recordable outcome — check the gate states above.",
  };
}

export const OutcomeBody = z.object({
  outcome: z.enum(["provisional_a", "validated_a", "outcome_b", "outcome_c"]),
  statement: z.string().min(1, "Write the outcome statement"),
  contrarianFlags: z.array(z.string()).default([]),
});

export type OutcomeBody = z.infer<typeof OutcomeBody>;

export const EvidenceReviewBody = z.object({
  disposition: z.enum(["sufficient_for_provisional", "insufficient", "contested"]),
  rationale: z.string().trim().min(1),
  confirmedBy: z.string().trim().min(1),
});

export type EvidenceReviewBody = z.infer<typeof EvidenceReviewBody>;
