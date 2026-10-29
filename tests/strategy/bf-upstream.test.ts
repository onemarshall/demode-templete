import { test, expect } from "bun:test";
import { validateBFSource } from "../../src/lib/modules/strategy/server/stages/bf/source";
import { bfSource } from "./fixtures/bf";

const withRoute = (routeAuthorization: Record<string, unknown>) => {
  const source = bfSource();
  (source.body as { m04: { routeAuthorization: Record<string, unknown> } }).m04.routeAuthorization =
    routeAuthorization;
  return source;
};

test("BF accepts a sealed viability route that authorises foundation preparation", () => {
  expect(
    validateBFSource(
      withRoute({
        decision_state: "authorised",
        authorised_capability: "full-standard",
      }),
    ).m04.routeAuthorization["authorised_capability"],
  ).toBe("full-standard");
  expect(() =>
    validateBFSource(
      withRoute({ decision_state: "authorised", authorised_capability: "hypothesis-only" }),
    ),
  ).not.toThrow();
});

test("BF refuses a waiting or terminal route and an unauthorised capability", () => {
  expect(() =>
    validateBFSource(withRoute({ decision_state: "waiting", authorised_capability: "full-standard" })),
  ).toThrow("does not permit foundation preparation");
  expect(() =>
    validateBFSource(withRoute({ decision_state: "authorised", authorised_capability: "none" })),
  ).toThrow("does not permit foundation preparation");
});

test("BF refuses an engagement authority with no named decision owner", () => {
  const source = bfSource();
  (source.body as { entry: { receipt: Record<string, unknown> } }).entry.receipt = {
    route: { route: "full" },
  };
  expect(() => validateBFSource(source)).toThrow("names no decision owner");
});
