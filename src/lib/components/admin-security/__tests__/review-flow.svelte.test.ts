import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page as browserPage } from "vitest/browser";
import type { ComponentProps } from "svelte";
import Dashboard from "../../../../routes/(admin)/admin/security/+page.svelte";

vi.mock("$app/state", async () => {
  const { reactivePage } = await import("$test/mocks/app-state.svelte.js");
  return { page: reactivePage };
});
vi.mock("$app/navigation", async () => {
  const { pushShallow } = await import("$test/mocks/app-state.svelte.js");
  return {
    pushState: vi.fn((href: string) => pushShallow(href)),
    replaceState: vi.fn((href: string) => pushShallow(href)),
    goto: vi.fn((href: string) => pushShallow(href)),
    invalidateAll: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("$app/forms", () => ({ enhance: () => ({ destroy() {} }) }));
vi.mock("$app/env", () => ({ dev: false }));

const now = Date.now();
const hour = 3600000;
const base = {
  metrics: null,
  sessions: [],
  devices: null,
  systemHealth: null,
  blockedIPs: [],
  authStats: null,
  sessionAnalytics: null,
  rateLimitStats: null,
  ipIntelligence: null,
  userRiskProfiles: [],
  apiSecurityStats: null,
  timeAnalysis: null,
  threatFeed: [],
  events: [],
  error: null,
  lastUpdated: new Date(now).toISOString(),
  coverage: {
    period: "24h",
    windowStart: now - 24 * hour,
    windowEnd: now,
    timezone: "UTC",
    sampleLimit: 200,
    sampleSize: 0,
    limitReached: false,
    oldestEventAt: null,
    newestEventAt: null,
    completeness: "recent-sample",
    sources: {
      events: "available",
      blockedIPs: "unavailable",
      twoFactor: "unavailable",
      devices: "not-connected",
      systemHealth: "not-connected",
    },
  },
};
function mount(data: unknown) {
  return render(Dashboard, { data, form: null } as ComponentProps<typeof Dashboard>);
}

describe("review evidence click flow", () => {
  it("opens the review sheet when the Review evidence button is clicked", async () => {
    const { setHref, getHref } = await import("$test/mocks/app-state.svelte.js");
    setHref("https://example.test/admin/security");
    mount({
      ...base,
      threatFeed: [
        {
          id: "9fbf2279-f09e-4c59-9a02-a292b18a99cd",
          timestamp: now,
          severity: "critical",
          title: "High-risk activity: tor_detected, new_device",
          type: "tor_detected",
        },
      ],
      events: [
        {
          id: "9fbf2279-f09e-4c59-9a02-a292b18a99cd",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/sign-in",
          riskScore: 85,
          riskLevel: "critical",
          blocked: true,
          factors: ["tor_detected"],
        },
      ],
    });
    await browserPage.getByRole("button", { name: "Review evidence" }).click();
    expect(getHref()).toContain("action=tf%3A9fbf2279");
    await expect.element(browserPage.getByRole("dialog")).toBeVisible();
    expect(document.body.textContent).toContain("High-risk activity: tor_detected, new_device");
    expect(document.body.textContent).toContain("/sign-in");
  });

  it("keeps the sheet open with the exact item after the URL updates", async () => {
    const { setHref } = await import("$test/mocks/app-state.svelte.js");
    setHref("https://example.test/admin/security");
    mount({
      ...base,
      threatFeed: [
        {
          id: "aaaa1111-0000-4000-8000-000000000001",
          timestamp: now,
          severity: "high",
          title: "Request blocked: malicious_ip",
          type: "malicious_ip",
        },
      ],
      events: [
        {
          id: "aaaa1111-0000-4000-8000-000000000001",
          timestamp: now,
          ip: "198.51.100.7",
          path: "/api/login",
          riskScore: 70,
          riskLevel: "high",
          blocked: true,
          factors: ["malicious_ip"],
        },
      ],
    });
    await browserPage.getByRole("button", { name: "Review evidence" }).click();
    await expect.element(browserPage.getByRole("dialog")).toBeVisible();
    expect(document.body.textContent).toContain("Request blocked: malicious_ip");
    expect(document.body.textContent).toContain("198.51.100.7");
  });
});
