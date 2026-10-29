import { test, expect } from "bun:test";
import { Commitments } from "../../src/lib/modules/strategy/server/stages/m03/session";
import {
  confirmAdvocate,
  confirmChallenge,
  confirmConfrontations,
  confirmCost,
  confirmCredibility,
  confirmFriction,
  confirmGrid,
  confirmInputs,
  confirmJourney,
  confirmJudgement,
  confirmOutcome,
  confirmProof,
  outcomeCheck,
  RELIANCE_SCOPE_A,
  RELIANCE_SCOPE_X,
} from "../../src/lib/modules/strategy/server/stages/m03/rules";
import { m03Upstream } from "./fixtures/m03";

const commitments = () =>
  Commitments.parse({
    module: "03",
    sessionId: "44444444-4444-4444-8444-444444444444",
    producedAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:00.000Z",
    upstream: m03Upstream(),
  });

const complete = () => {
  const c = commitments();
  confirmInputs(c, {
    solvesFor: "founder",
    solvesForNote: "",
    commitmentScope: "business",
    scopeNote: "",
    priorPositioning: { supplied: false, source: "", currentness: "", text: "", note: "" },
    terrainRead: "Synthetic terrain read.",
  });
  confirmChallenge(c, { contradictions: ["Synthetic contradiction"], genuineVsContrarian: "Genuine." });
  confirmJourney(c, {
    from: "FROM belief",
    to: "TO belief",
    experientialChange: "Synthetic experiential change.",
    experienceShape: "knowledge",
    discoveryMechanism: "Synthetic discovery mechanism.",
  });
  confirmGrid(c, { rows: gridRows() });
  confirmProof(c, { rows: proofRows() });
  confirmFriction(c, frictionBody());
  confirmCredibility(c, {
    referenceEvidence: "Synthetic evidence",
    state: "credible",
    cause: "",
    reviewCondition: "",
  });
  confirmConfrontations(c, {
    pastAudit: [{ item: "Synthetic item", beliefSays: "yes", decision: null, note: "" }],
    futureConfrontations: [],
  });
  confirmCost(c, { costs: ["Synthetic cost"] });
  confirmAdvocate(c, {
    challenges: [
      { id: "case-for-default", case: "Synthetic case", verdict: "survives", note: "" },
      { id: "funded-copycat", case: "Synthetic case", verdict: "survives", note: "" },
      { id: "positioning-vs-preference", case: "Synthetic case", verdict: "survives", note: "" },
    ],
  });
  confirmJudgement(c, {
    optionsConsidered: ["Option one", "Option two"],
    recommendation: "Synthetic recommendation",
    confidence: "moderate",
    confidenceBasis: "Synthetic basis",
    commercialConsequences: { ifHolds: "a", ifNot: "b", ifNoDecision: "c" },
    reversalConditions: "Synthetic reversal",
    integrityCheck: "Synthetic integrity",
    professionalCall: "proceed",
    nextWork: "Synthetic next work",
  });
  return c;
};

const gridRows = () =>
  (["question", "reject", "commit", "introduce"] as const).map((action) => ({
    action,
    move: `${action} move`,
    beliefRationale: `${action} rationale`,
    proofCommitment: `${action} proof`,
    operationalRule: `${action} rule`,
    specialisationSignal: action === "question" || action === "reject" ? "Signal" : "",
    proofArtefactType: action === "commit" || action === "introduce" ? "Artefact" : "",
    traceToBelief: "Trace to belief",
  }));

const proofRows = () =>
  (["question", "reject", "commit", "introduce"] as const).map((action) => ({
    action,
    product: "Product",
    policy: "",
    story: "",
    framework: "",
    proofEconomy: "discrete-at-cost" as const,
    evidenceStatus: "supported" as const,
    claimBoundaryNote: "Stays in can-claim.",
    capturePlan: "",
  }));

const frictionBody = () => ({
  rows: (["question", "reject", "commit", "introduce"] as const).map((action) => ({
    action,
    sources: Object.fromEntries(
      [
        "beliefContradiction",
        "operationalChange",
        "culturalShift",
        "customerExplanation",
        "economicCost",
        "accumulatedProof",
        "specialistAuthority",
      ].map((source) => [source, { level: "high" as const, note: `${source} note` }]),
    ) as never,
  })),
  lowestFrictionCompetitor: "Synthetic competitor",
  lowestFrictionBasis: "Synthetic basis",
  threatAssessment: "Synthetic assessment mentioning r1.",
});

test("M03 grid requires one row per action and a visible refusal or artefact per action", () => {
  const c = commitments();
  expect(() =>
    confirmGrid(c, { rows: gridRows().slice(0, 3) as never }),
  ).toThrow("The grid is missing a introduce row");
  const missingSignal = gridRows();
  missingSignal[0]!.specialisationSignal = "";
  expect(() => confirmGrid(c, { rows: missingSignal })).toThrow(
    "QUESTION needs a Public Specialisation Signal",
  );
  const missingArtefact = gridRows();
  missingArtefact[2]!.proofArtefactType = "";
  expect(() => confirmGrid(c, { rows: missingArtefact })).toThrow(
    "COMMIT needs a deployable proof artefact type",
  );
  confirmGrid(c, { rows: gridRows() });
  expect(c.grid).toHaveLength(4);
});

test("M03 proof flags must-qualify claims and demands a capture plan for unproven proof", () => {
  const c = commitments();
  const unplanned = proofRows();
  unplanned[0]!.evidenceStatus = "prospective";
  expect(() => confirmProof(c, { rows: unplanned })).toThrow(
    "record the capture-and-review plan",
  );
  const noProof = proofRows();
  noProof[0] = { ...noProof[0]!, product: "", policy: "", story: "", framework: "" };
  expect(() => confirmProof(c, { rows: noProof })).toThrow("has no proof point");

  const qualifying = proofRows();
  qualifying[0]!.claimBoundaryNote = "Sits in must-qualify: cohort dependent.";
  confirmProof(c, { rows: qualifying });
  expect(c.riskFlags.some((flag) => flag.includes("must-qualify claims"))).toBe(true);
});

test("M03 friction requires all seven sources, names the copy threat and lands m03-routed risks", () => {
  const c = commitments();
  const incomplete = frictionBody();
  delete (incomplete.rows[0]!.sources as Record<string, unknown>).economicCost;
  expect(() => confirmFriction(c, incomplete as never)).toThrow(
    "economicCost has no level; assess all seven sources",
  );
  confirmFriction(c, frictionBody());
  expect(
    c.riskFlags.filter((flag) => flag.startsWith("Lowest-friction copy threat:")),
  ).toHaveLength(1);
  expect(c.upstream.carriedForward.acknowledgedRisks[0]!.landedIn).toBe("friction");
});

test("M03 credibility and confrontations keep their blocking conditions", () => {
  const c = commitments();
  expect(() =>
    confirmCredibility(c, {
      referenceEvidence: "",
      state: "credibility-gap",
      cause: "",
      reviewCondition: "",
    }),
  ).toThrow("A credibility gap needs its likely cause named");
  expect(() =>
    confirmCredibility(c, {
      referenceEvidence: "",
      state: "credibility-gap",
      cause: "Early proof",
      reviewCondition: "",
    }),
  ).toThrow("A named gap needs a review condition");
  confirmCredibility(c, {
    referenceEvidence: "",
    state: "not-yet-observable",
    cause: "Early proof",
    reviewCondition: "",
  });
  expect(c.riskFlags.some((flag) => flag.startsWith("Credibility gap:"))).toBe(true);

  expect(() =>
    confirmConfrontations(c, {
      pastAudit: [{ item: "Contradiction", beliefSays: "no", decision: null, note: "" }],
      futureConfrontations: [],
    }),
  ).toThrow("it needs a decision");
});

test("M03 cost, advocate and inputs keep their recorded side effects", () => {
  const c = commitments();
  confirmCost(c, { costs: [] });
  expect(c.riskFlags.some((flag) => flag.startsWith("No cost of commitment"))).toBe(true);

  expect(() =>
    confirmAdvocate(c, {
      challenges: [
        { id: "case-for-default", case: "Case", verdict: "survives", note: "" },
        { id: "funded-copycat", case: "Case", verdict: "survives", note: "" },
      ] as never,
    }),
  ).toThrow('The "Is this positioning or just preference?" challenge is missing');
  confirmAdvocate(c, {
    challenges: [
      { id: "case-for-default", case: "Case", verdict: "fails", note: "" },
      { id: "funded-copycat", case: "Case", verdict: "survives", note: "" },
      { id: "positioning-vs-preference", case: "Case", verdict: "survives", note: "" },
    ],
  });
  expect(c.riskFlags.some((flag) => flag.startsWith("Advocate challenge failed:"))).toBe(true);

  expect(() =>
    confirmInputs(c, {
      solvesFor: "founder",
      solvesForNote: "",
      commitmentScope: "business",
      scopeNote: "",
      priorPositioning: { supplied: true, source: "s", currentness: "c", text: "", note: "" },
      terrainRead: "Synthetic read.",
    }),
  ).toThrow("Prior positioning marked as supplied but the material is empty");
  expect(() =>
    confirmInputs(c, {
      solvesFor: "founder",
      solvesForNote: "",
      commitmentScope: "business",
      scopeNote: "",
      priorPositioning: { supplied: false, source: "", currentness: "", text: "", note: "" },
      terrainRead: "",
    }),
  ).toThrow("The terrain is undiagnosed");
});

test("M03 outcome A requires a complete record and always lands provisional", () => {
  const empty = commitments();
  expect(outcomeCheck(empty).canA).toBe(false);
  expect(() => confirmOutcome(empty, { outcome: "a", statement: "Synthetic", returnDoc: null })).toThrow(
    "Outcome A isn't recordable",
  );

  const c = complete();
  expect(outcomeCheck(c).problems).toEqual([]);
  confirmOutcome(c, { outcome: "a", statement: "Synthetic outcome", returnDoc: null });
  expect(c.state.runtime).toBe("provisional");
  expect(c.state.relianceScope).toBe(RELIANCE_SCOPE_A);
  expect(c.state.evidenceState).toBe("builder-verified (upstream provisional)");
});

test("M03 outcome X requires a return document and records no authorised handoff", () => {
  const c = complete();
  expect(() => confirmOutcome(c, { outcome: "x", statement: "Synthetic", returnDoc: null })).toThrow(
    "Outcome X needs the return document",
  );
  confirmOutcome(c, {
    outcome: "x",
    statement: "Synthetic return",
    returnDoc: { module: "02", refineWhat: "Refine the evidence.", evidenceProduced: "Synthetic finding." },
  });
  expect(c.state.runtime).toBe("outcome_x");
  expect(c.state.relianceScope).toBe(RELIANCE_SCOPE_X);
});

test("M03 outcome A is blocked by an undecided contradiction and a failed advocate challenge", () => {
  const undecided = complete();
  undecided.confrontations.pastAudit = [
    { item: "Contradiction", beliefSays: "no", decision: "undecided", note: "" },
  ];
  expect(outcomeCheck(undecided).problems.join(" ")).toContain("undecided");

  const failed = complete();
  failed.advocate.challenges[1]!.verdict = "fails";
  expect(outcomeCheck(failed).problems.join(" ")).toContain("Advocate challenges failed");
});

test("M03 every mutable schema default is a fresh value per parse", () => {
  const first = commitments();
  const second = commitments();
  first.confirmations ??= {};
  first.grid.push({ ...gridRows()[0]! });
  first.upstream.carriedForward.acknowledgedRisks[0]!.landedIn = "friction";
  first.riskFlags.push("mutated");
  const third = commitments();
  expect(third.grid).toHaveLength(0);
  expect(third.riskFlags).toHaveLength(0);
  expect(third.upstream.carriedForward.acknowledgedRisks[0]!.landedIn).toBeNull();
  expect(second.riskFlags).toHaveLength(0);
});
