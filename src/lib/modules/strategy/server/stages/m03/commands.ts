import { z } from "zod";
import { M03_DRAFT_STEPS } from "./session";
import { RouteKind } from "../../../shared/types";
import {
  AdvocateBody,
  ChallengeBody,
  ConfrontationsBody,
  CostBody,
  CredibilityBody,
  FrictionBody,
  GridBody,
  InputsBody,
  JourneyBody,
  JudgementBody,
  OutcomeBody,
  ProofBody,
} from "./rules";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  commandId: z.string().trim().min(1).max(200),
});

const draftBase = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

/** Browser-facing M03 command contract. Every mutating command carries CAS and idempotency keys. */
export const m03CommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base
    .extend({ action: z.literal("confirm-upstream"), route: RouteKind.optional() })
    .strict(),
  base.extend({ action: z.literal("confirm-inputs"), inputs: InputsBody }).strict(),
  base.extend({ action: z.literal("confirm-challenge"), challenge: ChallengeBody }).strict(),
  base.extend({ action: z.literal("confirm-journey"), journey: JourneyBody }).strict(),
  base.extend({ action: z.literal("confirm-grid"), grid: GridBody }).strict(),
  base.extend({ action: z.literal("confirm-proof"), proof: ProofBody }).strict(),
  base.extend({ action: z.literal("confirm-friction"), friction: FrictionBody }).strict(),
  base.extend({ action: z.literal("confirm-credibility"), credibility: CredibilityBody }).strict(),
  base
    .extend({ action: z.literal("confirm-confrontations"), confrontations: ConfrontationsBody })
    .strict(),
  base.extend({ action: z.literal("confirm-cost"), cost: CostBody }).strict(),
  base.extend({ action: z.literal("confirm-advocate"), advocate: AdvocateBody }).strict(),
  base.extend({ action: z.literal("confirm-judgement"), judgement: JudgementBody }).strict(),
  base.extend({ action: z.literal("outcome"), outcome: OutcomeBody }).strict(),
  base.extend({ action: z.literal("seal") }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type M03Command = z.infer<typeof m03CommandSchema>;

export const m03DraftCommandSchema = draftBase
  .extend({ action: z.literal("draft"), step: z.enum(M03_DRAFT_STEPS) })
  .strict();
export type M03DraftCommand = z.infer<typeof m03DraftCommandSchema>;

/** The browser only ever sees the draft command without a lease. */
export const m03BrowserCommandSchema = z.discriminatedUnion("action", [
  ...m03CommandSchema.options,
  draftBase.omit({ jobLease: true }).extend({ action: z.literal("draft"), step: z.enum(M03_DRAFT_STEPS) }).strict(),
]);
export type M03BrowserCommand = z.infer<typeof m03BrowserCommandSchema>;

export const M03_DRAFT_STEP_LABELS: Record<(typeof M03_DRAFT_STEPS)[number], string> = {
  challenge: "Belief challenge",
  journey: "Belief shift journey",
  grid: "Conviction grid",
  proof: "Proof points",
  friction: "Competitor friction",
  cost: "Cost of commitment",
  advocate: "Advocate challenges",
  judgement: "Strategic judgement",
};

/** Which stage a step's draft is drafted from — drafts never cross a confirmation. */
export const M03_DRAFT_STAGE: Record<(typeof M03_DRAFT_STEPS)[number], string> = {
  challenge: "challenge",
  journey: "journey",
  grid: "grid",
  proof: "proof",
  friction: "friction",
  cost: "cost",
  advocate: "advocate",
  judgement: "judgement",
};
