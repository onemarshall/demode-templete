import { createHash, randomUUID } from "node:crypto";
import { M03SealReceipt, type Commitments, type M03Session } from "./session";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export type M03Seal = ReturnType<typeof M03SealReceipt.parse>;
export const M03_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";
const receiptHash = (receipt: M03Seal) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

/** Build the immutable receipt. Canonical record snapshots travel in the database version payload. */
export function makeM03Seal(
  record: {
    session: M03Session;
    commitments: Commitments;
    sourceVersionId: string;
    sourceHash: string;
  },
  sealedBy: string,
  sealedAt = new Date().toISOString(),
): M03Seal {
  const outcome = record.commitments.outcome.outcome;
  if (outcome !== "a" && outcome !== "x")
    throw new Error("No outcome recorded — the run can't seal undecided");
  const receiptId = randomUUID();
  const snapshots = {
    session: `database:${receiptId}/session`,
    commitments: `database:${receiptId}/commitments`,
  };
  const hashes = {
    // Preserve the legacy receipt format: record snapshot hashes cover pretty-printed JSON.
    session: sha256(JSON.stringify(record.session, null, 2)),
    commitments: sha256(JSON.stringify(record.commitments, null, 2)),
  };
  const upstream = record.commitments.upstream;
  const payload = {
    version: 1 as const,
    module: "03" as const,
    status: "sealed" as const,
    receiptId,
    sealHash: "0".repeat(64),
    sessionId: record.session.sessionId,
    folder: record.session.folder,
    sealedAt,
    sealedBy,
    outcome,
    upstream: {
      m01: {
        sessionId: upstream.m01.sessionId,
        sealedAt: upstream.m01.sealedAt,
        outputsHash: upstream.m01.outputsHash,
        lockState: upstream.m01.lockState,
      },
      m02: {
        sessionId: upstream.m02SessionId,
        sealedAt: upstream.m02SealedAt,
        outcome: upstream.m02Outcome,
        relianceScope: upstream.m02RelianceScope,
        sealReceiptId: upstream.m02Seal.receiptId,
        sealHash: upstream.m02Seal.sealHash,
      },
    },
    passState: outcome === "a" ? ("provisional" as const) : null,
    commitmentsHash: sha256(JSON.stringify(record.commitments)),
    relianceScope: record.commitments.state.relianceScope,
    returnDoc: record.commitments.outcome.returnDoc,
    riskObligations: record.commitments.upstream.carriedForward.acknowledgedRisks.map((risk) => ({
      pattern: risk.pattern,
      label: risk.label,
      routing: risk.routing,
      acknowledgmentLine: risk.acknowledgmentLine,
      landedIn: risk.landedIn,
    })),
    hashes,
    snapshots,
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return M03SealReceipt.parse({ ...canonical, sealHash: sha256(JSON.stringify(canonical)) });
}

/** Verify the immutable database version, its receipt and each separately named record snapshot. */
export function verifyM03Seal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: {
    session: M03Session;
    commitments: Commitments;
    parentSessionId?: string | null;
    successorReason?: string;
  };
  expectedSource: { versionId: string; hash: string };
}): { valid: true; reason: string; receipt: M03Seal; rendered: string } | { valid: false; reason: string } {
  try {
    if (input.version.hashAlgorithm !== M03_VERSION_HASH_ALGORITHM)
      return { valid: false, reason: "Unsupported M03 seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash)
      return { valid: false, reason: "M03 canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as {
      receipt: unknown;
      snapshots: { session: M03Session; commitments: Commitments };
      lineage: { parentSessionId: string | null; successorReason: string };
      source: { versionId: string; hash: string };
      rendered: string;
      renderedHash: string;
    };
    const receipt = M03SealReceipt.parse(value.receipt);
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt))
      return { valid: false, reason: "M03 seal receipt identity or hash is invalid." };
    if (value.source.versionId !== input.expectedSource.versionId || value.source.hash !== input.expectedSource.hash)
      return { valid: false, reason: "M03 upstream source pin does not match its sealed snapshot." };
    if (
      value.lineage.parentSessionId !== (input.current.parentSessionId ?? null) ||
      value.lineage.successorReason !== (input.current.successorReason ?? "")
    )
      return { valid: false, reason: "M03 successor lineage does not match its sealed snapshot." };
    for (const key of ["session", "commitments"] as const) {
      if (sha256(JSON.stringify(value.snapshots[key], null, 2)) !== receipt.hashes[key])
        return { valid: false, reason: `M03 immutable ${key} snapshot hash is invalid.` };
      if (JSON.stringify(value.snapshots[key]) !== JSON.stringify(input.current[key]))
        return { valid: false, reason: `M03 current ${key} differs from its sealed snapshot.` };
    }
    if (value.snapshots.session.stage !== "sealed" || receipt.outcome !== value.snapshots.commitments.outcome.outcome)
      return { valid: false, reason: "M03 sealed session and outcome do not match the receipt." };
    if (receipt.commitmentsHash !== sha256(JSON.stringify(input.current.commitments)))
      return { valid: false, reason: "M03 sealed commitments hash does not match the current record." };
    if (
      receipt.upstream.m01.sessionId !== input.current.commitments.upstream.m01.sessionId ||
      receipt.upstream.m01.outputsHash !== input.current.commitments.upstream.m01.outputsHash ||
      receipt.upstream.m02.sessionId !== input.current.commitments.upstream.m02SessionId ||
      receipt.upstream.m02.sealHash !== input.current.commitments.upstream.m02Seal.sealHash
    )
      return { valid: false, reason: "M03 upstream tuple does not match its sealed commitments." };
    if (sha256(value.rendered) !== value.renderedHash)
      return { valid: false, reason: "M03 client render hash is invalid." };
    return { valid: true, reason: "M03 canonical seal and snapshots verified.", receipt, rendered: value.rendered };
  } catch {
    return { valid: false, reason: "M03 seal payload is invalid." };
  }
}
