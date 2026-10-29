import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { M03Record } from "../../src/lib/modules/strategy/server/stages/m03/session";
import {
  M03_VERSION_HASH_ALGORITHM,
  makeM03Seal,
  verifyM03Seal,
} from "../../src/lib/modules/strategy/server/stages/m03/seal";
import { renderM03ClientDoc } from "../../src/lib/modules/strategy/server/stages/m03/render";
import { confirmOutcome, outcomeCheck } from "../../src/lib/modules/strategy/server/stages/m03/rules";
import { m03Upstream } from "./fixtures/m03";
import { completeCommitments } from "./fixtures/m03-complete";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function sealedRecord() {
  const commitments = completeCommitments();
  expect(outcomeCheck(commitments).canA).toBe(true);
  confirmOutcome(commitments, {
    outcome: "a",
    statement: "Synthetic outcome statement.",
    returnDoc: null,
  });
  commitments.state = { ...commitments.state, versionState: "sealed" };
  const record = M03Record.parse({
    revision: 20,
    session: {
      module: "03",
      sessionId: commitments.sessionId,
      folder: "synthetic-brand",
      createdAt: "2026-10-29T12:00:00.000Z",
      updatedAt: "2026-10-29T13:00:00.000Z",
      stage: "sealed",
      m02: {
        sessionId: (m03Upstream() as any).m02SessionId,
        sealedAt: "2026-10-29T12:00:00.000Z",
        outcome: "provisional_a",
        relianceScope: "Module 03 hypothesis work only",
      },
      m01: {
        sessionId: (m03Upstream() as any).m01.sessionId,
        sealedAt: "2026-10-29T10:00:00.000Z",
        outputsHash: (m03Upstream() as any).m01.outputsHash,
        lockState: "locked",
      },
      route: "full",
      routeStatus: "confirmed",
      routeReason: "",
      confirmations: { sealed: { by: "synthetic-operator", at: "2026-10-29T13:00:00.000Z" } },
    },
    commitments,
    drafts: {},
    seal: null,
    sourceVersionId: "55555555-5555-4555-8555-555555555555",
    sourceHash: sha("source"),
    parentSessionId: null,
    successorReason: "",
    history: [],
  });
  const receipt = makeM03Seal(record, "synthetic-operator", "2026-10-29T13:00:00.000Z");
  record.seal = receipt;
  const rendered = renderM03ClientDoc(record.commitments);
  const canonicalPayload = JSON.stringify({
    receipt,
    snapshots: {
      session: structuredClone(record.session),
      commitments: structuredClone(record.commitments),
    },
    lineage: { parentSessionId: record.parentSessionId, successorReason: record.successorReason },
    source: { versionId: record.sourceVersionId, hash: record.sourceHash },
    rendered,
    renderedHash: sha(rendered),
  });
  return {
    record,
    receipt,
    rendered,
    version: {
      canonicalPayload,
      sealHash: sha(canonicalPayload),
      hashAlgorithm: M03_VERSION_HASH_ALGORITHM,
    },
  };
}

test("M03 seal verifies against its immutable version, receipt and snapshots", () => {
  const { record, version, receipt, rendered } = sealedRecord();
  const checked = verifyM03Seal({
    sessionId: record.session.sessionId,
    version,
    current: record,
    expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash },
  });
  expect(checked.valid).toBe(true);
  if (checked.valid) {
    expect(checked.receipt.receiptId).toBe(receipt.receiptId);
    expect(checked.rendered).toBe(rendered);
    expect(checked.receipt.passState).toBe("provisional");
  }
});

test("M03 seal detects a changed record, a changed source pin and a tampered payload", () => {
  const { record, version } = sealedRecord();

  const changed = structuredClone(record);
  changed.commitments.costOfCommitment.costs.push("A cost added after seal");
  expect(
    verifyM03Seal({
      sessionId: record.session.sessionId,
      version,
      current: changed,
      expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash },
    }).valid,
  ).toBe(false);

  expect(
    verifyM03Seal({
      sessionId: record.session.sessionId,
      version,
      current: record,
      expectedSource: { versionId: record.sourceVersionId, hash: sha("another source") },
    }).valid,
  ).toBe(false);

  const tampered = { ...version, canonicalPayload: version.canonicalPayload.replace("Provisional", "Validated") };
  expect(
    verifyM03Seal({
      sessionId: record.session.sessionId,
      version: tampered,
      current: record,
      expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash },
    }).valid,
  ).toBe(false);
});

test("M03 rendered document carries the confirmed record, not model text", () => {
  const { rendered } = sealedRecord();
  expect(rendered).toContain("# Business Commitments");
  expect(rendered).toContain("**Status: Provisional**");
  expect(rendered).toContain("**Recommendation:** Synthetic recommendation");
  expect(rendered).toContain("Module 03 hypothesis work only");
  expect(rendered).not.toContain("undefined");
});

test("M03 outcome X renders the structured return document instead", () => {
  const commitments = completeCommitments();
  confirmOutcome(commitments, {
    outcome: "x",
    statement: "Synthetic return finding.",
    returnDoc: {
      module: "02",
      refineWhat: "Refine the evidence base.",
      evidenceProduced: "Synthetic evidence for that work.",
    },
  });
  const rendered = renderM03ClientDoc(commitments);
  expect(rendered).toContain("# Business Commitments — return to upstream work");
  expect(rendered).toContain("Do not lock any Business Commitments output");
  expect(rendered).toContain("Synthetic return finding.");
});
