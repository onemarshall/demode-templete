import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M07_SOURCE_SLOT = "m07-m06";
export const M07_ROUTE_SLOT = "m07-route";

export const M07RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("07"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M07RouteRecord = z.infer<typeof M07RouteRecord>;

export const M07EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});
export type M07EntryReceipt = z.infer<typeof M07EntryReceipt>;

const M06Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

export const M07UpstreamTuple = z.object({ m06: M06Tuple });
export type M07UpstreamTuple = z.infer<typeof M07UpstreamTuple>;

export const M07Chain = z.object({
  folder: FolderName,
  route: M07RouteRecord,
  entry: z.object({ receipt: M07EntryReceipt }),
  ...M07UpstreamTuple.shape,
});
export type M07Chain = z.infer<typeof M07Chain>;

export function chainFingerprint(tuple: M07UpstreamTuple): string {
  return sha256(JSON.stringify(M07UpstreamTuple.parse(tuple)));
}

/** M07 inherits a sealed Marketing Strategy whose review passed and whose client decision was
 * accepted, plus its own confirmed module route. */
export function validateM07Source(source: SourceRecord): M07Chain {
  const chain = M07Chain.parse(source.body);
  const review = (chain.m06.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Marketing Strategy did not pass its independent review.");
  const decision = (chain.m06.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Marketing Strategy does not carry an accepted client decision.");
  const expected = chainFingerprint({ m06: chain.m06 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M07 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m07Capability(chain: M07Chain): string {
  return chain.m06.capability;
}
