import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { Session } from "../../src/lib/modules/strategy/server/stages/bf/contracts";
import {
  BF_VERSION_HASH_ALGORITHM,
  makeBFSeal,
  sealPayload,
  verifyBFSeal,
} from "../../src/lib/modules/strategy/server/stages/bf/seal";
import { computeGate, hashBF } from "../../src/lib/modules/strategy/server/stages/bf/rules";
import { renderBF } from "../../src/lib/modules/strategy/server/stages/bf/render";
import { bfAssessment, bfDocument, bfManifesto } from "./fixtures/bf";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function sealed() {
  const session = Session.parse({
    module: "bf",
    sessionId: "44444444-4444-4444-8444-444444444444",
    folder: "synthetic-brand",
    revision: 9,
    createdAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T13:00:00.000Z",
    stage: "client-decision",
    status: "draft",
    sourceHash: sha("source"),
    sources: {
      entry: { receipt: { decisionOwner: { name: "Synthetic Owner" } } },
      m04: { routeAuthorization: { authorised_capability: "full-standard" } },
    },
    data: {
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
    },
  });
  const confirmation = (target: string, value: unknown) => ({
    actor: { name: "operator", role: "operator", authorityRef: "operator" },
    at: "2026-10-29T12:00:00.000Z",
    decision: "confirmed",
    target,
    revision: 5,
    hash: hashBF(value),
    sourceHash: session.sourceHash,
  });
  session.confirmations.assessment = confirmation("assessment", session.data.assessment);
  session.confirmations.manifesto = confirmation("manifesto", session.data.manifesto);
  session.confirmations.document = confirmation("document", session.data.document);
  session.review = {
    model: "synthetic-reviewer",
    at: "2026-10-29T12:00:00.000Z",
    findings: [],
    recheck: { at: "2026-10-29T12:00:00.000Z", result: "pass", note: "" },
  };
  const gate = computeGate(session, true);
  session.gate = gate;
  session.stage = "sealed";
  session.status = "sealed";
  const rendered = renderBF(bfDocument() as never, bfManifesto() as never, session.data.approval as never, session.revision);
  const receipt = makeBFSeal(session, gate, rendered, "synthetic-operator", "2026-10-29T13:00:00.000Z");
  session.seal = { versionId: receipt.receiptId, hash: receipt.sealHash, at: receipt.sealedAt, path: `database:${receipt.receiptId}` };
  const canonicalPayload = JSON.stringify({
    receipt,
    payload: sealPayload(session, gate),
    lineage: { parentSessionId: null, successorReason: "" },
    source: { hash: session.sourceHash },
    rendered,
    renderedHash: sha(rendered),
  });
  return {
    session,
    receipt,
    rendered,
    version: { canonicalPayload, sealHash: sha(canonicalPayload), hashAlgorithm: BF_VERSION_HASH_ALGORITHM },
  };
}

test("BF seal verifies against its immutable version, receipt and sealed record", () => {
  const { session, version, receipt, rendered } = sealed();
  const checked = verifyBFSeal({
    sessionId: session.sessionId,
    version,
    current: session,
    expectedSourceHash: session.sourceHash,
  });
  expect(checked.valid).toBe(true);
  if (checked.valid) {
    expect(checked.receipt.receiptId).toBe(receipt.receiptId);
    expect(checked.rendered).toBe(rendered);
    expect(checked.receipt.gate.m05Permission).toBe("granted");
  }
});

test("BF seal detects changed content, a changed source pin and a tampered payload", () => {
  const { session, version } = sealed();

  const changed = Session.parse(structuredClone(session));
  changed.data.document = { ...(changed.data.document as object), distinction: "Changed after seal" };
  expect(
    verifyBFSeal({
      sessionId: session.sessionId,
      version,
      current: changed,
      expectedSourceHash: session.sourceHash,
    }).valid,
  ).toBe(false);

  expect(
    verifyBFSeal({
      sessionId: session.sessionId,
      version,
      current: session,
      expectedSourceHash: sha("another source"),
    }).valid,
  ).toBe(false);

  const tampered = {
    ...version,
    canonicalPayload: version.canonicalPayload.replace("Synthetic Repair Co", "Another Business"),
  };
  expect(
    verifyBFSeal({
      sessionId: session.sessionId,
      version: tampered,
      current: session,
      expectedSourceHash: session.sourceHash,
    }).valid,
  ).toBe(false);
});
