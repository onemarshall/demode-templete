import { z } from "zod";
import type { IntakePlan } from "./preparation";
import type { M01Outputs } from "./session";

export const ANCHOR_KEYS = [
  "The Broken Thing",
  "The Hidden Truth",
  "Market-Deployable Hidden Truth",
  "The Non-Negotiable",
  "The Hard-Won Teaching",
  "The Legacy",
  "Core Belief",
] as const;

const toAnchorArray = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v
      : v && typeof v === "object"
        ? Object.entries(v).map(([key, sentence]) => ({ key, sentence }))
        : v,
  z
    .array(z.object({ key: z.string().min(1), sentence: z.string().min(1) }))
    .refine(
      (items) =>
        items.length === ANCHOR_KEYS.length && ANCHOR_KEYS.every((k, i) => items[i]?.key === k),
      { message: `Anchors must contain exactly these keys, in order: ${ANCHOR_KEYS.join(", ")}` },
    ),
);

const toBankArray = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v
      : v && typeof v === "object"
        ? Object.entries(v).map(([category, phrases]) => ({
            category,
            phrases: Array.isArray(phrases) ? phrases : [String(phrases)],
          }))
        : v,
  z
    .array(z.object({ category: z.string().min(1), phrases: z.array(z.string().min(1)).min(1) }))
    .min(1),
);

const evidenceItemSchema = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v.map((e) => {
          if (e && typeof e === "object" && !("item" in e)) {
            const { category, ...rest } = e as Record<string, unknown>;
            const first = Object.values(rest).find((x) => typeof x === "string" && x.length > 0);
            return { item: first, category };
          }
          return e;
        })
      : v,
  z.array(
    z.object({
      item: z.string().min(1),
      category: z.string().transform((c) => c.trim() || "uncategorised"),
    }),
  ),
);

const evidenceMatrixSchema = z.array(
  z.object({
    claim: z.string().min(1),
    zone: z.enum(["Fact", "Thesis", "Belief"]),
    evidence: evidenceItemSchema,
  }),
);

const claimsBoundarySchema = z.object({
  canClaim: z.array(z.string().min(1)).min(1),
  mustQualify: z.array(z.string().min(1)).min(1),
  cannotClaim: z.array(z.string().min(1)).min(1),
});

const Synthesised = z.object({
  anchors: toAnchorArray,
  manifesto: z.string().min(200),
  languageBank: toBankArray,
  evidenceMatrix: evidenceMatrixSchema,
  claimsBoundaryInputs: claimsBoundarySchema,
  factsAnchor: z.array(z.object({ fact: z.string().min(1), detail: z.string() })).default([]),
  publicRecordReadiness: z
    .object({
      state: z.enum(["ready", "not-yet-concrete", "not-assessed"]).catch("not-assessed"),
      sentence: z.string().catch(""),
    })
    .catch({ state: "not-assessed", sentence: "" }),
});

const RULES = `You are drafting candidate conviction outputs from a recorded conviction conversation. Only the speaker's own words may be quoted. Anything you infer is marked as inference, never as fact.

Draft these, from the transcript only:

1. anchors — seven short statements, one per key, each a single sentence, in the speaker's own language. Keys in order: ${ANCHOR_KEYS.join(" | ")}.
   - "Core Belief" uses the form "I believe that [Hidden Truth about the Broken Thing], and therefore I must [action the Legacy demands]".
   - "Market-Deployable Hidden Truth" keeps the same meaning but makes the market consequence concrete enough to check. If you cannot preserve the meaning, write "translation-failure" in the sentence field.

2. manifesto — a first-person manifesto, written the way manifestos actually read: short declarative lines, one idea per line, no paragraphs of prose. Group the lines into a few movements separated by blank lines — what's broken, what the speaker knows that others don't, what they refuse to do, what they paid to learn, what changes if they win. Keep it tight: around 30–40 lines total, not a retelling. Compress each story into two or three lines that carry the force, not the full account. Every line must be in the speaker's own words or a direct compression of something they said — no committee language, no filler, no marketing voice.

3. languageBank — verbatim phrases from the transcript only, grouped into these categories: repeated vocabulary, high-energy phrases, natural problem description, natural solution description, the misunderstanding gap, emotional core, customer language, first-impression intent. No paraphrasing.

4. evidenceMatrix — the claims the conviction depends on. For each: the claim in the speaker's words, its zone (Fact, Thesis or Belief), and its evidence items with their category (pre-product personal observation, customer self-report, third-party research, product-generated data). Mark honestly: a claim with no evidence is a Belief, and that is not a failure.

5. claimsBoundaryInputs — three lists. canClaim: what the speaker's statements support. mustQualify: what's partly supported. cannotClaim: what the evidence does not support at all. Each list non-empty.

6. factsAnchor — the specific facts most likely to drift later. For each: fact (the exact figure, name, date or claim — numbers must carry their unit and currency) and detail (where it came from and its limit, e.g. "speaker's own observation, one instance", "customer told them", "approximate"). Include mechanism distinctions (a load-bearing word or phrase, and the wrong version it could drift into) and claim-source pairs where the conversation supplied them.

7. publicRecordReadiness — could strangers eventually recognise, understand and associate this conviction with this speaker? state is one of ready, not-yet-concrete, not-assessed; sentence is one supporting sentence.

Never invent a fact, a name, a number or a quote. If the transcript lacks it, leave it out and say so in the item's wording.

Return only JSON matching the keys above.`;

const contextBlock = (plan: IntakePlan, transcript: string[], note: string) =>
  `INTAKE SUMMARY\n${plan.summary}\n\nPLANNED QUESTIONS\n${plan.elements
    .map((e) => `${e.element}: ${e.questions.join(" / ")}`)
    .join(
      "\n",
    )}\n\nTRANSCRIPT (verbatim lines)\n${transcript.join("\n")}\n\nPERSON'S NOTE BEFORE STARTING\n${note || "none"}`;

export type ModelCall = (system: string, user: string) => Promise<unknown>;
export async function synthesise(
  plan: IntakePlan,
  transcript: string[],
  note: string,
  callModel: ModelCall,
  model: string,
): Promise<M01Outputs> {
  const parsed = Synthesised.parse(await callModel(RULES, contextBlock(plan, transcript, note)));

  return {
    producedAt: new Date().toISOString(),
    model,
    status: {
      anchors: "candidate",
      manifesto: "candidate",
      languageBank: "candidate",
      evidenceMatrix: "candidate",
    },
    anchorStatus: Object.fromEntries(ANCHOR_KEYS.map((k) => [k, "candidate" as const])),
    anchorNotes: {},
    bankFlags: [],
    publicRecordReadiness: parsed.publicRecordReadiness,
    readinessConfirmed: false,
    factsAnchor: { status: "candidate", items: parsed.factsAnchor },
    notes: { anchors: "", manifesto: "", languageBank: "", evidenceMatrix: "" },
    outputs: {
      anchors: parsed.anchors,
      manifesto: parsed.manifesto,
      languageBank: parsed.languageBank,
      evidenceMatrix: parsed.evidenceMatrix,
      claimsBoundaryInputs: parsed.claimsBoundaryInputs,
    },
  };
}

export async function reviseAnchor(
  key: string,
  current: string,
  note: string,
  plan: IntakePlan,
  transcript: string[],
  preNote: string,
  callModel: ModelCall,
  _model: string,
): Promise<string> {
  const out = await callModel(
    `You are re-drafting one conviction anchor sentence from a recorded conversation. The sentence must be in the speaker's own language, drawn from the verbatim transcript — never invent words, names, numbers or facts. It must be a single sentence the speaker could commit to verbatim.${key === "Core Belief" ? ' It must use the form "I believe that [X], and therefore I must [Y]".' : ""} Return only JSON {"sentence": "..."}.`,
    `${contextBlock(plan, transcript, preNote)}\n\nANCHOR TO RE-DRAFT: ${key}\nCURRENT DRAFT: ${current}\nWHAT THE PERSON FLAGGED: ${note || "they did not commit to it — offer a better phrasing from their own words"}`,
  );
  const parsed = z.object({ sentence: z.string().min(1) }).safeParse(out);
  if (!parsed.success) throw new Error("Anchor revision returned no sentence");
  return parsed.data.sentence;
}

export async function reviseManifesto(
  current: string,
  note: string,
  plan: IntakePlan,
  transcript: string[],
  preNote: string,
  callModel: ModelCall,
  _model: string,
): Promise<string> {
  const out = await callModel(
    `You are re-shaping a conviction manifesto drafted from a recorded conversation. Re-draft the whole thing in true manifesto form: short declarative first-person lines, one idea per line, movements separated by blank lines — what's broken, what the speaker knows, what they refuse to do, what they paid to learn, what changes if they win. Lines like "Every fault starts with a fixed, known cost." or "I will not fit a part I haven't proven faulty." — not paragraphs. Keep it tight: around 30–40 lines total. Compress each story into two or three lines that carry the force; the full detail can stay out. Keep the speaker's concrete words, names and numbers where they carry weight; only the shape and length change. Apply the person's feedback if given. Return only JSON {"manifesto": "..."}.`,
    `${contextBlock(plan, transcript, preNote)}\n\nCURRENT MANIFESTO:\n${current}\n\nWHAT THE PERSON FLAGGED: ${note || "revise so it reads more like their actual conviction in their actual language"}`,
  );
  const parsed = z.object({ manifesto: z.string().min(200) }).safeParse(out);
  if (!parsed.success) throw new Error("Manifesto revision failed");
  return parsed.data.manifesto;
}

export async function reviseEvidenceMatrix(
  current: unknown,
  note: string,
  plan: IntakePlan,
  transcript: string[],
  preNote: string,
  callModel: ModelCall,
  _model: string,
): Promise<{
  evidenceMatrix: z.infer<typeof evidenceMatrixSchema>;
  claimsBoundaryInputs: z.infer<typeof claimsBoundarySchema>;
}> {
  const out = await callModel(
    `You are revising an evidence matrix drafted from a recorded conversation. Each claim stays in the speaker's words with an honest zone — Fact (multiple categorised evidence items), Thesis (some evidence), Belief (none yet, which is not a failure). Evidence categories: pre-product personal observation, customer self-report, third-party research, product-generated data. Apply the person's feedback; change nothing else. Also refresh claimsBoundaryInputs (canClaim / mustQualify / cannotClaim, each non-empty) so it stays consistent with the matrix. Return only JSON {"evidenceMatrix": [...], "claimsBoundaryInputs": {...}}.`,
    `${contextBlock(plan, transcript, preNote)}\n\nCURRENT MATRIX:\n${JSON.stringify(current)}\n\nWHAT THE PERSON FLAGGED: ${note || "check the claims and zones read as fair"}`,
  );
  const parsed = z
    .object({ evidenceMatrix: evidenceMatrixSchema, claimsBoundaryInputs: claimsBoundarySchema })
    .safeParse(out);
  if (!parsed.success) throw new Error("Evidence matrix revision failed");
  return parsed.data;
}

// Drafts the Handoff Pack fields the anchor synthesis doesn't produce: the
// locked "No Longer Belief" and the Set 2 identity expression (explicitly
// first-pass material that Module 05 replaces). Presented to the person for
// editing before the module seals.
export async function deriveSetTwo(
  plan: IntakePlan,
  transcript: string[],
  preNote: string,
  anchors: { key: string; sentence: string }[],
  manifesto: string,
  callModel: ModelCall,
  _model: string,
): Promise<unknown> {
  const out = await callModel(
    `You are drafting handoff fields from a confirmed conviction record. Work only from the supplied anchors, manifesto and transcript — never invent facts, names or numbers. Return only JSON:
{"noLongerBelief": "the old identity-level allegiance the speaker no longer organises around — one phrase, no 'we no longer believe that' prefix",
"rulesOut": "one sentence: the specific choices or compromises this no longer authorises",
"purpose": "completes 'To [action], so that [benefit].' — one clause pair, conviction-derived",
"values": [{"name": "...", "protects": "...", "rejects": "...", "tested": "when it was demonstrated, or 'prospective — not yet tested'"}],
"beliefShift": {"from": "the limiting belief the speaker's customers currently hold", "to": "the enabling belief the conviction offers"}}
Give 3 values. These are first-pass drafts that a later stage replaces — faithful, not polished.`,
    `${contextBlock(plan, transcript, preNote)}\n\nCONFIRMED ANCHORS\n${anchors.map((a) => `${a.key}: ${a.sentence}`).join("\n")}\n\nCONFIRMED MANIFESTO\n${manifesto}`,
  );
  return out;
}
