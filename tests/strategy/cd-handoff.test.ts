import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { Session, type CDSession, type Decision } from "../../src/lib/modules/strategy/server/stages/cd/contracts";
import {
  buildHandoff,
  m11PermissionFor,
  preCycleBlocker,
  validateHandoff,
} from "../../src/lib/modules/strategy/server/stages/cd/handoff";

const at = "2026-10-29T12:00:00.000Z";

function direction(overrides: { decision?: Partial<Decision>; preCycleRequired?: boolean; resolved?: string } = {}) {
  const decision: Decision = {
    response: "accept",
    decisionState: "client-approved",
    executionPermission: "controlled-90-day",
    owner: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
    exactDecision: "Approved for the first controlled cycle.",
    authorisedWork: "The first controlled cycle only.",
    nextReviewTrigger: "End of the first cycle.",
    ...overrides.decision,
  };
  return Session.parse({
    module: "cd",
    sessionId: randomUUID(),
    folder: "synthetic-brand",
    revision: 7,
    createdAt: at,
    updatedAt: at,
    stage: "sealed",
    status: "sealed",
    sourceHash: "a".repeat(64),
    sources: {},
    capability: "full-standard",
    data: {
      inheritance: {
        inheritedDecisions: ["Publish the outcome register."],
        selectableOptions: ["Evidence index first"],
        lockedFields: ["Claims boundary"],
        claimsBoundary: { canClaim: ["Outcomes are published quarterly"], mustQualify: [], cannotClaim: ["Most reliable"] },
        invalidationTriggers: ["Claims boundary changes"],
        upstreamVersions: [{ module: "m10", sessionId: "s", versionId: "v", hash: "h" }],
      },
      horizon: {
        directionalHorizon: "12 months",
        horizonRationale: "Long enough to test the evidence route, short enough to review.",
        longerTermAmbition: "",
        evidenceCutoff: "2026-10-01",
        cycleHorizon: "First controlled cycle of 90 days",
        proportionality: "Proportionate: the uncertainty is evidence velocity, not capital.",
      },
      recommendation: {
        outcome: "Publish the register as the buying criterion.",
        priorityAudience: "Operations leads",
        buyingSituation: "After a failed repair",
        requiredMovement: "From assumption to inspection",
      },
      route: {
        strategicRoute: "Evidence-led direct",
        credibleAlternative: "Channel partnerships",
        tradeoff: "Slower reach, stronger proof.",
      },
      moves: {
        moves: [
          { id: "move-1", name: "Publish the register", job: "Make proof inspectable", consequenceIds: ["c1"], evidenceState: "observed" },
          { id: "move-2", name: "Teach the method", job: "Show how to read it", consequenceIds: ["c2"], evidenceState: "hypothesis" },
          { id: "move-3", name: "Refuse placement", job: "Prove independence", consequenceIds: ["c3"], evidenceState: "observed" },
        ],
      },
      sequence: {
        phases: [{ phase: "First controlled cycle", horizon: "0-90 days", work: ["Publish the register"], progressionGate: "Register live and read" }],
        currentCycleObjective: "Publish the first register.",
        firstPhaseObjective: "Publish the first register.",
        progressionCondition: "The register is live and read by ten prospects.",
        firstEvidenceEvent: "First register publication",
        reviewEvent: "End of the first controlled cycle",
      },
      portfolio: {
        consequences: [
          { id: "c1", source: "m08", classification: "active-first-phase", reason: "Core proof", commercialJob: "Proof", dependencies: [], evidenceState: "observed", capacityNote: "", owner: "Synthetic Owner" },
          { id: "c2", source: "m09", classification: "next", reason: "Second phase", commercialJob: "Teaching", dependencies: ["c1"], evidenceState: "hypothesis", capacityNote: "", owner: "Synthetic Owner" },
        ],
      },
      exclusions: {
        exclusions: ["No paid placement"],
        deferredAlternatives: ["Channel partnerships"],
        invalidationTriggers: ["The register is not read"],
      },
      evidence: {
        dimensions: [{ dimension: "Buyer inspection", state: "observed", note: "Observed in the sealed market work." }],
        coreAssumption: "Buyers will inspect a published register.",
        preCycleTest: {
          required: overrides.preCycleRequired ?? false,
          id: overrides.preCycleRequired ? "pct-1" : "",
          effect: overrides.preCycleRequired ? "confirm" : "",
          resolved: overrides.resolved ?? "",
        },
      },
      decision,
    },
  });
}

test("A complete direction produces a handoff that satisfies the M11 consumer schema", () => {
  const session = direction();
  const handoff = validateHandoff(buildHandoff(session, { versionId: "version-1", hash: "b".repeat(64), at }));
  expect(handoff.downstream.m11Permission).toBe("granted");
  expect(handoff.downstream.reasons).toEqual([]);
  expect(handoff.downstream.direction.decisionState).toBe("client-approved");
  expect(handoff.downstream.direction.executionPermission).toBe("controlled-90-day");
  expect(handoff.downstream.direction.strategicMoveId).toBe("move-1");
  expect(handoff.downstream.direction.activeConsequenceIds).toEqual(["c1"]);
  expect(handoff.downstream.direction.exclusions).toEqual(["No paid placement"]);
  expect(handoff.downstream.direction.preCycleTest.required).toBe(false);
  expect(handoff.downstream.strategyRef.runId).toBe(session.sessionId);
  expect(handoff.downstream.claimsBoundary.cannotClaim).toEqual(["Most reliable"]);
});

test("A recommended but unapproved direction refuses M11 permission", () => {
  const permission = m11PermissionFor({
    response: "accept",
    decisionState: "recommended",
    executionPermission: "controlled-90-day",
    owner: { name: "Synthetic Owner", role: "Owner", authorityRef: "a" },
    exactDecision: "",
    authorisedWork: "",
    nextReviewTrigger: "",
  });
  expect(permission.permission).toBe("refused");
  expect(permission.reasons.join(" ")).toContain("client-approved");
});

test("Analysis-only permission refuses execution even when the client approved", () => {
  const handoff = buildHandoff(direction({ decision: { executionPermission: "analysis-only" } }), {
    versionId: "v",
    hash: "c".repeat(64),
    at,
  });
  expect(handoff.downstream.m11Permission).toBe("refused");
  expect(handoff.downstream.reasons.join(" ")).toContain("analysis-only");
  expect(() => validateHandoff({ ...handoff, downstream: { ...handoff.downstream, m11Permission: "granted" } })).toThrow(
    "non-approving decision state or unusable permission",
  );
});

test("An unresolved required pre-cycle test refuses M11 permission", () => {
  const session = direction({ preCycleRequired: true });
  const evidence = session.data.evidence as never;
  expect(preCycleBlocker(evidence)).toContain("pre-cycle test");
  const handoff = buildHandoff(session, { versionId: "v", hash: "d".repeat(64), at });
  expect(handoff.downstream.m11Permission).toBe("refused");
});

test("A resolved pre-cycle test permits M11 permission", () => {
  const session = direction({ preCycleRequired: true, resolved: "confirm" });
  expect(buildHandoff(session, { versionId: "v", hash: "e".repeat(64), at }).downstream.m11Permission).toBe("granted");
});

test("A handoff that selects no first-phase consequence is rejected", () => {
  const session = direction();
  (session.data.portfolio as { consequences: { classification: string }[] }).consequences.forEach((entry) => {
    entry.classification = "later";
  });
  expect(() => validateHandoff(buildHandoff(session, { versionId: "v", hash: "f".repeat(64), at }))).toThrow(
    "no Active / First Phase consequence",
  );
});
