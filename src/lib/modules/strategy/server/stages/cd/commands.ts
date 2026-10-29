import { z } from "zod";
import { Decision } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const dataStage = z.enum([
  "inheritance",
  "horizon",
  "recommendation",
  "route",
  "moves",
  "sequence",
  "portfolio",
  "exclusions",
  "evidence",
] as const);
export type CDDataStage = z.infer<typeof dataStage>;

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

export const cdCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base.extend({ action: z.literal("confirm-eligibility") }).strict(),
  base.extend({ action: z.literal("save"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("confirm"), stage: dataStage, payload: z.unknown() }).strict(),
  base.extend({ action: z.literal("revise"), stage: dataStage }).strict(),
  base.extend({ action: z.literal("decide"), decision: Decision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type CDCommand = z.infer<typeof cdCommandSchema>;

export const cdGenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage: dataStage }).strict(),
]);
export type CDGenerationCommand = z.infer<typeof cdGenerationSchema>;

export const cdBrowserCommandSchema = z.discriminatedUnion("action", [
  ...cdCommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage: dataStage }).strict(),
]);
export type CDBrowserCommand = z.infer<typeof cdBrowserCommandSchema>;
