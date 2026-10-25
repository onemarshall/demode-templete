import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page as browserPage } from "vitest/browser";
import type { ComponentProps } from "svelte";
import Dashboard from "../../../../../../routes/(admin)/admin/security/+page.svelte";

const navigation = vi.hoisted(() => ({
  page: { url: new URL("https://example.test/admin/security"), state: {} },
  pushState: vi.fn(),
  replaceState: vi.fn(),
  goto: vi.fn().mockResolvedValue(undefined),
  invalidateAll: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$app/state", () => ({ page: navigation.page }));
vi.mock("$app/navigation", () => navigation);
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
const escalationPolicy = {
  rules: [
    {
      id: "temp-block",
      label: "Repeated failed sign-in attempts",
      trigger: "3+ failed attempts",
      action: "block" as const,
      actionLabel: "Temporary block",
    },
    {
      id: "fail-open",
      label: "Detection failure",
      trigger: "Abuse check errors",
      action: "skip" as const,
      actionLabel: "Fails open",
    },
  ],
  source: "code-config" as const,
  tunable: false as const,
  configFile: "src/lib/modules/auth/security/config.ts",
  note: "These values are frozen in the running build.",
};

function mount(data: unknown) {
  return render(Dashboard, { data, form: null } as ComponentProps<typeof Dashboard>);
}

describe("question-led security dashboard", () => {
  it("shows limited visibility instead of a safe verdict when no observations exist", () => {
    navigation.page.url = new URL("https://example.test/admin/security");
    mount(base);
    expect(document.body.textContent).toContain("No activity data to assess yet");
    expect(document.body.textContent).not.toContain("You're safe");
    expect(document.body.textContent).toContain("No recommended reviews in the available records");
  });
  it("retains sign-in context even with no user risk profiles", () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=authentication",
    );
    mount(base);
    expect(document.body.textContent).toContain("Are people having trouble signing in?");
    expect(document.body.textContent).toContain("Authentication analytics are unavailable");
  });
  it("opens the selected event evidence with its exact path and IP", async () => {
    navigation.page.url = new URL("https://example.test/admin/security?action=event%3Aevent-1");
    mount({
      ...base,
      events: [
        {
          id: "event-1",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/sign-in",
          riskScore: 85,
          riskLevel: "critical",
          blocked: true,
          factors: ["repeated_failures"],
        },
      ],
    });
    await expect.element(browserPage.getByRole("dialog")).toBeVisible();
    expect(document.body.textContent).toContain("/sign-in");
    expect(document.body.textContent).toContain("203.0.113.20");
    expect(document.body.textContent).toContain("Opening this review does not resolve");
  });
  it("uses the exact rolling interval when showing chart evidence", () => {
    const bucket = now - 2 * hour;
    navigation.page.url = new URL(
      `https://example.test/admin/security?mode=investigate&view=incidents&bucket=${bucket}`,
    );
    const event = {
      timestamp: bucket + 1000,
      ip: "203.0.113.20",
      riskScore: 10,
      riskLevel: "low",
      blocked: false,
      factors: [],
    };
    mount({
      ...base,
      events: [
        { ...event, id: "inside", path: "/inside-bucket" },
        { ...event, timestamp: bucket + hour, id: "outside", path: "/outside-bucket" },
      ],
    });
    expect(document.body.textContent).toContain("/inside-bucket");
    expect(document.body.textContent).not.toContain("/outside-bucket");
  });
  it("preserves a selected event when following related evidence", () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=incidents&related=event%3Awanted",
    );
    const event = {
      timestamp: now,
      ip: "203.0.113.20",
      riskScore: 10,
      riskLevel: "low",
      blocked: false,
      factors: [],
    };
    mount({
      ...base,
      events: [
        { ...event, id: "wanted", path: "/selected-record" },
        { ...event, id: "other", path: "/unrelated-record" },
      ],
    });
    expect(document.body.textContent).toContain("/selected-record");
    expect(document.body.textContent).not.toContain("/unrelated-record");
  });
  it("retains the last successful sample when monitoring fails", async () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=incidents",
    );
    const screen = await mount({
      ...base,
      coverage: { ...base.coverage, sampleSize: 1 },
      events: [
        {
          id: "retained",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/retained-record",
          riskScore: 10,
          riskLevel: "low",
          blocked: false,
          factors: [],
        },
      ],
    });
    await screen.rerender({
      data: {
        ...base,
        coverage: undefined,
        error: "Event source unavailable",
      } as unknown as ComponentProps<typeof Dashboard>["data"],
    });
    expect(document.body.textContent).toContain("/retained-record");
    expect(document.body.textContent).toContain("Monitoring needs attention");
  });

  it("does not substitute unrelated events when a shared review has left the sample", () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=incidents&related=event%3Aexpired",
    );
    mount({
      ...base,
      events: [
        {
          id: "other",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/unrelated-record",
          riskScore: 10,
          riskLevel: "low",
          blocked: false,
          factors: [],
        },
      ],
    });
    expect(document.body.textContent).toContain("The selected review is no longer in this sample");
    expect(document.body.textContent).not.toContain("/unrelated-record");
  });
  it("includes the final observation-window endpoint in the latest bucket", () => {
    navigation.page.url = new URL(
      `https://example.test/admin/security?mode=investigate&view=incidents&bucket=${now - hour}`,
    );
    mount({
      ...base,
      events: [
        {
          id: "endpoint",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/window-endpoint",
          riskScore: 10,
          riskLevel: "low",
          blocked: false,
          factors: [],
        },
      ],
    });
    expect(document.body.textContent).toContain("/window-endpoint");
  });
  it("renders measured infrastructure checks instead of the not-connected placeholder", () => {
    navigation.page.url = new URL("https://example.test/admin/security");
    mount({
      ...base,
      systemHealth: {
        overallStatus: "operational",
        summary: "2 infrastructure checks measured; all operational.",
        updatedAt: now,
        metrics: [
          {
            id: "database",
            label: "Database",
            value: 3,
            unit: "ms",
            status: "operational",
            updatedAt: now,
          },
          {
            id: "redis",
            label: "Redis",
            value: 1,
            unit: "ms",
            status: "operational",
            updatedAt: now,
          },
        ],
      },
    });
    expect(document.body.textContent).toContain("Database");
    expect(document.body.textContent).toContain("3ms");
    expect(document.body.textContent).toContain("Redis");
    expect(document.body.textContent).toContain("2 infrastructure checks measured");
    expect(document.body.textContent).not.toContain("Not connected");
  });

  it("shows the running automation policy and what the automation did", () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=automation",
    );
    mount({
      ...base,
      escalationPolicy,
      automationActions: [
        {
          id: "auto:e1",
          action: "blocked",
          label: "Request blocked",
          timestamp: now,
          ip: "203.0.113.20",
          path: "/sign-in",
          riskScore: 85,
          riskLevel: "critical",
          factors: [],
        },
      ],
    });
    expect(document.body.textContent).toContain("What does the system do automatically?");
    expect(document.body.textContent).toContain("What did the system do recently?");
    expect(document.body.textContent).toContain("Temporary block");
    expect(document.body.textContent).toContain("Fails open");
    expect(document.body.textContent).toContain("These values are frozen in the running build");
    expect(document.body.textContent).toContain("/sign-in");
    expect(document.body.textContent).toContain("Request blocked");
  });

  it("states plainly when no automated actions are in the sample", () => {
    navigation.page.url = new URL(
      "https://example.test/admin/security?mode=investigate&view=automation",
    );
    mount({ ...base, escalationPolicy });
    expect(document.body.textContent).toContain("No automated actions in the available records");
    expect(document.body.textContent).toContain(
      "An empty feed does not establish that no protection was needed",
    );
  });
});
