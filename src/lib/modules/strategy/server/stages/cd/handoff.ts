import {
  HandoffCommercialDirection,
  type CDSession,
  type Decision,
  type Exclusions,
  type Horizon,
  type Inheritance,
  type Moves,
  type Portfolio,
  type Recommendation,
  type Route,
  type Sequence,
  type Evidence,
} from "./contracts";

/** Permissions that authorise execution work in M11. `analysis-only` and `blocked` do not. */
const USABLE_PERMISSIONS = new Set(["evidence-gathering", "pilot-only", "controlled-90-day", "wider-execution"]);
const APPROVING_STATES = new Set(["client-approved", "client-overridden"]);

export type M11Permission = { permission: "granted" | "refused"; reasons: string[] };

/**
 * FW_24: M11 must refuse a lock when the direction is absent, stale, contradictory or lacks a
 * recorded decision by the authorised human decision owner and usable execution permission.
 * Permission is derived from the two separate axes; it is never inferred from a label.
 */
export function m11PermissionFor(decision: Decision): M11Permission {
  const reasons: string[] = [];
  if (!APPROVING_STATES.has(decision.decisionState))
    reasons.push(
      `The decision state is "${decision.decisionState}" — M11 requires a client-approved or client-overridden direction.`,
    );
  if (!USABLE_PERMISSIONS.has(decision.executionPermission))
    reasons.push(
      `The execution permission is "${decision.executionPermission}" — no execution work may begin from this permission.`,
    );
  if (!decision.owner.name.trim() || !decision.owner.authorityRef.trim())
    reasons.push("No authorised human decision owner is recorded.");
  return reasons.length ? { permission: "refused", reasons } : { permission: "granted", reasons: [] };
}

/** M11 blocks when the direction names a required pre-cycle test that is not yet resolved. */
export function preCycleBlocker(evidence: Evidence): string | null {
  if (!evidence.preCycleTest.required) return null;
  if (evidence.preCycleTest.resolved.trim()) return null;
  return `The direction names a required pre-cycle test ("${evidence.preCycleTest.id || "unnamed"}") that is not yet resolved.`;
}

/**
 * The exact handoff M11's consumer validates. Field names mirror the consumer schema, so a
 * direction that seals here is accepted there without translation.
 */
export function buildHandoff(session: CDSession, receipt: { versionId: string; hash: string; at: string }): HandoffCommercialDirection {
  const inheritance = session.data.inheritance as Inheritance;
  const horizon = session.data.horizon as Horizon;
  const recommendation = session.data.recommendation as Recommendation;
  const route = session.data.route as Route;
  const moves = session.data.moves as Moves;
  const sequence = session.data.sequence as Sequence;
  const portfolio = session.data.portfolio as Portfolio;
  const exclusions = session.data.exclusions as Exclusions;
  const evidence = session.data.evidence as Evidence;
  const decision = session.data.decision as Decision;

  const permission = m11PermissionFor(decision);
  const reasons = [...permission.reasons];
  const blocker = preCycleBlocker(evidence);
  if (blocker) reasons.push(blocker);

  const firstMove = moves.moves[0]!;
  const active = portfolio.consequences.filter((entry) => entry.classification === "active-first-phase");
  // Fail with the reason a human needs, before the schema reports an empty array.
  if (!active.length) throw new Error("The direction selects no Active / First Phase consequence.");

  return HandoffCommercialDirection.parse({
    versionId: receipt.versionId,
    hash: receipt.hash,
    approvalState: decision.decisionState,
    envelope: {
      decisionState: decision.decisionState,
      executionPermission: decision.executionPermission,
      evidenceStates: evidence.dimensions.map((dimension) => ({ dimension: dimension.dimension, state: dimension.state })),
      authorisedWork: decision.authorisedWork,
      nextReviewTrigger: decision.nextReviewTrigger,
    },
    downstream: {
      m11Permission: reasons.length ? "refused" : "granted",
      reasons,
      strategyRef: {
        runId: session.sessionId,
        versionId: receipt.versionId,
        hash: receipt.hash,
      },
      direction: {
        directionId: session.sessionId,
        version: String(session.revision),
        decisionState: decision.decisionState,
        executionPermission: decision.executionPermission,
        directionalHorizon: horizon.directionalHorizon,
        horizonRationale: horizon.horizonRationale,
        twelveMonthOutcome: recommendation.outcome,
        priorityBuyingSituation: recommendation.buyingSituation,
        strategicRoute: route.strategicRoute,
        strategicMoveId: firstMove.id,
        strategicMoveJob: firstMove.job,
        firstPhaseObjective: sequence.firstPhaseObjective,
        activeConsequenceIds: active.map((entry) => entry.id),
        exclusions: exclusions.exclusions,
        progressionCondition: sequence.progressionCondition,
        firstEvidenceEvent: sequence.firstEvidenceEvent,
        coreAssumption: evidence.coreAssumption,
        reviewEvent: sequence.reviewEvent,
        preCycleTest: {
          required: evidence.preCycleTest.required,
          id: evidence.preCycleTest.id,
          effect: evidence.preCycleTest.effect,
          resolved: evidence.preCycleTest.resolved,
        },
      },
      claimsBoundary: {
        canClaim: inheritance.claimsBoundary.canClaim,
        mustQualify: inheritance.claimsBoundary.mustQualify,
        cannotClaim: inheritance.claimsBoundary.cannotClaim,
      },
      invalidationTriggers: exclusions.invalidationTriggers,
    },
  });
}

/** A handoff is coherent when its permission matches its own decision axes and it cites active work. */
export function validateHandoff(handoff: HandoffCommercialDirection): HandoffCommercialDirection {
  const parsed = HandoffCommercialDirection.parse(handoff);
  const { m11Permission, reasons, direction } = parsed.downstream;
  const usable = APPROVING_STATES.has(direction.decisionState) && USABLE_PERMISSIONS.has(direction.executionPermission);
  if (m11Permission === "granted" && !usable)
    throw new Error("A granted handoff cannot carry a non-approving decision state or unusable permission.");
  if (m11Permission === "granted" && reasons.length)
    throw new Error("A granted handoff cannot carry refusal reasons.");
  if (m11Permission === "refused" && !reasons.length)
    throw new Error("A refused handoff must state why.");
  if (!direction.activeConsequenceIds.length)
    throw new Error("The direction selects no Active / First Phase consequence.");
  return parsed;
}
