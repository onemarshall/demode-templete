import { createHash, randomUUID } from "node:crypto";
import { M02SealReceipt, type M02Session, type ReconLog, type CollectionRecord } from "./session";
import type { ArtifactStore } from "./evidence";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export type M02Seal = ReturnType<typeof M02SealReceipt.parse>;
export const M02_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";
const receiptHash = (receipt: M02Seal) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

/** Build the immutable receipt. Canonical record snapshots travel in the database version payload. */
export function makeM02Seal(record: {
  session: M02Session; recon: ReconLog; artifacts: ArtifactStore; collection: CollectionRecord;
  sourceVersionId: string; sourceHash: string;
}, sealedBy: string, sealedAt = new Date().toISOString()) {
  if (!record.session.evidenceReview || !record.session.progressionDecision)
    throw new Error("M02 evidence and progression receipts are required before seal");
  const receiptId = randomUUID();
  const snapshots = {
    session: `database:${receiptId}/session`, recon: `database:${receiptId}/recon`,
    artifacts: `database:${receiptId}/artifacts`, collection: `database:${receiptId}/collection`,
  };
  const hashes = {
    // Preserve the legacy receipt format: record snapshot hashes cover pretty-printed JSON.
    session: sha256(JSON.stringify(record.session, null, 2)), recon: sha256(JSON.stringify(record.recon, null, 2)),
    artifacts: sha256(JSON.stringify(record.artifacts, null, 2)), collection: sha256(JSON.stringify(record.collection, null, 2)),
  };
  const payload = {
    version: 1 as const, module: "02" as const, status: "sealed" as const, receiptId,
    sealHash: "0".repeat(64), sessionId: record.session.sessionId, folder: record.session.folder,
    sealedAt, sealedBy, outcome: record.recon.synthesis.outcome as "provisional_a" | "outcome_b" | "outcome_c",
    progressionDecision: record.session.progressionDecision, evidenceReview: record.session.evidenceReview,
    upstream: { m01: record.session.m01 }, hashes, snapshots,
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return M02SealReceipt.parse({ ...canonical, sealHash: sha256(JSON.stringify(canonical)) });
}

/** Verify the immutable database version, its receipt and each separately named record snapshot. */
export function verifyM02Seal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: { session: M02Session; recon: ReconLog; artifacts: ArtifactStore; collection: CollectionRecord; parentSessionId?: string | null; successorReason?: string };
  expectedSource: { versionId: string; hash: string };
}) {
  try {
    if (input.version.hashAlgorithm !== M02_VERSION_HASH_ALGORITHM) return { valid: false, reason: "Unsupported M02 seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash) return { valid: false, reason: "M02 canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as { receipt: unknown; snapshots: { session: M02Session; recon: ReconLog; artifacts: ArtifactStore; collection: CollectionRecord }; lineage: { parentSessionId: string | null; successorReason: string }; source: { versionId: string; hash: string }; rendered: string; renderedHash: string };
    const receipt = M02SealReceipt.parse(value.receipt);
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt)) return { valid: false, reason: "M02 seal receipt identity or hash is invalid." };
    if (value.source.versionId !== input.expectedSource.versionId || value.source.hash !== input.expectedSource.hash)
      return { valid: false, reason: "M02 upstream source pin does not match its sealed snapshot." };
    if (value.lineage.parentSessionId !== (input.current.parentSessionId ?? null) || value.lineage.successorReason !== (input.current.successorReason ?? ""))
      return { valid: false, reason: "M02 successor lineage does not match its sealed snapshot." };
    for (const key of ["session", "recon", "artifacts", "collection"] as const) {
      if (sha256(JSON.stringify(value.snapshots[key], null, 2)) !== receipt.hashes[key]) return { valid: false, reason: `M02 immutable ${key} snapshot hash is invalid.` };
      if (JSON.stringify(value.snapshots[key]) !== JSON.stringify(input.current[key])) return { valid: false, reason: `M02 current ${key} differs from its sealed snapshot.` };
    }
    if (value.snapshots.session.stage !== "sealed" || receipt.outcome !== value.snapshots.recon.synthesis.outcome)
      return { valid: false, reason: "M02 sealed session and outcome do not match the receipt." };
    if (receipt.upstream.m01.sessionId !== input.current.session.m01.sessionId || receipt.upstream.m01.sealedAt !== input.current.session.m01.sealedAt || receipt.upstream.m01.outputsHash !== input.current.session.m01.outputsHash)
      return { valid: false, reason: "M02 M01 upstream tuple does not match its sealed session." };
    if (sha256(value.rendered) !== value.renderedHash) return { valid: false, reason: "M02 client render hash is invalid." };
    return { valid: true, reason: "M02 canonical seal and snapshots verified.", receipt, rendered: value.rendered };
  } catch {
    return { valid: false, reason: "M02 seal payload is invalid." };
  }
}
