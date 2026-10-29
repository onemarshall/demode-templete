import { createHash, randomUUID } from "node:crypto";
import { BFSealReceipt, ClientDecision, type BFSession, type Gate } from "./contracts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const BF_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";
export type BFSeal = ReturnType<typeof BFSealReceipt.parse>;
const receiptHash = (receipt: BFSeal) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

/** The sealed record. Session bookkeeping (revision, seal, history) is deliberately excluded so
 * the receipt is not circular; the approved content and its authority are what is hashed. */
export function sealPayload(session: BFSession, gate: Gate) {
  return {
    data: session.data,
    review: session.review,
    sourceHash: session.sourceHash,
    sources: session.sources,
    confirmations: session.confirmations,
    gate,
  };
}

/** Build the immutable receipt. The client decision must already be an approval. */
export function makeBFSeal(
  session: BFSession,
  gate: Gate,
  rendered: string,
  sealedBy: string,
  sealedAt = new Date().toISOString(),
): BFSeal {
  const decision = ClientDecision.parse(session.data.approval);
  if (decision.response !== "approve") throw new Error("Only an approved version can be sealed.");
  const receiptId = randomUUID();
  const record = sealPayload(session, gate);
  const payload = {
    version: 1 as const,
    module: "bf" as const,
    status: "sealed" as const,
    receiptId,
    sealHash: "0".repeat(64),
    sessionId: session.sessionId,
    folder: session.folder,
    sealedAt,
    sealedBy,
    sourceHash: session.sourceHash,
    approvalState: "approved" as const,
    gate,
    hashes: {
      record: sha256(JSON.stringify(record, null, 2)),
      data: sha256(JSON.stringify(session.data, null, 2)),
      render: sha256(rendered),
    },
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return BFSealReceipt.parse({ ...canonical, sealHash: sha256(JSON.stringify(canonical)) });
}

/** Verify the immutable version, its receipt and the exact sealed content. */
export function verifyBFSeal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: BFSession;
  expectedSourceHash: string;
}):
  | { valid: true; reason: string; receipt: BFSeal; rendered: string }
  | { valid: false; reason: string } {
  try {
    if (input.version.hashAlgorithm !== BF_VERSION_HASH_ALGORITHM)
      return { valid: false, reason: "Unsupported BF seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash)
      return { valid: false, reason: "BF canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as {
      receipt: unknown;
      payload: ReturnType<typeof sealPayload>;
      lineage: { parentSessionId: string | null; successorReason: string };
      source: { hash: string };
      rendered: string;
      renderedHash: string;
    };
    const receipt = BFSealReceipt.parse(value.receipt);
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt))
      return { valid: false, reason: "BF seal receipt identity or hash is invalid." };
    if (value.source.hash !== input.expectedSourceHash || receipt.sourceHash !== input.expectedSourceHash)
      return { valid: false, reason: "BF upstream source pin does not match its sealed snapshot." };
    if (value.lineage.parentSessionId !== (input.current.parentSessionId ?? null))
      return { valid: false, reason: "BF successor lineage does not match its sealed snapshot." };
    if (sha256(JSON.stringify(value.payload, null, 2)) !== receipt.hashes.record)
      return { valid: false, reason: "BF immutable record hash is invalid." };
    const currentRecord = sealPayload(input.current, input.current.gate ?? value.payload.gate);
    if (JSON.stringify(currentRecord) !== JSON.stringify(value.payload))
      return { valid: false, reason: "BF current content differs from its sealed record." };
    if (sha256(JSON.stringify(value.payload.data, null, 2)) !== receipt.hashes.data)
      return { valid: false, reason: "BF immutable data snapshot hash is invalid." };
    if (sha256(value.rendered) !== value.renderedHash || receipt.hashes.render !== value.renderedHash)
      return { valid: false, reason: "BF rendered document hash is invalid." };
    if (input.current.stage !== "sealed" || input.current.status !== "sealed")
      return { valid: false, reason: "BF sealed session is not in its sealed state." };
    return {
      valid: true,
      reason: "Exact sealed content and current source chain verified.",
      receipt,
      rendered: value.rendered,
    };
  } catch {
    return { valid: false, reason: "BF seal payload is invalid." };
  }
}
