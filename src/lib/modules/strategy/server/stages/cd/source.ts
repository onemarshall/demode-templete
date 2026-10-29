import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const CD_SOURCE_SLOT = "cd-m10";

export const CDEntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});

const M10Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  capability: text,
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

export const CDUpstreamTuple = z.object({ m10: M10Tuple });
export type CDUpstreamTuple = z.infer<typeof CDUpstreamTuple>;

export const CDChain = z.object({
  folder: FolderName,
  entry: z.object({ receipt: CDEntryReceipt }),
  ...CDUpstreamTuple.shape,
});
export type CDChain = z.infer<typeof CDChain>;

export function chainFingerprint(tuple: CDUpstreamTuple): string {
  return sha256(JSON.stringify(CDUpstreamTuple.parse(tuple)));
}

/** FW_24: the direction sits after the applicable M05–M10 work and selects within it. */
export function validateCDSource(source: SourceRecord): CDChain {
  const chain = CDChain.parse(source.body);
  const review = (chain.m10.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Visual Identity did not pass its independent review.");
  const decision = (chain.m10.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Visual Identity does not carry an accepted client decision.");
  const expected = chainFingerprint({ m10: chain.m10 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The Commercial Direction entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function cdCapability(chain: CDChain): string {
  return chain.m10.capability;
}
