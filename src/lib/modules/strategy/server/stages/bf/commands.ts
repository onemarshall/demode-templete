import { z } from "zod";
import { ClientDecision, STAGE_SCHEMAS } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const stage = z.enum(["assessment", "manifesto", "document"] as const);

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

/** Browser-facing BF command contract. Every mutating command carries CAS and idempotency keys. */
export const bfCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base.extend({ action: z.literal("save"), stage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("confirm"), stage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("revise"), stage }).strict(),
  base
    .extend({
      action: z.literal("resolve-finding"),
      findingId: z.string().min(1),
      disposition: z.enum(["corrected-locally", "returned-upstream", "accepted-limit", "blocking"]),
      note: z.string().max(4000).optional(),
    })
    .strict(),
  base.extend({ action: z.literal("decide"), decision: ClientDecision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type BFCommand = z.infer<typeof bfCommandSchema>;

export const bfGenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage }).strict(),
  generation.extend({ action: z.literal("fresh-review") }).strict(),
  generation.extend({ action: z.literal("recheck") }).strict(),
]);
export type BFGenerationCommand = z.infer<typeof bfGenerationSchema>;

/** The browser sends draft/review commands without a lease; the worker supplies it. */
export const bfBrowserCommandSchema = z.discriminatedUnion("action", [
  ...bfCommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("fresh-review") }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("recheck") }).strict(),
]);
export type BFBrowserCommand = z.infer<typeof bfBrowserCommandSchema>;

export const BF_STAGE_LABELS: Record<z.infer<typeof stage>, string> = {
  assessment: "Input assessment",
  manifesto: "Business manifesto",
  document: "Foundation document",
};

export const BF_STAGE_SCHEMAS = STAGE_SCHEMAS;
