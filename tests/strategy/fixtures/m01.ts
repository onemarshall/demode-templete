import { ANCHOR_KEYS } from "../../../src/lib/modules/strategy/server/stages/m01/synthesis";
import type { M01Input, M01Outputs } from "../../../src/lib/modules/strategy/server/stages/m01/session";
import type { SetTwo } from "../../../src/lib/modules/strategy/server/stages/m01/handoff";
import { ELEMENTS } from "../../../src/lib/modules/strategy/server/stages/m01/preparation";

/** Fictional domain regression data. It contains no client testimony or source material. */
export const m01Source: M01Input = {
  eligible: true,
  folder: "synthetic-founder",
  engagement: "strategy development",
  entry: { approved: true },
  parts: [{ file: "intake.md", text: "Synthetic evidence only." }],
};

export const m01Plan = () => ({
  summary: "A synthetic pilot plan used only to exercise the M01 workflow.",
  elements: ELEMENTS.map((element) => ({
    element,
    coverage: "Partial" as const,
    feedback: "Synthetic feedback for the test fixture only.",
    evidence: ["Synthetic evidence reference"],
    questions: ["A synthetic interview question?"],
  })),
});

const sentences: Record<(typeof ANCHOR_KEYS)[number], string> = {
  "The Broken Thing": "I watched good people quietly stop believing their work mattered.",
  "The Hidden Truth": "The damage was never the workload; it was the silence around it.",
  "Market-Deployable Hidden Truth": "Teams do not leave over pay; they leave over unspoken expectations.",
  "The Non-Negotiable": "I will not sell a process I would not follow myself.",
  "The Hard-Won Teaching": "I learned that naming the thing early costs less than naming it late.",
  "The Legacy": "A practice where the difficult conversation happens on purpose.",
  "Core Belief": "I believe that unspoken expectations quietly destroy good teams, and therefore I must name them out loud.",
};

/** Stable, synthetic output matching the historic M01 fixture byte-for-byte. */
export function m01Outputs(): M01Outputs {
  const languageBank = ["conviction", "friction", "cost", "risk", "proof", "objection", "urgency", "differentiation"].map((category) => ({ category, phrases: [`A synthetic ${category} phrase.`, `A second ${category} phrase.`, `A third ${category} phrase.`] }));
  return {
    producedAt: "2026-10-20T00:00:00.000Z",
    model: "synthetic-pilot-model",
    status: { anchors: "candidate", manifesto: "candidate", languageBank: "candidate", evidenceMatrix: "candidate" },
    anchorStatus: Object.fromEntries(ANCHOR_KEYS.map((key) => [key, "candidate" as const])),
    anchorNotes: {}, bankFlags: [], publicRecordReadiness: { state: "not-assessed", sentence: "" }, readinessConfirmed: false,
    factsAnchor: { status: "candidate", items: [{ fact: "A synthetic recorded fact.", detail: "Fixture only; no real testimony." }] },
    notes: { anchors: "Synthetic note.", manifesto: "Synthetic note.", languageBank: "Synthetic note.", evidenceMatrix: "Synthetic note." },
    outputs: {
      anchors: ANCHOR_KEYS.map((key) => ({ key, sentence: sentences[key] })),
      manifesto: "A synthetic manifesto paragraph that carries the conviction without claiming any real evidence. ".repeat(12),
      languageBank,
      evidenceMatrix: [
        { claim: "A synthetic evidenced claim.", zone: "Fact", evidence: [{ item: "Synthetic evidence item.", category: "observed" }] },
        { claim: "A second synthetic evidenced claim.", zone: "Thesis", evidence: [{ item: "Synthetic evidence item.", category: "reported" }] },
        { claim: "A third synthetic evidenced claim.", zone: "Belief", evidence: [{ item: "Synthetic evidence item.", category: "inferred" }] },
      ],
      claimsBoundaryInputs: { canClaim: ["A synthetic claim.", "A second synthetic claim.", "A third synthetic claim."], mustQualify: ["A synthetic qualified claim."], cannotClaim: ["A synthetic prohibited claim."] },
    },
  };
}

export function m01SetTwo(): SetTwo {
  return {
    noLongerBelief: "That silence around expectations keeps a team safe.",
    rulesOut: "Any engagement that depends on withholding the difficult conversation.",
    purpose: "To make the difficult conversation ordinary.",
    values: [{ name: "Directness", protects: "The team's ability to trust what it is told.", rejects: "Managing upwards by omission.", tested: "Saying the unwelcome thing early." }],
    beliefShift: { from: "Naming expectations is risky.", to: "Naming expectations is the job." },
  };
}

export const m01ReviewAnswers = () => ({ depth: "pass", recognition: "pass", coherence: "pass", prospective: "pass", "four-signals": "pass", distillation: "pass" } as const);
export const m01SourceAuthority = { type: "single founder / owner", name: "Synthetic founder", materialUsed: "intake.md" };
