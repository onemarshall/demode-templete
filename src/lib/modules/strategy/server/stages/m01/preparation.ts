import { z } from "zod";
export const ELEMENTS = [
  "The Broken Thing",
  "The Hidden Truth",
  "The Non-Negotiable",
  "The Hard-Won Teaching",
  "The Legacy",
] as const;

export const ENGAGEMENT_TYPES = [
  "new business",
  "rebrand",
  "repositioning",
  "strategy development",
  "offer change",
  "new market entry",
  "communications review",
  "agency-supported work for a client",
  "other",
] as const;

const ENGAGEMENT_LENS: Record<string, string> = {
  "new business":
    "This is a new venture. Probe what the speaker knows from direct experience versus what they're assuming, and watch for borrowed industry language.",
  rebrand:
    "This is a rebrand of an existing business. Probe the gap between how the market currently sees them and what they claim to stand for, and whether the problem is positioning or delivery.",
  repositioning:
    "This is a repositioning of an existing business. Probe how the market currently perceives them, why that perception limits them, and what proof supports the new position.",
  "strategy development":
    "This is an existing business developing its strategy. Probe why the current direction is being reconsidered and what the conviction preserves versus abandons.",
  "offer change":
    "This is an existing business changing its offer. Probe what the offer change assumes about what the business stands for.",
  "new market entry":
    "This is an existing offer entering a new market. Probe whether the conviction was formed in the home market and still holds in the new one.",
  "communications review":
    "This is an existing business reviewing its communications. Probe whether the conviction is settled and only the expression is in question, or whether the conviction itself is being revisited.",
  "agency-supported work for a client":
    "The person speaking may be a practitioner rather than the conviction source. Establish early whose belief this is — conviction language must come from the person who owns it.",
  other: "",
};

export function engagementLens(engagement?: string) {
  return engagement ? (ENGAGEMENT_LENS[engagement.toLowerCase()] ?? "") : "";
}

export const PlanSchema = z.object({
  summary: z.string(),
  engagement: z.string().optional(),
  elements: z
    .array(
      z.object({
        element: z.string().min(1),
        // Models drift on casing and synonyms — normalise, and an
        // unrecognisable value degrades to None (asks the full question
        // set) rather than failing the whole plan.
        coverage: z.preprocess(
          (v) => {
            const s = String(v ?? "")
              .trim()
              .toLowerCase();
            if (s === "full" || s === "covered") return "Full";
            if (s === "partial" || s === "partly") return "Partial";
            if (s === "thin" || s === "minimal" || s === "weak") return "Thin";
            return "None";
          },
          z.enum(["Full", "Partial", "Thin", "None"]),
        ),
        feedback: z.string().min(1),
        evidence: z.array(z.string()),
        questions: z.array(z.string()),
      }),
    )
    .refine(
      (items) =>
        items.length === ELEMENTS.length && ELEMENTS.every((name, i) => items[i]?.element === name),
      { message: `Plan must contain exactly these elements, in order: ${ELEMENTS.join(", ")}` },
    ),
});
export const PlanGenerationContract = { name: "m01_intake_plan", schema: { type: "object", additionalProperties: false, required: ["summary", "elements"], properties: { summary: { type: "string" }, elements: { type: "array", items: { type: "object", additionalProperties: false, required: ["element", "coverage", "feedback", "evidence", "questions"], properties: { element: { type: "string" }, coverage: { type: "string", enum: ["Full", "Partial", "Thin", "None"] }, feedback: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } } } } } } } } as const;
export type IntakePlan = z.infer<typeof PlanSchema>;

export const RULES = `You assess supplied founder material for five conviction elements and write the questions a live interviewer should ask.

Coverage scale, per element:
- Full: the material states this element clearly, in the speaker's own words, and it looks current.
- Partial: some of the element is stated; gaps remain.
- Thin: mentioned, but not substantiated or specific.
- None: not in the material.

Question rules:
- Full: one short reconfirmation question, e.g. "Does this still hold as written?"
- Partial: one or two questions aimed only at the gaps.
- Thin or None: the full question set: a primary question and one push question.
- When an engagement type is stated, aim the questions at what that kind of work needs to establish (e.g. a rebrand needs the gap between current market perception and claimed conviction; a new venture needs direct experience versus assumption; a pivot needs why the current direction fails and what is preserved).
- Never invent facts. Quote the material as evidence, exactly.
- Never decide that an element is locked; coverage is provisional until the person confirms it.
- Write questions as you would say them aloud to the person, in plain language.

Feedback, written to the person ("you"), in plain language with no internal labels (do not say "coverage", "Full", "Partial", "module"):
- "summary": two or three sentences starting "I've read your material." Say what it already tells us and what is still missing.
- each element's "feedback": one or two sentences on what you've told us about this, and what we still need to hear.

Return only JSON: {"summary": string, "elements": [{"element": string, "coverage": "Full"|"Partial"|"Thin"|"None", "feedback": string, "evidence": [exact quotes], "questions": [strings]}]}.
The "elements" array must contain exactly these five names, copied exactly, in this order: ${ELEMENTS.join(" | ")}. Do not rename, merge or add elements.`;

export function planAsInstructions(plan: IntakePlan, note?: string) {
  const total = plan.elements.reduce((n, e) => n + e.questions.length, 0);
  const lines = plan.elements.map((e) => {
    const qs = e.questions.map((q) => `  - ${q}`).join("\n");
    return `${e.element} (${e.coverage}):\n${qs || "  - no question needed beyond a brief reconfirmation"}`;
  });
  const noteLine = note?.trim()
    ? `\nThe person reviewed this plan and said: "${note.trim()}". Take it into account.\n`
    : "";
  const engagementLine = plan.engagement
    ? `KIND OF WORK: ${plan.engagement}. ${engagementLens(plan.engagement)}\n\n`
    : "";
  return `PLAN FOR THIS SESSION
${engagementLine}The speaker has already shared written material. What it tells us: ${plan.summary}
${noteLine}
OPENING FOR THIS SESSION (replaces the general opening order)
1. Greet them briefly and say you've read the material they shared.
2. In one sentence, say what it already tells you.
3. Say there are ${total} questions across five areas, and that they can stop, pause or correct you at any time.
4. Ask the two required opening questions: whether they've had an earlier pre-session, and whether this is their own belief.
5. Then ask the planned questions below, in order, following up naturally.

PLANNED QUESTIONS (ask only these; do not ask the full list where the material already covers an area)
${lines.join("\n\n")}`;
}

export function intakeMessages(parts: { file: string; text: string }[], engagement?: string) {
  if (!parts.length) throw new Error("No input material supplied");
  if (parts.reduce((n, p) => n + p.text.length, 0) > 60_000)
    throw new Error("Input material is too large for one analysis pass");
  const material = `${engagement ? `ENGAGEMENT TYPE (stated by the operator): ${engagement}\n${engagementLens(engagement)}\n\n` : `ENGAGEMENT TYPE: not stated by the operator. If the material names the kind of work (new business, rebrand, repositioning, offer change and so on), treat that as the type.\n\n`}${parts.map((p) => `### ${p.file}\n${p.text}`).join("\n\n")}`;
  return [
    { role: "system", content: RULES },
    { role: "user", content: material },
  ];
}
