import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M09_SOURCE_SLOT = "m09-m08";
export const M09_ROUTE_SLOT = "m09-route";

export const M09RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("09"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M09RouteRecord = z.infer<typeof M09RouteRecord>;

export const M09EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});

const M08Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

export const M09UpstreamTuple = z.object({ m08: M08Tuple });
export type M09UpstreamTuple = z.infer<typeof M09UpstreamTuple>;

export const M09Chain = z.object({
  folder: FolderName,
  route: M09RouteRecord,
  entry: z.object({ receipt: M09EntryReceipt }),
  ...M09UpstreamTuple.shape,
});
export type M09Chain = z.infer<typeof M09Chain>;

export function chainFingerprint(tuple: M09UpstreamTuple): string {
  return sha256(JSON.stringify(M09UpstreamTuple.parse(tuple)));
}

export function validateM09Source(source: SourceRecord): M09Chain {
  const chain = M09Chain.parse(source.body);
  const review = (chain.m08.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Content Strategy did not pass its independent review.");
  const decision = (chain.m08.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Content Strategy does not carry an accepted client decision.");
  const expected = chainFingerprint({ m08: chain.m08 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M09 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m09Capability(chain: M09Chain): string {
  return chain.m08.capability;
}
