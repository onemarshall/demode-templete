import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";
import { HandoffCommercialDirection } from "../cd/contracts";
import { m11PermissionFor } from "../cd/handoff";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M11_SOURCE_SLOT = "m11-cd";

export const M11EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});

const CDTuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  data: z.record(z.string(), z.unknown()),
  handoff: HandoffCommercialDirection,
  sources: z.unknown(),
});

/** The supporting surfaces FW_24 requires: the digital and visual work the cycle's assets sit in. */
const SupportingTuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text }),
});

export const M11UpstreamTuple = z.object({
  cd: CDTuple,
  m10: SupportingTuple,
  m09: SupportingTuple,
});
export type M11UpstreamTuple = z.infer<typeof M11UpstreamTuple>;

export const M11Chain = z.object({
  folder: FolderName,
  entry: z.object({ receipt: M11EntryReceipt }),
  ...M11UpstreamTuple.shape,
});
export type M11Chain = z.infer<typeof M11Chain>;

export function chainFingerprint(tuple: M11UpstreamTuple): string {
  return sha256(JSON.stringify(M11UpstreamTuple.parse(tuple)));
}

/**
 * M11's entry gate, as FW_24 states it: refuse when the direction is absent, stale, contradictory,
 * or lacks a recorded decision by the authorised owner and usable execution permission.
 */
export function validateM11Source(source: SourceRecord): M11Chain {
  const chain = M11Chain.parse(source.body);
  const handoff = chain.cd.handoff;
  if (handoff.downstream.m11Permission !== "granted")
    throw new Error(
      `The Commercial Direction does not grant execution: ${handoff.downstream.reasons.join("; ") || "no reason recorded"}.`,
    );
  const decision = (chain.cd.data.decision ?? {}) as never;
  const permission = m11PermissionFor(decision);
  if (permission.permission !== "granted")
    throw new Error(`The Commercial Direction's decision does not authorise a cycle: ${permission.reasons.join("; ")}.`);
  if (!chain.m10.sessionId || !chain.m09.sessionId)
    throw new Error("The direction does not pin the digital and visual surfaces the cycle must sit inside.");
  const expected = chainFingerprint({ cd: chain.cd, m10: chain.m10, m09: chain.m09 });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M11 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m11Capability(chain: M11Chain): string {
  return String((chain.cd.data as { capability?: string }).capability ?? "full-standard");
}
