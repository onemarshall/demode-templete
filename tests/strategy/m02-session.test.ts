import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import {
  ReconLog,
  M02Session,
  CollectionRecord,
  m02EvidenceBasisHash,
} from "../../src/lib/modules/strategy/server/stages/m02/session";
import { FolderName, SessionId, RouteKind } from "../../src/lib/modules/strategy/shared/types";
import {
  allowedOutcomes,
  requireGate,
} from "../../src/lib/modules/strategy/server/stages/m02/gates";
const id = "11111111-1111-4111-8111-111111111111",
  at = "2026-10-24T00:00:00.000Z";
function fixture() {
  const recon = ReconLog.parse({
    module: "02",
    sessionId: id,
    producedAt: at,
    updatedAt: at,
    m01Inputs: {
      sessionId: id,
      sealedAt: at,
      coreBelief: "Synthetic belief",
      brokenThing: "Synthetic problem",
      hiddenTruth: "Synthetic hidden truth",
      marketDeployableHiddenTruth: "Synthetic market truth",
      nonNegotiable: "Synthetic refusal",
      hardWonTeaching: "Synthetic teaching",
      legacy: "Synthetic legacy",
      claimsBoundaryInputs: {
        canClaim: ["Synthetic supported statement"],
        mustQualify: [],
        cannotClaim: [],
      },
    },
  });
  const collection = CollectionRecord.parse({
    collectionId: "synthetic-collection",
    state: "completed",
    updatedAt: at,
  });
  return { recon, collection, artifacts: { artifacts: [] } };
}

test("M02 evidence-basis hash preserves the pre-refactor canonical bytes", () => {
  const { recon, artifacts, collection } = fixture();
  // Computed from the original m02-session.ts in the verified pre-refactor archive.
  expect(m02EvidenceBasisHash(recon, artifacts, collection)).toBe(
    "2d8e8431a4d53e83b8acb232d0fa709eac85bfd72bc0405616ce521991f936e4",
  );
  const hash = (value: unknown) =>
    createHash("sha256")
      .update(JSON.stringify(value, null, 2))
      .digest("hex");
  expect(hash(recon)).toBe("7b6e4d8a8489f88aef65f45aa57926b1d9052af559b7dd8448ff33746e360c82");
  expect(hash(collection)).toBe("86642b697bdd16de5e11bc5acfd4eead452929f48b4a08cb684c33594e5feb38");
  const session = M02Session.parse({
    module: "02",
    sessionId: id,
    folder: "synthetic-brand",
    createdAt: at,
    updatedAt: at,
    stage: "setup",
    m01: { sessionId: id, sealedAt: at, outputsHash: "source-hash" },
    route: "full",
    routeStatus: "confirmed",
    research: {},
  });
  expect(hash(session)).toBe("b8995a20077258f344c85e266c74806c52feac9b55746d42bd7a571d6b96219b");
  const before = m02EvidenceBasisHash(recon, artifacts, collection);
  recon.updatedAt = "2026-10-25T00:00:00.000Z";
  expect(m02EvidenceBasisHash(recon, artifacts, collection)).toBe(before);
  recon.m01Inputs.coreBelief = "A changed synthetic premise";
  expect(m02EvidenceBasisHash(recon, artifacts, collection)).not.toBe(before);
});

test("M02 extraction retains unapproved defaults and provenance-sensitive collection events", () => {
  const { recon, artifacts, collection } = fixture();
  expect(recon.state.approvalState).toBe("unapproved");
  expect(recon.state.gateState).toBe("open");
  const before = m02EvidenceBasisHash(recon, artifacts, collection);
  collection.events.push({ id: "event-1", at, event: "resumed", detail: "Synthetic recovery" });
  expect(m02EvidenceBasisHash(recon, artifacts, collection)).not.toBe(before);
});

test("shared identity and legacy folder validators preserve their existing constraints", () => {
  expect(SessionId.parse(id)).toBe(id);
  expect(FolderName.safeParse("../another-brand").success).toBe(false);
  expect(RouteKind.options).toEqual(["skip", "light", "constrained", "full"]);
});

function eligibleRecon() {
  const { recon } = fixture();
  const candidate = ReconLog.parse({
    ...recon,
    gate5: { risks: ["r1", "r2", "r3", "r4"].map((pattern) => ({ pattern, state: "absent" })) },
  });
  for (const gate of ["p1", "p2", "p3"] as const) candidate.preconditions[gate].verdict = "pass";
  for (const gate of ["gate1", "gate2", "gate3", "gate4"] as const)
    candidate[gate].verdict = "pass";
  candidate.gate6.a.verdict = "pass";
  candidate.gate6.b.verdict = "pass";
  candidate.entanglement.pass = true;
  return candidate;
}

test("M02 complete internal evidence permits provisional work without claiming validation", () => {
  const recon = eligibleRecon();
  expect(allowedOutcomes(recon, "completed").options.map((x) => x.outcome)).toEqual([
    "provisional_a",
  ]);
  expect(allowedOutcomes(recon, "partial").options).toEqual([]);
  expect(allowedOutcomes(recon, "partial").blocked).toContain("collection is partial");
});

test("M02 later outcomes cannot skip a failed prerequisite or earlier vacuum gate", () => {
  const recon = eligibleRecon();
  recon.gate4.verdict = "fail";
  recon.gate2.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options).toEqual([]);
  expect(() => requireGate(recon, "gate2")).toThrow("run in order");
  recon.gate2.verdict = "pass";
  recon.preconditions.p2.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options).toEqual([]);
});

test("M02 distinguishes willingness-to-pay failure from hidden-truth failure", () => {
  const recon = eligibleRecon();
  recon.gate4.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options.map((x) => x.outcome)).toEqual(["outcome_b"]);
  recon.gate4.verdict = "pass";
  recon.gate6.b.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options.map((x) => x.outcome)).toEqual(["outcome_c"]);
});

test("M02 provisional progression requires resolved risk records and honest independent evidence", () => {
  const recon = eligibleRecon();
  const risk = recon.gate5.risks[0];
  risk.state = "present";
  expect(allowedOutcomes(recon, "completed").options).toEqual([]);
  risk.mitigationRouting = "m04";
  risk.acknowledgment = {
    line: "Synthetic acknowledgment",
    signedBy: "Synthetic reviewer",
    signedAt: at,
    declined: false,
    dispute: "",
  };
  expect(allowedOutcomes(recon, "completed").options.map((x) => x.outcome)).toEqual([
    "provisional_a",
  ]);
  recon.entanglement.pass = false;
  expect(allowedOutcomes(recon, "completed").options).toEqual([]);
  recon.entanglement.pass = true;
  recon.contrarianTrap.flags = ["Unresolved synthetic concern"];
  expect(allowedOutcomes(recon, "completed").options).toEqual([]);
});
