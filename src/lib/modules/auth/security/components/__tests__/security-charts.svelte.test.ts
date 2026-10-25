import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import HourlyActivityChart from "../HourlyActivityChart.svelte";
import RiskDistributionChart from "../RiskDistributionChart.svelte";
import AuthMetricsPanel from "../AuthMetricsPanel.svelte";
import type { DashboardMetrics } from "../../types.js";

const metrics: DashboardMetrics = {
  summary: {
    timestamp: Date.now(),
    period: "24h",
    totalRequests: 5,
    blockedRequests: 2,
    captchaChallenges: 0,
    captchaSuccessRate: 0,
    rateLimitedRequests: 0,
    averageRiskScore: 40,
    highestRiskScore: 90,
  },
  riskDistribution: { low: 3, medium: 0, high: 0, critical: 2 },
  hourlyActivity: [{ hour: 3, timestamp: Date.UTC(2026, 9, 22, 3, 15), requests: 5, blocked: 2, averageRisk: 40 }],
  topFactors: [],
  recentBlocks: [],
};

describe("security chart evidence", () => {
  it("keeps blocked and other events disjoint and lets keyboard users review an hour", async () => {
    const onSelectHour = vi.fn();
    render(HourlyActivityChart, { metrics, onSelectHour });
    expect(document.body.textContent).toContain("2 of 5 recorded events were blocked");
    await page.getByText("View counts and review events by hour").click();
    const cells = [...document.querySelectorAll("tbody td")].map((cell) => cell.textContent);
    expect(cells.slice(0, 2)).toEqual(["2", "3"]);
    await page.getByRole("button", { name: "Review events at 03:15 UTC" }).click();
    expect(onSelectHour).toHaveBeenCalledWith(3, Date.UTC(2026, 9, 22, 3, 15));
    onSelectHour.mockClear();
    const bar = document.querySelector(".lc-bar");
    expect(bar).not.toBeNull();
    bar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectHour).toHaveBeenCalledWith(3, Date.UTC(2026, 9, 22, 3, 15));
  });

  it("uses engine thresholds and routes a selected risk bucket to its evidence", async () => {
    const onSelectRisk = vi.fn();
    render(RiskDistributionChart, { metrics, onSelectRisk });
    expect(document.body.textContent).toContain("Critical (80–100)");
    expect(document.body.textContent).toContain("Low (0–<40)");
    await page.getByRole("button", { name: "Review critical risk events" }).click();
    expect(onSelectRisk).toHaveBeenCalledWith("critical");
    onSelectRisk.mockClear();
    document.querySelector(".lc-bar")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectRisk).toHaveBeenCalledWith("low");
  });

  it("shows missing MFA data and zero sign-in attempts without claiming a healthy rate", () => {
    render(AuthMetricsPanel, {
      authStats: {
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        recentFailures: [],
        hourlyRates: [],
        bruteForceAttempts: [],
        twoFactorAdoptionRate: null,
        twoFactorEnabledCount: null,
        totalUsersCount: null,
        passwordResetRequests: 0,
        passwordResetHourly: [],
      },
    });
    expect(document.body.textContent).toContain("No attempts");
    expect(document.body.textContent).toContain("Unavailable");
    expect(document.body.textContent).not.toContain("Healthy");
  });
});
