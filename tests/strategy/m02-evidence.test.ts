import { test, expect } from "bun:test";
import {
  Artifact,
  entanglementCheck,
  gateEvidenceCheck,
  type ArtifactStore,
} from "../../src/lib/modules/strategy/server/stages/m02/evidence";
function artifact(
  id: string,
  kind: "competitor" | "customer" | "market" | "sector_synthesis",
  url: string,
) {
  return Artifact.parse({
    id,
    kind,
    url,
    channel: "url_fetch",
    source: "Synthetic evidence",
    retrievedAt: "2026-10-24T00:00:00Z",
    access: "public",
    verbatim: "Synthetic source text only.",
  });
}
const refs = { gate2: ["art_00000001"], gate3: ["art_00000002"], gate6a: ["art_00000003"] };
function evidence(): ArtifactStore {
  return {
    artifacts: [
      artifact("art_00000001", "competitor", "https://competitor.example/page"),
      artifact("art_00000002", "customer", "https://customer.example/review"),
      artifact("art_00000003", "market", "https://market.example/report"),
    ],
  };
}

test("M02 requires independent actual sources, not merely different artifact IDs", () => {
  const store = evidence();
  expect(entanglementCheck(store, refs).pass).toBe(true);
  store.artifacts[1].url = "https://competitor.example/page/?tracking=1#section";
  const result = entanglementCheck(store, refs);
  expect(result.pass).toBe(false);
  expect(result.problems.join(" ")).toContain("share artifacts");
});

test("M02 sector material cannot satisfy a client evidence gate alone", () => {
  const store = evidence();
  store.artifacts[0].kind = "sector_synthesis";
  expect(entanglementCheck(store, refs).problems.join(" ")).toContain("sector synthesis alone");
  expect(entanglementCheck(store, { gate2: ["missing"], gate3: [], gate6a: [] }).pass).toBe(false);
});

test("M02 gate citations must resolve to gathered evidence of the required kind", () => {
  const store = evidence(),
    gates = { gate1: refs.gate2, ...refs, gate4: refs.gate3 };
  expect(gateEvidenceCheck(store, gates).pass).toBe(true);
  store.artifacts[1].status = "failed";
  expect(gateEvidenceCheck(store, gates).problems.join(" ")).toContain("not gathered");
  store.artifacts[1].status = "gathered";
  store.artifacts[1].kind = "competitor";
  expect(gateEvidenceCheck(store, gates).problems.join(" ")).toContain(
    "not an allowed evidence kind",
  );
  expect(Artifact.safeParse({ ...store.artifacts[0], kind: "founder-testimony" }).success).toBe(
    false,
  );
});

test("M02 explicit gate exemptions retain their existing scope", () => {
  expect(
    gateEvidenceCheck(
      { artifacts: [] },
      { gate1: [], gate2: [], gate3: [], gate4: [], gate6a: [] },
      { gate1: false, gate2: false, gate3: false, gate4: false, gate6a: false },
    ).pass,
  ).toBe(true);
  expect(
    entanglementCheck(
      { artifacts: [] },
      { gate2: [], gate3: [], gate6a: [] },
      { gate2: false, gate3: false, gate6a: false },
    ).pass,
  ).toBe(true);
});
