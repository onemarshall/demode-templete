import { createHash, randomUUID } from "node:crypto";
import { ClientDecision, M09SealReceipt, type Checks, type M09Session, type StressReview } from "./contracts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const M09_VERSION_HASH_ALGORITHM = "sha256-json-stringify-v1";
export type M09Seal = ReturnType<typeof M09SealReceipt.parse>;
const receiptHash = (receipt: M09Seal) => {
  const { sealHash: _sealHash, ...payload } = receipt;
  return sha256(JSON.stringify(payload));
};

export function sealedRecord(session: M09Session) {
  return {
    data: session.data,
    confirmations: session.confirmations,
    route: session.route,
    capability: session.capability,
    sourceHash: session.sourceHash,
    sources: session.sources,
    candidateHash: session.candidateHash,
    stage: session.stage,
    status: session.status,
  };
}

export function makeM09Seal(session: M09Session, sealedBy: string, sealedAt = new Date().toISOString()): M09Seal {
  const decision = ClientDecision.parse(session.data.clientDecision);
  if (decision.response !== "accept") throw new Error("Only an accepted strategy can be sealed.");
  const checks = session.data.checks as Checks | undefined;
  const review = session.data.review as StressReview | undefined;
  if (!checks?.candidateHash) throw new Error("The candidate was never frozen.");
  if (session.candidateHash !== checks.candidateHash) throw new Error("The candidate changed after it was frozen.");
  if (!review || review.verdict !== "pass") throw new Error("The independent review did not pass.");
  if (review.candidateHash !== checks.candidateHash) throw new Error("The review covers a different candidate.");

  const receiptId = randomUUID();
  const payload = {
    version: 1 as const,
    module: "09" as const,
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
    reviewVerdict: review.verdict,
    hashes: { record: sha256(JSON.stringify(sealedRecord(session), null, 2)), render: sha256(checks.rendered) },
  };
  const { sealHash: _placeholder, ...canonical } = payload;
  return M09SealReceipt.parse({ ...canonical, sealHash: sha256(JSON.stringify(canonical)) });
}

export function verifyM09Seal(input: {
  sessionId: string;
  version: { canonicalPayload: string; sealHash: string; hashAlgorithm: string };
  current: M09Session;
  expectedSourceHash: string;
}): { valid: true; reason: string; receipt: M09Seal; rendered: string } | { valid: false; reason: string } {
  try {
    if (input.version.hashAlgorithm !== M09_VERSION_HASH_ALGORITHM)
      return { valid: false, reason: "Unsupported M09 seal hash algorithm." };
    if (sha256(input.version.canonicalPayload) !== input.version.sealHash)
      return { valid: false, reason: "M09 canonical version hash is invalid." };
    const value = JSON.parse(input.version.canonicalPayload) as {
      receipt: M09Seal;
      payload: ReturnType<typeof sealedRecord>;
      lineage: { parentSessionId: string | null };
      source: { hash: string };
      rendered: string;
      renderedHash: string;
    };
    const receipt = value.receipt;
    if (receipt.sessionId !== input.sessionId || receipt.sealHash !== receiptHash(receipt))
      return { valid: false, reason: "M09 seal receipt identity or hash is invalid." };
    if (value.source.hash !== input.expectedSourceHash || receipt.sourceHash !== input.expectedSourceHash)
      return { valid: false, reason: "M09 upstream source pin does not match its sealed snapshot." };
    if (value.lineage.parentSessionId !== (input.current.parentSessionId ?? null))
      return { valid: false, reason: "M09 successor lineage does not match its sealed snapshot." };
    if (sha256(JSON.stringify(value.payload, null, 2)) !== receipt.hashes.record)
      return { valid: false, reason: "M09 immutable record hash is invalid." };
    if (JSON.stringify(value.payload) !== JSON.stringify(sealedRecord(input.current)))
      return { valid: false, reason: "M09 current content differs from its sealed record." };
    if (sha256(value.rendered) !== value.renderedHash || receipt.hashes.render !== value.renderedHash)
      return { valid: false, reason: "M09 rendered strategy hash is invalid." };
    if (receipt.candidateHash !== input.current.candidateHash)
      return { valid: false, reason: "M09 sealed candidate does not match the frozen candidate." };
    if (input.current.stage !== "sealed" || input.current.status !== "sealed")
      return { valid: false, reason: "M09 sealed session is not in its sealed state." };
    return { valid: true, reason: "Exact sealed strategy, receipt and source chain verified.", receipt, rendered: value.rendered };
  } catch {
    return { valid: false, reason: "M09 seal payload is invalid." };
  }
}
