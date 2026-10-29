import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M06_SOURCE_SLOT = "m06-m05";
export const M06_ROUTE_SLOT = "m06-route";

export const M06RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("06"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M06RouteRecord = z.infer<typeof M06RouteRecord>;

export const M06EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});
export type M06EntryReceipt = z.infer<typeof M06EntryReceipt>;

const M05Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

const BfTuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  gate: z.object({
    downstreamGateState: z.enum(["open", "blocked"]),
    m05Permission: z.enum(["granted", "denied"]),
    reasons: z.array(z.string()).default(() => []),
  }),
});

export const M06UpstreamTuple = z.object({ m05: M05Tuple, bf: BfTuple });
export type M06UpstreamTuple = z.infer<typeof M06UpstreamTuple>;

export const M06Chain = z.object({
  folder: FolderName,
  route: M06RouteRecord,
  entry: z.object({ receipt: M06EntryReceipt }),
  ...M06UpstreamTuple.shape,
});
export type M06Chain = z.infer<typeof M06Chain>;

export function chainFingerprint(tuple: M06UpstreamTuple): string {
  return sha256(JSON.stringify(M06UpstreamTuple.parse(tuple)));
}

/** The M06 upstream is the sealed Brand Strategy tuple plus the confirmed route and the derived
 * entry receipt. Nothing here is assembled by a caller. */
export function validateM06Source(source: SourceRecord): M06Chain {
  const chain = M06Chain.parse(source.body);
  const review = (chain.m05.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Brand Strategy did not pass its independent review.");
  const decision = (chain.m05.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Brand Strategy does not carry an accepted client decision.");
  const expected = chainFingerprint({ m05: chain.m05, bf: chain.bf });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M06 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m06Capability(chain: M06Chain): string {
  return chain.m05.capability;
}
