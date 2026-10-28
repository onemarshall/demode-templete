import { z } from "zod";
import type { M04Session } from "./contracts";
import { draftResponseSchema } from "./synthesis";
/** Stages worked through as a guided conversation. Recommendation and human-decision stay structural: the memo is synthesized by draftM04, and the decision is the human's own act. */
export const CHAT_STAGES = [
  "context",
  "conviction-cost",
  "market-readiness",
  "human-load",
  "financial-grounding",
  "awareness-and-weighing",
] as const;
export type ChatStage = (typeof CHAT_STAGES)[number];

export const ChatLine = z.object({
  stage: z.string(),
  role: z.enum(["assistant", "user"]),
  content: z.string().min(1),
  at: z.string(),
});
export type M04ChatLine = z.infer<typeof ChatLine>;

const STAGE_GUIDE: Record<ChatStage, { job: string; questions: string[] }> = {
  context: {
    job: "Settle who is making this decision and the real situation around it. Much may already be established in the record — confirm what is there rather than re-asking, and only ask what is genuinely missing.",
    questions: [
      "Who is making this call, and what is their role?",
      "What stage is the business actually at — pre-revenue, growing, steady, or stuck?",
      "Who is involved day to day — just them, a partner or family, a team, employees?",
      "What does the business sell or plan to sell, and who pays for it?",
      "What causes someone to buy, and what do they actually receive?",
      "What resources honestly exist — runway or savings, time available, an existing audience, support?",
      "What else competes for their time and energy?",
      "Business-model reality: inventory or physical production? costs that grow per unit sold? pricing as the main lever? recurring or subscription economics?",
    ],
  },
  "conviction-cost": {
    job: "Surface what the conviction actually costs in operation — the honest gap between what the belief requires and what a competitor who does not share it would skip.",
    questions: [
      "What does the conviction require that a competitor who does not share it would skip?",
      "Which required behaviour costs money, time or convenience that competitors do not spend?",
      "What would the business look like if it were optimised purely for profit — and what is the honest difference from that version?",
      "Where does the conviction make operations harder, slower or more expensive?",
      "Where does it create value that pure profit-seeking would not?",
    ],
  },
  "market-readiness": {
    job: "Test whether the market already knows it has the problem the conviction answers — how much education is needed before selling can even start.",
    questions: [
      "Does the market already know it has this problem?",
      "Out of 100 people in the market, how many would say 'I need that' without being educated first?",
      "What would those people need to understand before they could want this?",
      "What does the market currently believe that makes this harder to sell?",
      "Who gets it immediately, and who needs convincing?",
    ],
  },
  "human-load": {
    job: "Test whether the person and organisation can actually carry what this route requires — time, energy, emotional load and the effect on the rest of life.",
    questions: [
      "How long, honestly, before revenue or the next milestone?",
      "Can they sustain that gap — financially and emotionally?",
      "Where does the energy come from when this gets hard?",
      "Who else carries the load — partner, team, nobody?",
      "What happens to relationships, health and other responsibilities if this takes twice as long as hoped?",
    ],
  },
  "financial-grounding": {
    job: "Get to real numbers — rough is fine, exact is not required — and the materiality threshold: what actually matters to the decision.",
    questions: [
      "Roughly what does this route require to spend before it can earn?",
      "What does the money need to cover, in broad strokes?",
      "Where does that money come from, and what happens if it runs out early?",
      "What would be left over or sacrificed — what does pursuing this cost in what else becomes impossible?",
      "Which of these numbers are solid, and which are guesses that could break the plan if wrong?",
    ],
  },
  "awareness-and-weighing": {
    job: "Weigh everything that has surfaced — where the real costs and uncertainties sit, what the person is accepting by continuing, and what a 3–7 day reflection still needs to hold open.",
    questions: [
      "Looking at the whole picture — cost, readiness, load, money — what feels heaviest?",
      "What has this reflection changed about how they see the path?",
      "What are they accepting by continuing that they had not fully admitted before?",
      "What new work or uncertainty has surfaced that did not exist in the record before?",
      "Before a decision: what would they want to sit with for a few days?",
    ],
  },
};

/** Compact read of what the sealed record and confirmed stages already establish — so the adviser never re-asks settled questions. */
function establishedFacts(s: M04Session): string {
  const chain = s.sources as Record<string, unknown> | undefined;
  const m01 = chain?.m01 as { outputs?: Record<string, unknown> } | undefined;
  const m02 = chain?.m02 as
    | { recon?: Record<string, unknown>; session?: Record<string, unknown> }
    | undefined;
  const m03 = chain?.m03 as
    | { commitments?: Record<string, unknown>; session?: Record<string, unknown> }
    | undefined;
  const entry = chain?.entry as { route?: string } | undefined;
  return JSON.stringify(
    {
      agreedRoute: entry?.route ?? s.route,
      founderConviction: m01?.outputs ?? null,
      marketRealityCheck: {
        outcome: m02?.session?.outcome ?? null,
        synthesis: m02?.recon?.synthesis ?? null,
      },
      businessCommitments: m03?.commitments ?? null,
      confirmedEarlierConversations: s.data,
    },
    null,
    1,
  );
}

export function systemPrompt(s: M04Session, stage: ChatStage): string {
  const guide = STAGE_GUIDE[stage];
  const schema = draftResponseSchema(s, stage);
  return `You are the viability adviser inside a Langfell Viability Check — an experienced, trusted commercial friend helping this person see the full cost of pursuing their conviction before they commit. You are warm, direct and plain-spoken. You never use internal jargon, module numbers, file names or field names. You never predict success or failure and you never give permission — the human decides.

What is already established (refer to it naturally; do NOT re-ask what it settles):
${establishedFacts(s)}

This conversation's job: ${guide.job}

Questions to work through, in a natural order — adapt to what they say:
${guide.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rules:
- Reply with JSON only: {"say": string, "complete": boolean, "summary"?: string, "record"?: object}.
- "say" is what you say to the person: one thing at a time. Either a short observation from the record plus one question, or a follow-up plus the next question.
- If they ask you something, answer it honestly and briefly, then return to an open question.
- When the conversation has honestly covered the questions, set complete=true, write "summary" as a short readable recap of what was agreed, and set "record" to this conversation's structured record built ONLY from what they actually said plus the established record. Mark anything unanswered as unknown — never invent testimony, numbers, evidence or approval.
${stage === "financial-grounding" ? "- Economic inputs contain only typed financial/economic facts; do not put non-economic facts in inputs. Represent an unknown value with input_type=unknown and value_or_range=null. Include only supported calculations with the exact supplied kind/formula; do not add unsupported placeholder calculations, and use an empty calculations array when no actual calculation is supported. M10 consolidation must be applicable; M1–M9 may remain unresolved for human review.\n" : ""}
- The record must match this JSON schema exactly: ${JSON.stringify(schema)}
- If this is the first message and they have not spoken yet, open with a short plain-language read of what the record shows that matters for this conversation, then ask the first question.`;
}

export const Reply = z.object({
  say: z.string().min(1),
  complete: z.boolean().default(false),
  summary: z.string().optional(),
  record: z.unknown().optional(),
});
