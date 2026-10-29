import { test, expect } from "bun:test";
import {
  DATA_KEYS,
  GATE_IDS,
  HIERARCHY_LEVELS,
  LENS_IDS,
  Session,
  STAGE_SCHEMAS,
  VIEW_IDS,
} from "../../src/lib/modules/strategy/server/stages/m05/contracts";

const session = () =>
  Session.parse({
    module: "05",
    sessionId: "44444444-4444-4444-8444-444444444444",
    folder: "synthetic-brand",
    revision: 0,
    createdAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:00.000Z",
    stage: "eligibility",
    status: "draft",
    route: "full",
    sourceHash: "synthetic-source-hash",
    sources: { bf: { sessionId: "55555555-5555-4555-8555-555555555555" } },
    capability: "full-standard",
  });

test("M05 session parses with its declared defaults and no shared mutable state", () => {
  const first = session();
  expect(first.confirmations).toEqual({});
  expect(first.data).toEqual({});
  expect(first.drafts).toEqual({});
  expect(first.history).toEqual([]);
  expect(first.candidateHash).toBeNull();
  expect(first.seal).toBeNull();

  first.confirmations.inheritance = {
    actor: { name: "operator", role: "operator", authorityRef: "operator" },
    at: "2026-10-29T12:00:00.000Z",
    decision: "confirmed",
    target: "inheritance",
    revision: 1,
    hash: "a".repeat(64),
    sourceHash: "synthetic-source-hash",
  };
  first.history.push({ action: "created" });

  const second = session();
  expect(second.confirmations).toEqual({});
  expect(second.history).toEqual([]);
});

test("M05 stage schemas cover every data stage and the fixed vocabularies are complete", () => {
  expect(Object.keys(STAGE_SCHEMAS).sort()).toEqual(Object.keys(DATA_KEYS).sort());
  expect(GATE_IDS).toHaveLength(7);
  expect(LENS_IDS).toHaveLength(8);
  expect(VIEW_IDS).toHaveLength(6);
  expect(HIERARCHY_LEVELS).toHaveLength(14);
});

test("M05 rejects a session with an unknown stage or status", () => {
  expect(() => Session.parse({ ...session(), stage: "not-a-stage" })).toThrow();
  expect(() => Session.parse({ ...session(), status: "not-a-status" })).toThrow();
});
