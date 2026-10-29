import { z } from "zod";
import { ClientDecision, STAGE_SCHEMAS } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const dataStage = z.enum([
  "inheritance",
  "semantic",
  "identity",
  "audience",
  "character",
  "expression",
  "synthesis",
  "packet",
] as const);
export type M05DataStage = z.infer<typeof dataStage>;

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

/** Browser-facing M05 command contract. Every mutating command carries CAS and idempotency keys. */
export const m05CommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base
    .extend({
      action: z.literal("confirm-route"),
      route: z.enum(["full", "constrained", "light"]),
      reason: z.string().trim().min(1).max(4000),
    })
    .strict(),
  base.extend({ action: z.literal("confirm-eligibility") }).strict(),
  base.extend({ action: z.literal("save"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("confirm"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("revise"), stage: dataStage }).strict(),
  base.extend({ action: z.literal("run-checks") }).strict(),
  base.extend({ action: z.literal("build-package") }).strict(),
  base.extend({ action: z.literal("decide"), decision: ClientDecision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type M05Command = z.infer<typeof m05CommandSchema>;

export const m05GenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.extend({ action: z.literal("review") }).strict(),
]);
export type M05GenerationCommand = z.infer<typeof m05GenerationSchema>;

/** The browser sends draft/review without a lease; the worker supplies it. */
export const m05BrowserCommandSchema = z.discriminatedUnion("action", [
  ...m05CommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("review") }).strict(),
]);
export type M05BrowserCommand = z.infer<typeof m05BrowserCommandSchema>;

export const M05_DATA_SCHEMAS = STAGE_SCHEMAS;

export const M05_STAGE_LABELS: Record<M05DataStage, string> = {
  inheritance: "Inheritance",
  semantic: "Semantic ledger",
  identity: "Identity",
  audience: "Audience",
  character: "Character",
  expression: "Expression",
  synthesis: "Synthesis",
  packet: "Decision packet",
};
