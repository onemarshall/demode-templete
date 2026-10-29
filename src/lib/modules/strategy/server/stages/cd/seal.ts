import { createHash, randomUUID } from "node:crypto";
import { CDSealReceipt, type CDSession, type Checks, type Decision } from "./contracts";
import { buildHandoff, m11PermissionFor, validateHandoff } from "./handoff";
import type { HandoffCommercialDirection } from "./contracts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const CD_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";
export type CDSeal = ReturnType<typeof CDSealReceipt.parse>;

const receiptHash = (receipt: CDSeal) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

export function sealedRecord(session: CDSession) {
  return {
    data: session.data,
    confirmations: session.confirmations,
    capability: session.capability,
    sourceHash: session.sourceHash,
    sources: session.sources,
    candidateHash: session.candidateHash,
    stage: session.stage,
    status: session.status,
  };
}

export function makeCDSeal(session: CDSession, sealedBy: string, sealedAt = new Date().toISOString()): CDSeal {
  const decision = session.data.decision as Decision | undefined;
  if (!decision) throw new Error("No decision has been recorded.");
  const checks = session.data.checks as Checks | undefined;
  if (!checks?.candidateHash) throw new Error("The candidate was never frozen.");
  if (session.candidateHash !== checks.candidateHash) throw new Error("The candidate changed after it was frozen.");
  if (!checks.gates.every((gate) => gate.result === "pass"))
    throw new Error("The mechanical gates did not all pass.");

  const receiptId = randomUUID();
  const payload = {
    version: 1 as const,
    module: "cd" as const,
    status: "sealed" as const,
    receiptId,
    sealHash: "0".repeat(64),
    sessionId: session.sessionId,
    folder: session.folder,
    sealedAt,
    sealedBy,
    sourceHash: session.sourceHash,
    candidateHash: checks.candidateHash,
    renderHash: checks.renderHash,
    gates: checks.gates.map((entry) => ({ id: entry.id, result: entry.result })),
    decisionState: decision.decisionState,
    executionPermission: decision.executionPermission,
    hashes: {
      record: sha256(JSON.stringify(sealedRecord(session), null, 2)),
      render: sha256(checks.rendered),
    },
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return CDSealReceipt.parse({ ...canonical, sealHash: sha256(JSON.stringify(canonical)) });
}

/** The sealed direction emits the exact handoff M11's consumer validates. */
export function makeCDHandoff(session: CDSession, seal: CDSeal): HandoffCommercialDirection {
  return validateHandoff(buildHandoff(session, { versionId: seal.receiptId, hash: seal.sealHash, at: seal.sealedAt }));
}

export function verifyCDSeal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: CDSession;
  expectedSourceHash: string;
}): { valid: true; reason: string; receipt: CDSeal; rendered: string } | { valid: false; reason: string } {
  try {
    if (input.version.hashAlgorithm !== CD_VERSION_HASH_ALGORITHM)
      return { valid: false, reason: "Unsupported Commercial Direction seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash)
      return { valid: false, reason: "Commercial Direction canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as {
      receipt: CDSeal;
      payload: ReturnType<typeof sealedRecord>;
      lineage: { parentSessionId: string | null };
      source: { hash: string };
      rendered: string;
      renderedHash: string;
    };
    const receipt = value.receipt;
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt))
      return { valid: false, reason: "Commercial Direction receipt identity or hash is invalid." };
    if (value.source.hash !== input.expectedSourceHash || receipt.sourceHash !== input.expectedSourceHash)
      return { valid: false, reason: "Commercial Direction source pin does not match its sealed snapshot." };
    if (value.lineage.parentSessionId !== (input.current.parentSessionId ?? null))
      return { valid: false, reason: "Commercial Direction successor lineage does not match its sealed snapshot." };
    if (sha256(JSON.stringify(value.payload, null, 2)) !== receipt.hashes.record)
      return { valid: false, reason: "Commercial Direction immutable record hash is invalid." };
    if (JSON.stringify(value.payload) !== JSON.stringify(sealedRecord(input.current)))
      return { valid: false, reason: "Commercial Direction current content differs from its sealed record." };
    if (sha256(value.rendered) !== value.renderedHash || receipt.hashes.render !== value.renderedHash)
      return { valid: false, reason: "Commercial Direction rendered record hash is invalid." };
    if (receipt.candidateHash !== input.current.candidateHash)
      return { valid: false, reason: "Commercial Direction sealed candidate does not match the frozen candidate." };
    if (input.current.stage !== "sealed" || input.current.status !== "sealed")
      return { valid: false, reason: "Commercial Direction is not in its sealed state." };
    return { valid: true, reason: "Exact sealed direction, receipt and source chain verified.", receipt, rendered: value.rendered };
  } catch {
    return { valid: false, reason: "Commercial Direction seal payload is invalid." };
  }
}

export { m11PermissionFor };
