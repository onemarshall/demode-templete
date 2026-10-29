import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M08_SOURCE_SLOT = "m08-m07";
export const M08_ROUTE_SLOT = "m08-route";

export const M08RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("08"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M08RouteRecord = z.infer<typeof M08RouteRecord>;

export const M08EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});
export type M08EntryReceipt = z.infer<typeof M08EntryReceipt>;

const M07Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

export const M08UpstreamTuple = z.object({ m07: M07Tuple });
export type M08UpstreamTuple = z.infer<typeof M08UpstreamTuple>;

export const M08Chain = z.object({
  folder: FolderName,
  route: M08RouteRecord,
  entry: z.object({ receipt: M08EntryReceipt }),
  ...M08UpstreamTuple.shape,
});
export type M08Chain = z.infer<typeof M08Chain>;

export function chainFingerprint(tuple: M08UpstreamTuple): string {
  return sha256(JSON.stringify(M08UpstreamTuple.parse(tuple)));
}

export function validateM08Source(source: SourceRecord): M08Chain {
  const chain = M08Chain.parse(source.body);
  const review = (chain.m07.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Sales Strategy did not pass its independent review.");
  const decision = (chain.m07.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Sales Strategy does not carry an accepted client decision.");
  const expected = chainFingerprint({ m07: chain.m07 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M08 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m08Capability(chain: M08Chain): string {
  return chain.m07.capability;
}
