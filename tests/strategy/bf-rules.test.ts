import { test, expect } from "bun:test";
import {
  Assessment,
  FoundationDoc,
  Manifesto,
  Session,
} from "../../src/lib/modules/strategy/server/stages/bf/contracts";
import {
  assessmentProblems,
  checksBF,
  computeGate,
  declarationProblems,
  hashBF,
  renderProblems,
} from "../../src/lib/modules/strategy/server/stages/bf/rules";
import { bfAssessment, bfDocument, bfManifesto } from "./fixtures/bf";

const session = (data: Record<string, unknown> = {}) =>
  Session.parse({
    module: "bf",
    sessionId: "44444444-4444-4444-8444-444444444444",
    folder: "synthetic-brand",
    revision: 3,
    createdAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:00.000Z",
    stage: "assessment",
    status: "draft",
    sourceHash: "synthetic-source-hash",
    sources: { entry: { receipt: { decisionOwner: { name: "Synthetic Owner" } } }, m04: { routeAuthorization: { authorised_capability: "full-standard" } } },
    data,
  });

test("BF assessment cannot pass with an unsupported sufficient row or a blocking contradiction", () => {
  const base = bfAssessment();
  expect(assessmentProblems(Assessment.parse(base))).toEqual([]);

  const unsupported = bfAssessment();
  unsupported.rows[0] = { ...unsupported.rows[0]!, basis: "unknown" };
  expect(assessmentProblems(Assessment.parse(unsupported)).join(" ")).toContain(
    "a row can't be sufficient on an unknown basis",
  );

  const blocking = bfAssessment();
  blocking.contradictions = [
    {
      id: "c1",
      issue: "Two sources disagree",
      owningSource: "Market reality",
      whyItMatters: "It changes the offer",
      requiredAction: "Resolve upstream",
      blocksFoundation: true,
    },
  ];
  expect(assessmentProblems(Assessment.parse(blocking)).join(" ")).toContain("still block the foundation");

  const notPassed = bfAssessment();
  notPassed.decision = {
    state: "remediation_required",
    reason: "Missing offers",
    questions: [],
    returnOwners: [],
    manifestoRoute: "refused",
  };
  expect(assessmentProblems(Assessment.parse(notPassed)).join(" ")).toContain(
    "Record at least one plain question",
  );
});

test("BF declarations must be extracted verbatim and fully traced", () => {
  const manifesto = Manifesto.parse(bfManifesto());
  expect(declarationProblems(manifesto)).toEqual([]);

  const invented = bfManifesto();
  invented.declarations = [...invented.declarations, "A declaration that was never written above."];
  expect(declarationProblems(Manifesto.parse(invented)).join(" ")).toContain(
    "not found verbatim in the manifesto",
  );

  const untraced = bfManifesto();
  untraced.sourceTrace = untraced.sourceTrace.slice(1);
  expect(declarationProblems(Manifesto.parse(untraced)).join(" ")).toContain(
    "Source trace is missing an entry",
  );

  const unassessed = bfManifesto();
  unassessed.declarationTests = unassessed.declarationTests.map((entry, index) =>
    index === 0 ? { ...entry, result: "unassessed" as const } : entry,
  );
  expect(declarationProblems(Manifesto.parse(unassessed)).join(" ")).toContain(
    "has not been assessed",
  );
});

test("BF document checks catch leaks, missing lineage, unresolved dependencies and failed tests", () => {
  const doc = FoundationDoc.parse(bfDocument());
  const manifesto = Manifesto.parse(bfManifesto());
  expect(renderProblems(doc, manifesto)).toEqual([]);

  const leaking = { ...bfDocument(), plainTerms: "See sessionId 44444444-4444-4444-8444-444444444444." };
  expect(renderProblems(FoundationDoc.parse(leaking), manifesto).join(" ")).toContain(
    "Internal machinery leaks",
  );

  const missingLineage = bfDocument();
  missingLineage.sectionLineage = missingLineage.sectionLineage.filter(
    (entry) => entry.section !== "approval",
  );
  expect(renderProblems(FoundationDoc.parse(missingLineage), manifesto).join(" ")).toContain(
    'does not cover "approval"',
  );

  const unresolved = { ...bfDocument(), explanatoryDependency: "unresolved" as const };
  expect(renderProblems(FoundationDoc.parse(unresolved), manifesto).join(" ")).toContain(
    "explanatory dependency is unresolved",
  );

  const failed = bfDocument();
  failed.structuralTests[0] = { ...failed.structuralTests[0]!, result: "fail" as const };
  expect(renderProblems(FoundationDoc.parse(failed), manifesto).join(" ")).toContain("marked failed");
});

test("BF gate reports every failing condition and opens only when all pass", () => {
  const empty = session();
  const blocked = checksBF(empty, false);
  expect(blocked.find((check) => check.id === "upstream")?.passed).toBe(false);
  expect(computeGate(empty, false).m05Permission).toBe("denied");

  const full = session({
    assessment: bfAssessment(),
    manifesto: bfManifesto(),
    document: bfDocument(),
    approval: {
      response: "approve",
      businessConfirmed: true,
      standConfirmed: true,
      approver: { name: "Synthetic Owner", role: "Owner", authorityRef: "synthetic-authority-1" },
      exactResponse: "Approved as written.",
      revisionNote: "",
      disputedField: "",
      returnOwner: null,
    },
  });
  full.confirmations.assessment = {
    actor: { name: "operator", role: "operator", authorityRef: "operator" },
    at: "2026-10-29T12:00:00.000Z",
    decision: "confirmed",
    target: "assessment",
    revision: 2,
    hash: hashBF(full.data.assessment),
    sourceHash: full.sourceHash,
  };
  full.confirmations.manifesto = { ...full.confirmations.assessment, target: "manifesto", hash: hashBF(full.data.manifesto) };
  full.confirmations.document = { ...full.confirmations.assessment, target: "document", hash: hashBF(full.data.document) };
  full.review = {
    model: "synthetic-model",
    at: "2026-10-29T12:00:00.000Z",
    findings: [],
    recheck: { at: "2026-10-29T12:00:00.000Z", result: "pass", note: "" },
  };
  const open = computeGate(full, true);
  expect(open.downstreamGateState).toBe("open");
  expect(open.m05Permission).toBe("granted");
});

