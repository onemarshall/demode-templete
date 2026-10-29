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
const stringArray = { type: "array", minItems: 1, items: { type: "string" } } as const;
const anchorItems = { type: "array", minItems: 7, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["key", "sentence"], properties: { key: { type: "string" }, sentence: { type: "string" } } } } as const;
const matrixItems = { type: "array", items: { type: "object", additionalProperties: false, required: ["claim", "zone", "evidence"], properties: { claim: { type: "string" }, zone: { type: "string", enum: ["Fact", "Thesis", "Belief"] }, evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["item", "category"], properties: { item: { type: "string" }, category: { type: "string" } } } } } } } as const;
const claimsBoundary = { type: "object", additionalProperties: false, required: ["canClaim", "mustQualify", "cannotClaim"], properties: { canClaim: stringArray, mustQualify: stringArray, cannotClaim: stringArray } } as const;
export const SynthesisGenerationContract = {
  name: "m01_conviction_outputs",
  schema: { type: "object", additionalProperties: false,
    required: ["anchors", "manifesto", "languageBank", "evidenceMatrix", "claimsBoundaryInputs", "factsAnchor", "publicRecordReadiness"],
    properties: {
      anchors: anchorItems,
      manifesto: { type: "string" },
      languageBank: { type: "array", items: { type: "object", additionalProperties: false, required: ["category", "phrases"], properties: { category: { type: "string" }, phrases: stringArray } } },
      evidenceMatrix: matrixItems,
      claimsBoundaryInputs: claimsBoundary,
      factsAnchor: { type: "array", items: { type: "object", additionalProperties: false, required: ["fact", "detail"], properties: { fact: { type: "string" }, detail: { type: "string" } } } },
      publicRecordReadiness: { type: "object", additionalProperties: false, required: ["state", "sentence"], properties: { state: { type: "string", enum: ["ready", "not-yet-concrete", "not-assessed"] }, sentence: { type: "string" } } },
    },
  },
} as const;
export const AnchorGenerationContract = { name: "m01_anchor_revision", schema: { type: "object", additionalProperties: false, required: ["sentence"], properties: { sentence: { type: "string" } } } } as const;
export const ManifestoGenerationContract = { name: "m01_manifesto_revision", schema: { type: "object", additionalProperties: false, required: ["manifesto"], properties: { manifesto: { type: "string" } } } } as const;
export const MatrixGenerationContract = { name: "m01_matrix_revision", schema: { type: "object", additionalProperties: false, required: ["evidenceMatrix", "claimsBoundaryInputs"], properties: { evidenceMatrix: matrixItems, claimsBoundaryInputs: claimsBoundary } } } as const;
export const SetTwoGenerationContract = { name: "m01_set_two_draft", schema: { type: "object", additionalProperties: false, required: ["noLongerBelief", "rulesOut", "purpose", "values", "beliefShift"], properties: { noLongerBelief: { type: "string" }, rulesOut: { type: "string" }, purpose: { type: "string" }, values: { type: "array", minItems: 1, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name", "protects", "rejects", "tested"], properties: { name: { type: "string" }, protects: { type: "string" }, rejects: { type: "string" }, tested: { type: "string" } } } }, beliefShift: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { from: { type: "string" }, to: { type: "string" } } } } } } as const;

const RULES = `You are drafting candidate conviction outputs from a recorded conviction conversation. Only the speaker's own words may be quoted. Anything you infer is marked as inference, never as fact.

The existing M01 quality gates are review constraints, not permission to embellish. Never pad, duplicate, split fragments into artificial evidence, or invent content to make a gate pass. When the source cannot honestly support a gate, preserve the supported material, leave the candidate visibly thin or incomplete, and let it remain unsealable for human review. Return concise, complete, valid JSON; finish every sentence and include every required key.

Draft these, from the transcript only:

1. anchors — seven short statements, one per key, each a single sentence, in the speaker's own language. Keys in order: ${ANCHOR_KEYS.join(" | ")}.
   - "Core Belief" uses the form "I believe that [Hidden Truth about the Broken Thing], and therefore I must [action the Legacy demands]".
   - "Market-Deployable Hidden Truth" keeps the same meaning but makes the market consequence concrete enough to check. If you cannot preserve the meaning, write "translation-failure" in the sentence field.

2. manifesto — a first-person manifesto, written the way manifestos actually read: short declarative lines, one idea per line, no paragraphs of prose. Group the lines into a few movements separated by blank lines — what's broken, what the speaker knows that others don't, what they refuse to do, what they paid to learn, what changes if they win. Keep it tight: around 30–40 lines total, not a retelling. Compress each story into two or three lines that carry the force, not the full account. Every line must be in the speaker's own words or a direct compression of something they said — no committee language, no filler, no marketing voice. Write complete sentences or complete declarative thoughts, not unfinished fragments.

3. languageBank — use these eight category names: repeated vocabulary, high-energy phrases, natural problem description, natural solution description, the misunderstanding gap, emotional core, customer language, first-impression intent. Every phrase must be a meaningful verbatim phrase from the transcript; no paraphrasing. Copy literal sequences of source words: do not change person, number, tense, verb inflection or word order. Do not adjust grammar to turn a source sentence into a slogan. When in doubt, copy the complete original sentence rather than shortening it. Aim for at least three distinct phrases in each category where the transcript genuinely provides them. Do not pad by repeating a phrase, splitting one fragment, or placing invented language into a category. Keep fewer than three when only that many are genuinely available; omit a category when there is no honest phrase to include. A thin or incomplete bank must remain visibly thin for review.

4. evidenceMatrix — the claims the conviction depends on. For each: the claim in the speaker's words, its zone (Fact, Thesis or Belief), and its evidence items with their category (pre-product personal observation, customer self-report, third-party research, product-generated data). Mark honestly: a claim with no evidence is a Belief, and that is not a failure. The existing gate expects at least three claims with specific categorised evidence; include only evidence actually supplied, and never create evidence or relabel belief to reach that count.

5. claimsBoundaryInputs — three lists. canClaim: what the speaker's statements support. mustQualify: what's partly supported. cannotClaim: what the evidence does not support at all. Each list non-empty. The existing gate expects Can Claim to be larger than either other list. Make it largest only when the source genuinely supports that distribution; never move unsupported claims or inflate the list to pass. If the source does not support the required balance, retain honest boundaries and leave the gate visibly failed.

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

export type ModelContract = { name: string; schema: Record<string, unknown> };
export type ModelCall = (system: string, user: string, contract?: ModelContract) => Promise<unknown>;
export async function synthesise(
  plan: IntakePlan,
  transcript: string[],
  note: string,
  callModel: ModelCall,
  model: string,
): Promise<M01Outputs> {
  const parsed = Synthesised.parse(await callModel(RULES, contextBlock(plan, transcript, note), SynthesisGenerationContract));

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
    AnchorGenerationContract,
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
    ManifestoGenerationContract,
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
    `You are revising an evidence matrix drafted from a recorded conversation. Each claim stays in the speaker's words with an honest zone — Fact (multiple categorised evidence items), Thesis (some evidence), Belief (none yet, which is not a failure). Evidence categories: pre-product personal observation, customer self-report, third-party research, product-generated data. Keep sentences complete and finish each claim and boundary statement.

Apply the person's feedback; change nothing else. Also refresh claimsBoundaryInputs (canClaim / mustQualify / cannotClaim, each non-empty) so it stays consistent with the matrix. The existing quality gates expect at least three claims with specific categorised evidence, and Can Claim to contain strictly more statements than either Must Qualify or Cannot Claim. Meet those counts only where the source genuinely supports them. Keep distinct supported claims distinct; do not merge unrelated points, invent evidence, move unsupported claims, or pad any list to manipulate counts. Check the three list lengths before returning. If the source cannot honestly support the gate, preserve the accurate matrix and boundaries and leave that gate failed for review. Return complete, concise valid JSON only: {"evidenceMatrix": [...], "claimsBoundaryInputs": {...}}.`,
    `${contextBlock(plan, transcript, preNote)}\n\nCURRENT MATRIX:\n${JSON.stringify(current)}\n\nWHAT THE PERSON FLAGGED: ${note || "check the claims and zones read as fair"}`,
    MatrixGenerationContract,
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
    SetTwoGenerationContract,
  );
  return out;
}
