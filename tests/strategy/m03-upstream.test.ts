import { test, expect } from "bun:test";
import { validateM03Source } from "../../src/lib/modules/strategy/server/stages/m03/source";
import { m03Source } from "./fixtures/m03";

test("M03 accepts a sealed M02 outcome A with a locked M01 upstream", () => {
  expect(validateM03Source(m03Source()).m02Outcome).toBe("provisional_a");
  expect(validateM03Source(m03Source({ m02Outcome: "validated_a" })).m02Outcome).toBe(
    "validated_a",
  );
});

test("M03 refuses B and C outcomes — the upstream schema admits only Outcome A", () => {
  // The contract is the first gate: a B or C outcome cannot even be represented as M03 upstream.
  expect(() => validateM03Source(m03Source({ m02Outcome: "outcome_b" }))).toThrow();
  expect(() => validateM03Source(m03Source({ m02Outcome: "outcome_c" }))).toThrow();
  expect(() => validateM03Source(m03Source({ m02Outcome: "pending" }))).toThrow();
});

test("M03 refuses a contrarian-trap flag and routes back to Founder Conviction", () => {
  const source = m03Source();
  (source.body as { carriedForward: { contrarianFlags: string[] } }).carriedForward.contrarianFlags = [
    "Rejecting the default without evidence",
  ];
  expect(() => validateM03Source(source)).toThrow("contrarian trap");
});

test("M03 refuses a stale or missing M01 lock", () => {
  expect(() =>
    validateM03Source(m03Source({ m01: { ...(m03Source().body as any).m01, lockState: "stale" } })),
  ).toThrow("not locked");
  expect(() =>
    validateM03Source(m03Source({ m01: { ...(m03Source().body as any).m01, lockState: "missing" } })),
  ).toThrow("not locked");
});

test("M03 refuses an upstream whose M01 identity does not match its verbatim inputs", () => {
  const source = m03Source();
  (source.body as { m01Inputs: { sealedAt: string } }).m01Inputs.sealedAt =
    "2026-10-29T09:00:00.000Z";
  expect(() => validateM03Source(source)).toThrow(
    "M01 seal time does not match its verbatim inputs",
  );
});
