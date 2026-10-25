import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import StatusHero from "../StatusHero.svelte";
import type { SecurityStatus } from "../derive-status";
import type { RecommendedActionItem } from "../triage/types";

let nextId = 0;
function action(
  severity: RecommendedActionItem["severity"],
  status: RecommendedActionItem["status"] = "new",
): RecommendedActionItem {
  nextId += 1;
  return {
    id: `action-${nextId}`,
    severity,
    status,
    title: "Review observation",
    reason: "An unfamiliar sign-in needs context.",
    source: "threat_feed",
    sourceLabel: "Recorded event",
    detectedAt: Date.now(),
    primaryActionLabel: "Review",
  };
}

function statusOf(level: SecurityStatus["level"], headline: string): SecurityStatus {
  return {
    level,
    headline,
    detail: "Based on the recorded sample; monitoring coverage is shown above.",
  };
}

describe("the security status hero", () => {
  it("charts the critical share of the open queue and offers a critical CTA", async () => {
    const onReviewTopTier = vi.fn();
    const actions = [
      action("critical"),
      action("critical"),
      action("critical"),
      action("critical"),
      action("high"),
      action("high"),
      action("high"),
      action("high"),
      action("high"),
    ];
    render(StatusHero, {
      status: statusOf("act_now", "4 critical signals need review."),
      actions,
      onReviewTopTier,
    });
    await expect
      .element(page.getByRole("img", { name: "4 of 9 reviews in the queue are critical severity" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Review the critical signals" }).click();
    expect(onReviewTopTier).toHaveBeenCalledOnce();
  });

  it("excludes resolved reviews from the dial denominator", async () => {
    const actions = [
      action("critical"),
      action("critical"),
      action("critical"),
      action("critical", "resolved"),
      action("high"),
      action("high"),
      action("high"),
      action("high"),
      action("high"),
    ];
    render(StatusHero, { status: statusOf("act_now", "3 critical signals need review."), actions });
    await expect
      .element(page.getByRole("img", { name: "3 of 8 reviews in the queue are critical severity" }))
      .toBeInTheDocument();
  });

  it("downshifts to amber when only high-severity reviews remain", async () => {
    const onReviewTopTier = vi.fn();
    const actions = [
      action("high"),
      action("high"),
      action("high"),
      action("medium"),
      action("medium"),
      action("medium"),
      action("medium"),
    ];
    render(StatusHero, {
      status: statusOf("watch", "3 security checks need review."),
      actions,
      onReviewTopTier,
    });
    await expect
      .element(page.getByRole("img", { name: "3 of 7 reviews in the queue are high severity" }))
      .toBeInTheDocument();
    await page.getByRole("button", { name: "Review the high-severity signals" }).click();
    expect(onReviewTopTier).toHaveBeenCalledOnce();
  });

  it("drops the dial for medium and low queues and offers the quiet CTA", async () => {
    const onShowAll = vi.fn();
    const actions = Array.from({ length: 6 }, () => action("medium"));
    render(StatusHero, {
      status: statusOf("watch", "6 security checks need review."),
      actions,
      onShowAll,
    });
    expect(document.querySelector('[role="img"]')).toBeNull();
    await page.getByRole("button", { name: "Show all 6 reviews" }).click();
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it("renders the safe state plain, without a dial or a CTA", () => {
    render(StatusHero, {
      status: statusOf("safe", "No prioritised checks in the available records."),
      actions: [],
    });
    expect(document.querySelector('[role="img"]')).toBeNull();
    expect(document.body.textContent).toContain("No prioritised checks");
    expect(document.querySelector("button")).toBeNull();
  });

  it("points limited visibility at the coverage section", async () => {
    const onCheckCoverage = vi.fn();
    render(StatusHero, {
      status: statusOf("unknown", "Monitoring coverage needs checking."),
      actions: [],
      onCheckCoverage,
    });
    expect(document.body.textContent).toContain("Limited visibility");
    await page.getByRole("button", { name: "Check monitoring coverage" }).click();
    expect(onCheckCoverage).toHaveBeenCalledOnce();
  });
});
