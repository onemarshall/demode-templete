import { z } from "zod";
import { Artifact } from "./evidence";
import {
  EvidenceReviewBody,
  Gate1Body,
  Gate2Body,
  Gate3Body,
  Gate4Body,
  Gate5Body,
  Gate6Body,
  OutcomeBody,
  TerrainBody,
} from "./gates";
import { BuilderInputBody, ResearchForm } from "./session";
import { RouteKind } from "../../../shared/types";

const base = z.object({
  sessionId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  commandId: z.string().trim().min(1).max(200),
});
export const m02DraftCommandSchema = z.object({
  sessionId: z.uuid(), expectedRevision: z.number().int().positive(),
  commandId: z.string().trim().min(1).max(200),
  gate: z.enum(["setup", "terrain", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6"]),
  jobLease: z.object({ jobId: z.string().min(1), fence: z.number().int().positive() }).optional(),
}).strict();

export const m02CollectCommandSchema = base.extend({
  action:z.literal("collect-url"),
  url:z.url().max(2048).refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443');},"Use a public HTTPS URL without credentials"),
  kind:z.enum(["competitor","customer","market","owned"]),
  target:z.string().trim().min(1).max(500),note:z.string().max(500).optional(),
  jobLease:z.object({jobId:z.string().min(1),fence:z.number().int().positive()}).optional(),
}).strict();

const artifactInput = Artifact.omit({ id: true, httpStatus: true, sector: true, cost: true }).extend({ channel: z.enum(["paste", "upload"]) }).strict();

/** Browser-facing M02 command contract. Every mutating command carries CAS and idempotency keys. */
export const m02CommandSchema = z.discriminatedUnion("action", [
  m02CollectCommandSchema.omit({jobLease:true}),
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  base.extend({
    action: z.literal("draft"),
    gate: z.enum(["setup", "terrain", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6"]),
  }).strict(),
  base.extend({
    action: z.literal("confirm-setup"),
    research: ResearchForm,
    route: RouteKind.optional(),
    routeReason: z.string().max(2000).default(""),
  }).strict(),
  base.extend({ action: z.literal("add-artifact"), artifact: artifactInput }).strict(),
  base.extend({ action: z.literal("delete-artifact"), artifactId: z.string().min(1) }).strict(),
  base.extend({ action: z.literal("finish-gather") }).strict(),
  base.extend({ action: z.literal("review-artifacts") }).strict(),
  base.extend({ action: z.literal("builder-inputs"), inputs: BuilderInputBody }).strict(),
  base.extend({ action: z.literal("confirm-gate1"), terrain: TerrainBody, gate: Gate1Body }).strict(),
  base.extend({ action: z.literal("confirm-gate2"), gate: Gate2Body }).strict(),
  base.extend({ action: z.literal("confirm-gate3"), gate: Gate3Body }).strict(),
  base.extend({ action: z.literal("confirm-gate4"), gate: Gate4Body }).strict(),
  base.extend({ action: z.literal("confirm-gate5"), gate: Gate5Body }).strict(),
  base.extend({ action: z.literal("confirm-gate6"), gate: Gate6Body }).strict(),
  base.extend({ action: z.literal("evidence-review"), review: EvidenceReviewBody.omit({ confirmedBy: true }) }).strict(),
  base.extend({ action: z.literal("outcome"), outcome: OutcomeBody }).strict(),
  base.extend({ action: z.literal("seal") }).strict(),
  base.extend({ action: z.literal("successor"), reason: z.string().trim().min(1).max(4000) }).strict(),
  base.extend({ action: z.literal("revise"), from: z.enum(["gather", "builder-inputs", "gates", "risk", "outcome"]), reason: z.string().trim().min(1).max(4000) }).strict(),
]);

export type M02Command = z.infer<typeof m02CommandSchema>;
export type M02DraftGate = Extract<M02Command, { action: "draft" }>["gate"];
export type M02ArtifactInput = z.infer<typeof artifactInput>;

