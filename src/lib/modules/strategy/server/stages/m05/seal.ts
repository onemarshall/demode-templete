import { createHash, randomUUID } from "node:crypto";
import {
  ClientDecision,
  type Checks,
  type M05Session,
  type Package,
  type StressReview,
} from "./contracts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const M05_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";

export type M05SealReceipt = {
  version: 1;
  module: "05";
  status: "sealed";
  receiptId: string;
  sealHash: string;
  sessionId: string;
  folder: string;
  sealedAt: string;
  sealedBy: string;
  sourceHash: string;
  candidateHash: string;
  renderHash: string;
  packetHash: string;
  gates: { id: string; result: string }[];
  reviewVerdict: string;
  packageReconciliation: string;
  hashes: { record: string; render: string };
};

const receiptHash = (receipt: M05SealReceipt) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

/** The sealed record. Session bookkeeping (revision, seal, history) is excluded so the receipt is
 * not self-referential — the same lesson as the Foundation seal. */
export function sealedRecord(s: M05Session) {
  return {
    data: s.data,
    confirmations: s.confirmations,
    route: s.route,
    capability: s.capability,
    sourceHash: s.sourceHash,
    sources: s.sources,
    candidateHash: s.candidateHash,
    candidateVersionId: s.candidateVersionId,
    stage: s.stage,
    status: s.status,
  };
}

export function makeM05Seal(
  s: M05Session,
  sealedBy: string,
  sealedAt = new Date().toISOString(),
): M05SealReceipt {
  const decision = ClientDecision.parse(s.data.clientDecision);
  if (decision.response !== "accept") throw new Error("Only an accepted strategy can be sealed.");
  const checks = s.data.checks as Checks | undefined;
  const review = s.data.review as StressReview | undefined;
  const pkg = s.data.package as Package | undefined;
  if (!checks || !checks.candidateHash) throw new Error("The candidate was never frozen.");
  if (s.candidateHash !== checks.candidateHash)
    throw new Error("The candidate changed after it was frozen.");
  if (!review || review.verdict !== "pass") throw new Error("Gate 7 review did not pass.");
  if (review.candidateHash !== checks.candidateHash)
    throw new Error("The review covers a different candidate.");
  if (!pkg || pkg.reconciliation !== "pass")
    throw new Error("The package reconciliation did not pass.");

  const receiptId = randomUUID();
  const payload = {
    version: 1 as const,
    module: "05" as const,
    status: "sealed" as const,
    receiptId,
    sealHash: "0".repeat(64),
    sessionId: s.sessionId,
    folder: s.folder,
    sealedAt,
    sealedBy,
    sourceHash: s.sourceHash,
    candidateHash: checks.candidateHash,
    renderHash: checks.renderHash,
    packetHash: checks.packetHash,
    gates: checks.gates.map((entry) => ({ id: entry.id, result: entry.result })),
    reviewVerdict: review.verdict,
    packageReconciliation: pkg.reconciliation,
    hashes: {
      record: sha256(JSON.stringify(sealedRecord(s), null, 2)),
      render: sha256(checks.rendered),
    },
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return { ...canonical, sealHash: sha256(JSON.stringify(canonical)) };
}

export function verifyM05Seal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: M05Session;
  expectedSourceHash: string;
}):
  | { valid: true; reason: string; receipt: M05SealReceipt; rendered: string }
  | { valid: false; reason: string } {
  try {
    if (input.version.hashAlgorithm !== M05_VERSION_HASH_ALGORITHM)
      return { valid: false, reason: "Unsupported M05 seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash)
      return { valid: false, reason: "M05 canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as {
      receipt: M05SealReceipt;
      payload: ReturnType<typeof sealedRecord>;
      lineage: { parentSessionId: string | null; successorReason: string };
      source: { hash: string };
      rendered: string;
      renderedHash: string;
    };
    const receipt = value.receipt;
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt))
      return { valid: false, reason: "M05 seal receipt identity or hash is invalid." };
    if (value.source.hash !== input.expectedSourceHash || receipt.sourceHash !== input.expectedSourceHash)
      return { valid: false, reason: "M05 upstream source pin does not match its sealed snapshot." };
    if (value.lineage.parentSessionId !== (input.current.parentSessionId ?? null))
      return { valid: false, reason: "M05 successor lineage does not match its sealed snapshot." };
    if (sha256(JSON.stringify(value.payload, null, 2)) !== receipt.hashes.record)
      return { valid: false, reason: "M05 immutable record hash is invalid." };
    if (JSON.stringify(value.payload) !== JSON.stringify(sealedRecord(input.current)))
      return { valid: false, reason: "M05 current content differs from its sealed record." };
    if (sha256(value.rendered) !== value.renderedHash || receipt.hashes.render !== value.renderedHash)
      return { valid: false, reason: "M05 rendered strategy hash is invalid." };
    if (receipt.candidateHash !== input.current.candidateHash)
      return { valid: false, reason: "M05 sealed candidate does not match the frozen candidate." };
    if (input.current.stage !== "sealed" || input.current.status !== "sealed")
      return { valid: false, reason: "M05 sealed session is not in its sealed state." };
    return {
      valid: true,
      reason: "Exact sealed strategy, receipt and source chain verified.",
      receipt,
      rendered: value.rendered,
    };
  } catch {
    return { valid: false, reason: "M05 seal payload is invalid." };
  }
}
