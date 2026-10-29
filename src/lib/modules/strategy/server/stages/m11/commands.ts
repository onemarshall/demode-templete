import { z } from "zod";
import { ClientDecision, STAGE_SCHEMAS } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const dataStage = z.enum(["inheritance", "plans", "decision", "actions", "accountability"] as const);
export type M11DataStage = z.infer<typeof dataStage>;

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

export const m11CommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base.extend({ action: z.literal("confirm-eligibility") }).strict(),
  base.extend({ action: z.literal("save"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("confirm"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("revise"), stage: dataStage }).strict(),
  base.extend({ action: z.literal("run-checks") }).strict(),
  base.extend({ action: z.literal("decide"), decision: ClientDecision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type M11Command = z.infer<typeof m11CommandSchema>;

export const m11GenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.extend({ action: z.literal("review") }).strict(),
]);
export type M11GenerationCommand = z.infer<typeof m11GenerationSchema>;

export const m11BrowserCommandSchema = z.discriminatedUnion("action", [
  ...m11CommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("review") }).strict(),
]);
export type M11BrowserCommand = z.infer<typeof m11BrowserCommandSchema>;

export const M11_DATA_SCHEMAS = STAGE_SCHEMAS;
