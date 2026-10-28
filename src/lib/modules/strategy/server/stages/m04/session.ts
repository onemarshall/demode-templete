import { createHash, randomUUID } from "node:crypto";
import { Actor, Session, DATA_KEYS, type M04Session } from "./contracts";
import { assertEligibleSource, type CurrentM04Source } from "./sources";
export const hashM04 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function createM04(current: CurrentM04Source, actor: Actor, id = randomUUID()): M04Session {
  Actor.parse(actor);
  const source = assertEligibleSource(current),
    now = new Date().toISOString();
  const s = Session.parse({
    module: "04",
    sessionId: id,
    folder: source.chain.folder,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    stage: "context",
    status: "draft",
    route: source.route,
    equivalentEvidence: source.equivalentEvidence,
    sourceHash: source.hash,
    sources: source.chain,
    confirmations: {},
    presented: null,
    data: {},
    drafts: {},
    history: [{ action: "created", actor, at: now }],
    routeAuthorization: null,
    seal: null,
  });
  const owner = source.chain.entry.receipt.decisionOwner,
    commitments = source.chain.m03.commitments;
  s.drafts.context = {
    decisionOwner: owner.name,
    authorityRef: owner.authorityBasis,
    principals: [owner.name],
    modelQuestions: ["unknown", "unknown", "unknown", "unknown"],
    complexity: "unknown",
    unknowns: [],
    conflicts: [],
    adaptations: [],
  };
  s.drafts["conviction-cost"] = {
    rows: commitments.grid.map((row) => ({
      commitmentId: row.action,
      sourceWording: row.move,
      requirement: row.proofCommitment,
      inputIds: [],
      costFinding: "Not yet established",
      customerEffect: "Not yet assessed",
    })),
    comparisonBasis: commitments.costOfCommitment.costs.join("\n"),
    owner: "M03 Cost of Commitment / Friction",
  };
  s.drafts["market-readiness"] = {
    inheritedFinding: source.chain.m02.recon.synthesis.statement,
    sourceRefs: [`M02:${source.chain.m02.sessionId}`],
    segmentSize: "Unknown until source evidence establishes it",
    changesMarketFinding: false,
  };
  return s;
}
export function successorDraftsFromData(data: M04Session["data"]) {
  return Object.fromEntries(
    Object.entries(DATA_KEYS)
      .map(([stage, key]) => [stage, data[key]])
      .filter(([, value]) => value !== undefined),
  );
}
export function successorM04(
  previous: M04Session,
  current: CurrentM04Source,
  actor: Actor,
  reason: string,
) {
  if (!reason.trim()) throw new Error("A revision reason is required");
  const s = createM04(current, actor);
  s.parentSessionId = previous.sessionId;
  s.drafts = successorDraftsFromData(previous.data);
  s.history.push({
    action: "successor",
    parent: previous.sessionId,
    reason,
    actor,
    at: new Date().toISOString(),
    invalidation: "All confirmations require fresh review; historical source is preserved.",
  });
  return s;
}
