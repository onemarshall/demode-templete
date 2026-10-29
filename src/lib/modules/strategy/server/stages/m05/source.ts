import { createHash } from "node:crypto";
import { z } from "zod";
import { FolderName } from "../../../shared/types";
import type { SourceRecord } from "../../data/repository";

const text = z.string().trim().min(1);
const hex64 = z.string().regex(/^[a-f0-9]{64}$/);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const M05_SOURCE_SLOT = "m05-bf";
/** The confirmed module route is pinned like a source: immutable versions, a moving head. */
export const M05_ROUTE_SLOT = "m05-route";

/** The engagement-level decision that M05 runs, and how. There is no skip route: a skipped
 * module has no session, so it can never reach this record. */
export const M05RouteRecord = z.object({
  version: z.literal(1),
  module: z.literal("05"),
  route: z.enum(["full", "constrained", "light"]),
  reason: text,
  confirmedBy: text,
  confirmedAt: z.string(),
});
export type M05RouteRecord = z.infer<typeof M05RouteRecord>;

export const M05EntryReceipt = z.object({
  version: z.literal(1),
  receiptId: z.uuid(),
  /** Fingerprint of the pinned upstream tuple — never of this receipt. */
  chainFingerprint: hex64,
  approvedBy: z.object({ name: text, role: text, authorityRef: text }),
  approvedAt: z.string(),
});
export type M05EntryReceipt = z.infer<typeof M05EntryReceipt>;

const BfTuple = z.object({
  sessionId: text,
  seal: z.object({ versionId: text, hash: text, at: z.string() }),
  gate: z.object({
    downstreamGateState: z.enum(["open", "blocked"]),
    m05Permission: z.enum(["granted", "denied"]),
    reasons: z.array(z.string()).default(() => []),
  }),
  approval: z.unknown(),
  assessment: z.unknown(),
  manifesto: z.unknown(),
  document: z.unknown(),
  handoff: z.object({
    versionId: text,
    hash: text,
    approvalState: z.literal("approved"),
    downstream: z.object({
      gate: text,
      m05Permission: text,
      reasons: z.array(z.string()).default(() => []),
      foundationRef: z.object({ runId: text, versionId: text, hash: text }),
    }),
  }),
  sources: z.unknown(),
});

const M04Tuple = z.object({
  sessionId: text,
  sealVersionId: text,
  sealHash: text,
  routeAuthorization: z.record(z.string(), z.unknown()),
  data: z.record(z.string(), z.unknown()),
});

const M03Tuple = z.object({ sessionId: text, commitments: z.unknown(), sealReceipt: z.unknown() });
const M02Tuple = z.object({ sessionId: text, recon: z.unknown(), sealReceipt: z.unknown() });
const M01Tuple = z.object({ sessionId: text, outputs: z.unknown(), handoff: z.unknown() });

/** Everything the fingerprint covers. The route decision and the receipt are excluded so the
 * receipt is not self-referential. */
export const M05UpstreamTuple = z.object({
  bf: BfTuple,
  m04: M04Tuple,
  m03: M03Tuple,
  m02: M02Tuple,
  m01: M01Tuple,
});
export type M05UpstreamTuple = z.infer<typeof M05UpstreamTuple>;

export const M05Chain = z.object({
  folder: FolderName,
  route: M05RouteRecord,
  entry: z.object({ receipt: M05EntryReceipt }),
  ...M05UpstreamTuple.shape,
});
export type M05Chain = z.infer<typeof M05Chain>;

export function chainFingerprint(tuple: M05UpstreamTuple): string {
  return sha256(JSON.stringify(M05UpstreamTuple.parse(tuple)));
}

/** The M05 upstream is the sealed Foundation tuple plus the confirmed route and the derived
 * entry receipt. Nothing here is assembled by a caller. */
export function validateM05Source(source: SourceRecord): M05Chain {
  const chain = M05Chain.parse(source.body);
  if (chain.bf.gate.downstreamGateState !== "open" || chain.bf.gate.m05Permission !== "granted")
    throw new Error(
      `The sealed Foundation's downstream gate is ${chain.bf.gate.downstreamGateState} — M05 generation permission is ${chain.bf.gate.m05Permission}.`,
    );
  if (chain.bf.handoff.downstream.m05Permission !== "granted")
    throw new Error("The Foundation handoff does not grant M05 permission.");
  if (
    chain.bf.handoff.downstream.foundationRef.versionId !== chain.bf.seal.versionId ||
    chain.bf.handoff.downstream.foundationRef.hash !== chain.bf.seal.hash
  )
    throw new Error("The Foundation handoff does not pin this exact sealed version.");
  const approval = chain.bf.approval as { response?: string } | null;
  if (!approval || approval.response !== "approve")
    throw new Error("The sealed Foundation does not carry a recorded client approval.");
  const expected = chainFingerprint({
    bf: chain.bf,
    m04: chain.m04,
    m03: chain.m03,
    m02: chain.m02,
    m01: chain.m01,
  });
  if (chain.entry.receipt.chainFingerprint !== expected)
    throw new Error("The M05 entry receipt does not pin the chain it accompanies.");
  return chain;
}

export function m05Capability(chain: M05Chain): string {
  return String(chain.m04.routeAuthorization["authorised_capability"] ?? "none");
}
