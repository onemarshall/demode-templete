import { z } from "zod";
import { ClientDecision, STAGE_SCHEMAS } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const dataStage = z.enum([
  "inheritance",
  "assets",
  "rhythm",
  "schedule",
  "response",
  "scorecard",
  "rules",
  "checklist",
  "transition",
] as const);
export type M12DataStage = z.infer<typeof dataStage>;

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

export const m12CommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base.extend({ action: z.literal("confirm-eligibility") }).strict(),
  base.extend({ action: z.literal("save"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("confirm"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("revise"), stage: dataStage }).strict(),
  base.extend({ action: z.literal("run-checks") }).strict(),
  base.extend({ action: z.literal("decide"), decision: ClientDecision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type M12Command = z.infer<typeof m12CommandSchema>;

export const m12GenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.extend({ action: z.literal("review") }).strict(),
]);
export type M12GenerationCommand = z.infer<typeof m12GenerationSchema>;

export const m12BrowserCommandSchema = z.discriminatedUnion("action", [
  ...m12CommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("review") }).strict(),
]);
export type M12BrowserCommand = z.infer<typeof m12BrowserCommandSchema>;

export const M12_DATA_SCHEMAS = STAGE_SCHEMAS;
