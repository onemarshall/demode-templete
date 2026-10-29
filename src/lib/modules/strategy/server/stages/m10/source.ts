import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M10_SOURCE_SLOT = "m10-m09";
export const M10_ROUTE_SLOT = "m10-route";

export const M10RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("10"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M10RouteRecord = z.infer<typeof M10RouteRecord>;

export const M10EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});

const M09Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

export const M10UpstreamTuple = z.object({ m09: M09Tuple });
export type M10UpstreamTuple = z.infer<typeof M10UpstreamTuple>;

export const M10Chain = z.object({
  folder: FolderName,
  route: M10RouteRecord,
  entry: z.object({ receipt: M10EntryReceipt }),
  ...M10UpstreamTuple.shape,
});
export type M10Chain = z.infer<typeof M10Chain>;

export function chainFingerprint(tuple: M10UpstreamTuple): string {
  return sha256(JSON.stringify(M10UpstreamTuple.parse(tuple)));
}

export function validateM10Source(source: SourceRecord): M10Chain {
  const chain = M10Chain.parse(source.body);
  const review = (chain.m09.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Content Strategy did not pass its independent review.");
  const decision = (chain.m09.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Content Strategy does not carry an accepted client decision.");
  const expected = chainFingerprint({ m09: chain.m09 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M10 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m10Capability(chain: M10Chain): string {
  return chain.m09.capability;
}
