import { z } from "zod";
import { ClientDecision, STAGE_SCHEMAS } from "./contracts";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  commandId: z.string().trim().min(1).max(200),
});

const dataStage = z.enum([
  "inheritance",
  "mission",
  "pillars",
  "library",
  "gaps",
  "sales-map",
  "claims",
  "distribution",
  "production",
  "measures",
  "operations",
  "compliance",
] as const);
export type M08DataStage = z.infer<typeof dataStage>;

const generation = base.extend({
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
});

export const m08CommandSchema = z.discriminatedUnion("action", [
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
  base.extend({ action: z.literal("decide"), decision: ClientDecision }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
]);
export type M08Command = z.infer<typeof m08CommandSchema>;

export const m08GenerationSchema = z.discriminatedUnion("action", [
  generation.extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.extend({ action: z.literal("review") }).strict(),
]);
export type M08GenerationCommand = z.infer<typeof m08GenerationSchema>;

export const m08BrowserCommandSchema = z.discriminatedUnion("action", [
  ...m08CommandSchema.options,
  generation.omit({ jobLease: true }).extend({ action: z.literal("draft"), stage: dataStage }).strict(),
  generation.omit({ jobLease: true }).extend({ action: z.literal("review") }).strict(),
]);
export type M08BrowserCommand = z.infer<typeof m08BrowserCommandSchema>;

export const M08_DATA_SCHEMAS = STAGE_SCHEMAS;
