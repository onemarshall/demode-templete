import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";
import { HandoffCommercialDirection } from "../cd/contracts";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M12_SOURCE_SLOT = "m12-m11";

export const M12EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});

const M11Tuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  data: z.record(z.string(), z.unknown()),
  sources: z.unknown(),
});

const CDTuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text }),
  handoff: HandoffCommercialDirection,
});

export const M12UpstreamTuple = z.object({ m11: M11Tuple, cd: CDTuple });
export type M12UpstreamTuple = z.infer<typeof M12UpstreamTuple>;

export const M12Chain = z.object({
  folder: FolderName,
  entry: z.object({ receipt: M12EntryReceipt }),
  ...M12UpstreamTuple.shape,
});
export type M12Chain = z.infer<typeof M12Chain>;

export function chainFingerprint(tuple: M12UpstreamTuple): string {
  return sha256(JSON.stringify(M12UpstreamTuple.parse(tuple)));
}

/** M12 runs on an accepted commercial cycle and preserves what it decided. */
export function validateM12Source(source: SourceRecord): M12Chain {
  const chain = M12Chain.parse(source.body);
  const review = (chain.m11.data.review ?? {}) as { verdict?: string };
  if (review.verdict !== "pass")
    throw new Error("The sealed Commercial Cycle did not pass its independent review.");
  const decision = (chain.m11.data.clientDecision ?? {}) as { response?: string };
  if (decision.response !== "accept")
    throw new Error("The sealed Commercial Cycle does not carry an accepted client decision.");
  if (chain.cd.handoff.downstream.m11Permission !== "granted")
    throw new Error("The direction behind this cycle no longer grants execution.");
  const expected = chainFingerprint({ m11: chain.m11, cd: chain.cd });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M12 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m12Capability(chain: M12Chain): string {
  return String((chain.m11.data as { capability?: string }).capability ?? "full-standard");
}
