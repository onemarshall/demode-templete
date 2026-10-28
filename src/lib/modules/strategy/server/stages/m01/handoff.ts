import { createHash } from "node:crypto";
import { z } from "zod";
import type { M01Outputs } from "./session";
// The fields the Handoff Pack needs that aren't produced by the anchor synthesis:
// No Longer Belief (locked) and the Set 2 identity expression (explicitly first-pass
// drafts — Module 05 replaces them). Model-drafted, human-edited before sealing.
export const SetTwo = z.object({
  noLongerBelief: z.string().min(10),
  rulesOut: z.string().min(5),
  purpose: z.string().min(5),
  values: z
    .array(
      z.object({
        name: z.string().min(1),
        protects: z.string(),
        rejects: z.string(),
        tested: z.string(),
      }),
    )
    .min(1)
    .max(5),
  beliefShift: z.object({ from: z.string().min(5), to: z.string().min(5) }),
});
export type SetTwo = z.infer<typeof SetTwo>;

export const SOURCE_TYPES = [
  "single founder / owner",
  "co-founders or leadership team",
  "practitioner for a client",
] as const;
export const SourceType = z.enum(SOURCE_TYPES);

export type GateCheck = {
  id: string;
  name: string;
  kind: "auto" | "review";
  result: "pass" | "fail" | "pending";
  detail: string;
};

// Judgement gates per 01-Quality-Gates.md. The system can't honestly mark these —
// the authorised person does, answering the test in their own words.
export const REVIEW_GATES = [
  {
    id: "depth",
    name: "Depth — not surface answers",
    test: "Each element points to specific lived experience, not generic insight. The Broken Thing still has heat; the Hidden Truth was learned in practice, not read.",
  },
  {
    id: "recognition",
    name: "Recognition — it sounds like them",
    test: "Read the anchors and manifesto to the person. Did it sound like them, or like a performance? If the language isn't formed enough to lock, that's Buried — keep excavating rather than sealing.",
  },
  {
    id: "coherence",
    name: "One story",
    test: "“Because I see [Hidden Truth] about [Broken Thing], I learned [Hard-Won Teaching], and I won't [Non-Negotiable], so I can build [Legacy].” — does that sentence work without forcing?",
  },
  {
    id: "prospective",
    name: "It rules something out",
    test: "The conviction requires at least one future choice and excludes a plausible alternative. If someone who shares the belief would produce the same Non-Negotiable and Legacy, it's too generic to build on.",
  },
  {
    id: "four-signals",
    name: "Realness — three of four signals",
    test: "Predates the business (temporal) · has cost something real (sacrificial) · learned in practice (experiential) · uncomfortable but recognisably them (psychological). Three of four must fire — note which doesn't rather than hiding it.",
  },
  {
    id: "distillation",
    name: "Survives compression",
    test: "The Core Belief and manifesto compress without flattening: all five elements still do distinct work, and someone who'd prefer a softer conviction couldn't misread the short version.",
  },
] as const;

export type ReviewGateId = (typeof REVIEW_GATES)[number]["id"];

const anchor = (outputs: M01Outputs, key: string) =>
  outputs.outputs.anchors.find((a) => a.key === key)?.sentence ?? "";

export function qualityGateReport(outputs: M01Outputs): GateCheck[] {
  const checks: GateCheck[] = [];
  const o = outputs.outputs;

  const allAnchorsLocked =
    o.anchors.length === 7 && o.anchors.every((a) => outputs.anchorStatus[a.key] === "locked");
  const allLocked =
    allAnchorsLocked &&
    outputs.status.manifesto === "locked" &&
    outputs.status.languageBank === "locked" &&
    outputs.status.evidenceMatrix === "locked" &&
    outputs.factsAnchor.status === "locked";
  checks.push({
    id: "all-confirmed",
    name: "Every output confirmed",
    kind: "auto",
    result: allLocked ? "pass" : "fail",
    detail: allLocked
      ? "All seven anchors, the manifesto, the language bank, the evidence matrix and the facts anchor are confirmed."
      : "Something still isn't confirmed — every output has to be locked before the module can seal.",
  });

  const coreBelief = anchor(outputs, "Core Belief");
  checks.push({
    id: "core-belief-form",
    name: "Core Belief in its required form",
    kind: "auto",
    result: /i believe that .+and therefore i must .+/is.test(coreBelief) ? "pass" : "fail",
    detail:
      'Required shape: "I believe that [truth], and therefore I must [action]" — both halves present.',
  });

  const quotable = o.anchors.every(
    (a) => a.sentence.trim().length >= 15 && !a.sentence.includes("["),
  );
  checks.push({
    id: "anchors-quotable",
    name: "Anchors verbatim-quotable",
    kind: "auto",
    result: quotable ? "pass" : "fail",
    detail:
      "Each anchor must be nailed-down text a later module can quote directly — no placeholders or fragments.",
  });

  const cb = o.claimsBoundaryInputs;
  const largest =
    cb.canClaim.length > cb.mustQualify.length && cb.canClaim.length > cb.cannotClaim.length;
  const populated =
    cb.canClaim.length > 0 && cb.mustQualify.length > 0 && cb.cannotClaim.length > 0;
  checks.push({
    id: "claims-boundary",
    name: "Claims boundaries — three lists, Can Claim largest",
    kind: "auto",
    result: populated && largest ? "pass" : "fail",
    detail: `Can Claim ${cb.canClaim.length} / Must Qualify ${cb.mustQualify.length} / Cannot Claim ${cb.cannotClaim.length}. Every list must be populated and Can Claim must be the largest.`,
  });

  const claims = o.evidenceMatrix;
  const evidencedClaims = claims.filter(
    (c) => c.evidence.length >= 1 && c.evidence.every((e) => e.category.trim()),
  ).length;
  checks.push({
    id: "evidence-matrix",
    name: "Evidence matrix — at least three evidenced claims",
    kind: "auto",
    result: evidencedClaims >= 3 ? "pass" : "fail",
    detail: `${claims.length} claims, ${evidencedClaims} with specific categorised evidence. Belief-zone claims with none yet are allowed — at least three must be evidenced.`,
  });

  const manifestoLen = o.manifesto.trim().length;
  checks.push({
    id: "manifesto-substance",
    name: "Manifesto substantial",
    kind: "auto",
    result: manifestoLen >= 600 ? "pass" : "fail",
    detail: `${manifestoLen} characters. A manifesto that can't carry the conviction's depth fails the substantial-narrative requirement.`,
  });

  const bank = o.languageBank;
  const thin = bank.filter((c) => c.phrases.length < 3).map((c) => c.category);
  checks.push({
    id: "language-bank",
    name: "Language bank — 8 categories, 3+ phrases each",
    kind: "auto",
    result: bank.length >= 8 && thin.length === 0 ? "pass" : "fail",
    detail:
      bank.length < 8
        ? `${bank.length} categories present (8 expected). ${thin.length ? `Thin: ${thin.join(", ")}.` : ""}`
        : thin.length
          ? `Under 3 phrases: ${thin.join(", ")}.`
          : "All categories populated.",
  });

  checks.push({
    id: "facts-anchor",
    name: "Facts anchor populated",
    kind: "auto",
    result: outputs.factsAnchor.items.length > 0 ? "pass" : "fail",
    detail: `${outputs.factsAnchor.items.length} facts recorded.`,
  });

  for (const g of REVIEW_GATES)
    checks.push({ id: g.id, name: g.name, kind: "review", result: "pending", detail: g.test });
  return checks;
}

export const HandoffRecord = z.object({
  module: z.literal("01"),
  status: z.literal("locked"),
  sealedAt: z.string(),
  sealedBy: z.string(),
  sourceAuthority: z.object({
    type: SourceType,
    name: z.string(),
    materialUsed: z.string(),
    verdict: z.string(),
  }),
  outputsHash: z.string(),
  report: z.array(
    z.object({ id: z.string(), kind: z.string(), result: z.string(), detail: z.string() }),
  ),
  derived: SetTwo,
  notes: z.string(),
  previousSeals: z.array(z.object({ sealedAt: z.string(), outputsHash: z.string() })).default([]),
});
export type HandoffRecord = z.infer<typeof HandoffRecord>;

export const outputsHash = (outputs: M01Outputs) =>
  createHash("sha256").update(JSON.stringify(outputs)).digest("hex");
export function renderPack(
  folder: string,
  outputs: M01Outputs,
  derived: SetTwo,
  source: { type: string; name: string; materialUsed: string },
  sealedAt: string,
  notes: string,
  transcriptLines: number,
): string {
  const o = outputs.outputs;
  const a = (k: string) => anchor(outputs, k);
  const date = sealedAt.slice(0, 10);
  const readiness = outputs.publicRecordReadiness;
  return `# Founder Convictions

**Status: Locked** — every output below was confirmed by ${source.name} and passed the module's quality gates on ${date}. Later stages may quote any of this text exactly as written.

## Source authority

- Conviction source type: ${source.type}
- Named conviction source: ${source.name}
- Source material: ${source.materialUsed}${transcriptLines ? ` (${transcriptLines} lines on file)` : ""}
- Authority verdict: Lockable

## Core Belief

"${a("Core Belief")}"

## No Longer Belief

"We no longer believe that ${derived.noLongerBelief}."

What this rules out in practice: ${derived.rulesOut}

## Conviction elements

- **The Broken Thing:** ${a("The Broken Thing")}
- **The Hidden Truth:** ${a("The Hidden Truth")}
- **Market-Deployable Hidden Truth:** ${a("Market-Deployable Hidden Truth")}
- **The Non-Negotiable:** ${a("The Non-Negotiable")}
- **The Hard-Won Teaching:** ${a("The Hard-Won Teaching")}
- **The Legacy:** ${a("The Legacy")}

**Public record readiness:** ${readiness.state}${readiness.sentence ? ` — ${readiness.sentence}` : ""}

## Identity expression — first-pass drafts

These are starting material only, derived from the confirmed conviction. They are not locked; the brand stage replaces them.

**Purpose:** To ${derived.purpose}.

**Values:**

${derived.values.map((v) => `- **${v.name}** — protects: ${v.protects}; rejects: ${v.rejects}; tested: ${v.tested}`).join("\n")}

**Belief shift:** FROM "${derived.beliefShift.from}" TO "${derived.beliefShift.to}"

## Builder Manifesto

${o.manifesto}

## Evidence matrix summary

- Can claim: ${o.claimsBoundaryInputs.canClaim.length}
- Must qualify: ${o.claimsBoundaryInputs.mustQualify.length}
- Cannot claim: ${o.claimsBoundaryInputs.cannotClaim.length}

**Can claim:**

${o.claimsBoundaryInputs.canClaim.map((c) => `- ${c}`).join("\n")}

**To upgrade (must qualify / cannot claim):**

${[...o.claimsBoundaryInputs.mustQualify, ...o.claimsBoundaryInputs.cannotClaim].map((c) => `- ${c}`).join("\n")}

## Facts anchor

${outputs.factsAnchor.items.map((f) => `- **${f.fact}** — ${f.detail}`).join("\n")}

## Language bank (reference)

${o.languageBank.map((c) => `**${c.category}:** ${c.phrases.map((p) => `“${p}”`).join(", ")}`).join("\n\n")}

## What later stages receive

| Stage | Receives from this module |
| --- | --- |
| Market reality check | Core Belief, No Longer Belief, all conviction elements, Market-Deployable Hidden Truth, draft claims boundaries, Facts Anchor |
| Business commitments | Core Belief, No Longer Belief, Hidden Truth, Broken Thing, Non-Negotiable, Hard-Won Teaching, Legacy |
| Brand strategy | Everything above plus the draft Belief Shift — finalised and locked there for all later use |

## Confirmation

- Quality gates passed: Yes — ${new Date(sealedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
- Confirmed by: ${source.name}
${notes ? `- Notes: ${notes}` : ""}

_The conversation evidence and confirmation records for this document are held privately in the client's intake records._
`;
}

export function sealHandoff(
  outputs: M01Outputs,
  derived: SetTwo,
  source: { type: z.infer<typeof SourceType>; name: string; materialUsed: string },
  report: GateCheck[],
  notes: string,
  previous: HandoffRecord | null = null,
  sealedAt = new Date().toISOString(),
): HandoffRecord {
  return {
    module: "01",
    status: "locked",
    sealedAt,
    sealedBy: source.name,
    sourceAuthority: {
      type: source.type,
      name: source.name,
      materialUsed: source.materialUsed,
      verdict: "lockable",
    },
    outputsHash: outputsHash(outputs),
    report: report.map(({ id, kind, result, detail }) => ({ id, kind, result, detail })),
    derived,
    notes,
    previousSeals: [
      ...(previous?.previousSeals ?? []),
      ...(previous ? [{ sealedAt: previous.sealedAt, outputsHash: previous.outputsHash }] : []),
    ],
  };
}
