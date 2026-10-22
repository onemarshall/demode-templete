import { describe, expect, it } from "vitest";
import {
  bucketByHour,
  calculateSessionAnalytics,
  calculateUserRiskProfiles,
} from "../dashboard-analytics";
import type { SecurityAnalyticsEvent } from "../../analytics/collector";

const event = (overrides: Partial<SecurityAnalyticsEvent> = {}): SecurityAnalyticsEvent => ({
  id: crypto.randomUUID(),
  type: "request",
  timestamp: Date.now(),
  ip: "192.0.2.1",
  path: "/auth",
  method: "POST",
  riskScore: 80,
  riskLevel: "critical",
  blocked: true,
  captchaRequired: false,
  rateLimited: false,
  factors: [],
  userId: "user",
  ...overrides,
});

describe("dashboard analytics integrity", () => {
  it("does not infer an account lockout from blocked requests", () => {
    const profiles = calculateUserRiskProfiles(Array.from({ length: 8 }, () => event()));
    expect(profiles[0]?.isLocked).toBeNull();
    expect(profiles[0]?.lockoutHistory).toEqual([]);
  });

  it("reports actual observed session counts without claiming an inferred duration", () => {
    const events = Array.from({ length: 8 }, (_, i) => event({ sessionId: `s-${i}` }));
    const analytics = calculateSessionAnalytics(
      events,
      new Set(events.map((entry) => entry.sessionId)),
    );
    expect(analytics.activeSessionsCount).toBe(8);
    expect(analytics.concurrentSessionsPerUser[0]?.sessionCount).toBe(8);
    expect(analytics.averageSessionDuration).toBeNull();
    expect(
      analytics.sessionDurationDistribution.reduce((total, group) => total + group.count, 0),
    ).toBe(0);
  });

  it("only uses explicitly measured durations", () => {
    const events = [
      event({ sessionId: "measured", metadata: { sessionDurationMs: 600000 } }),
      event({ sessionId: "unknown" }),
    ];
    expect(
      calculateSessionAnalytics(events, new Set(["measured", "unknown"])).averageSessionDuration,
    ).toBe(600000);
  });

  it("uses exact shared bucket boundaries and excludes future data", () => {
    const now = Date.now();
    const counts = bucketByHour(
      [
        event({ timestamp: now }),
        event({ timestamp: now - 3600000 }),
        event({ timestamp: now + 1 }),
        event({ timestamp: now - 86400000 - 1 }),
      ],
      (entries) => entries.length,
      now,
    );
    expect(counts.at(-1)).toBe(2);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(2);
  });
});
