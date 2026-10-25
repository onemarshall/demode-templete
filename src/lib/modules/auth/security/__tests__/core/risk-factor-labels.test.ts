import { describe, expect, it } from "vitest";
import { humaniseRiskFactor, humaniseRiskFactors } from "../../core/risk-factor-labels";

describe("risk factor labels", () => {
  it("renders known engine factors as concrete reviewer-facing phrases", () => {
    expect(humaniseRiskFactor("tor_exit_node")).toBe("traffic from the Tor network");
    expect(humaniseRiskFactor("new_device")).toBe("activity from an unrecognized device");
    expect(humaniseRiskFactor("malicious_ip")).toBe("request from a known-malicious IP address");
    expect(humaniseRiskFactor("high_failed_attempts")).toBe("repeated failed sign-in attempts");
  });

  it("expands parameterised factors", () => {
    expect(humaniseRiskFactor("high_risk_country:US")).toBe(
      "traffic from a high-risk country (US)",
    );
    expect(humaniseRiskFactor("hosting_likelihood:high")).toBe(
      "IP address likely belongs to hosting infrastructure",
    );
    expect(humaniseRiskFactor("hosting_likelihood:medium")).toBe(
      "IP address may belong to hosting infrastructure",
    );
  });

  it("covers the scenario generator aliases", () => {
    expect(humaniseRiskFactor("impossible_travel")).toBe(
      "sign-ins from distant locations in quick succession",
    );
    expect(humaniseRiskFactor("session_hijack_suspected")).toBe("possible session hijacking");
    expect(humaniseRiskFactor("tor_detected")).toBe("traffic from the Tor network");
    expect(humaniseRiskFactor("unusual_hour")).toBe("activity at an unusual hour for this account");
  });

  it("never surfaces raw snake_case for unknown factors", () => {
    expect(humaniseRiskFactor("some_future_factor")).toBe("some future factor");
  });

  it("joins a factor list for a sentence position", () => {
    expect(humaniseRiskFactors(["tor_detected", "new_device"])).toBe(
      "traffic from the Tor network, activity from an unrecognized device",
    );
    expect(humaniseRiskFactors([])).toBe("");
    expect(humaniseRiskFactors(undefined)).toBe("");
  });
});
