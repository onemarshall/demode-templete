/**
 * Analytics Metrics Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateMetrics,
  getCachedMetrics,
  cacheMetrics,
  clearMetricsCache,
  getMetricsCacheStats,
  getTimeRangeMs,
  getTimeRangeStart,
} from "../../analytics/metrics";
import type { SecurityAnalyticsEvent } from "../../analytics/collector";

// ============================================
// Test Helpers
// ============================================

function createMockEvent(overrides: Partial<SecurityAnalyticsEvent> = {}): SecurityAnalyticsEvent {
  return {
    id: crypto.randomUUID(),
    type: "request",
    timestamp: Date.now(),
    ip: "1.2.3.4",
    path: "/api/auth/sign-in",
    method: "POST",
    riskScore: 25,
    riskLevel: "low",
    blocked: false,
    captchaRequired: false,
    rateLimited: false,
    factors: [],
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe("Time Range Helpers", () => {
  describe("getTimeRangeMs", () => {
    it("returns correct milliseconds for 1h", () => {
      expect(getTimeRangeMs("1h")).toBe(60 * 60 * 1000);
    });

    it("returns correct milliseconds for 24h", () => {
      expect(getTimeRangeMs("24h")).toBe(24 * 60 * 60 * 1000);
    });

    it("returns correct milliseconds for 7d", () => {
      expect(getTimeRangeMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("returns correct milliseconds for 30d", () => {
      expect(getTimeRangeMs("30d")).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe("getTimeRangeStart", () => {
    it("returns timestamp in the past", () => {
      const now = Date.now();
      const start = getTimeRangeStart("1h");
      expect(start).toBeLessThan(now);
      expect(now - start).toBeCloseTo(60 * 60 * 1000, -2);
    });
  });
});

describe("calculateMetrics", () => {
  it("calculates summary from events", () => {
    const events: SecurityAnalyticsEvent[] = [
      createMockEvent({ riskScore: 20, riskLevel: "low" }),
      createMockEvent({ riskScore: 50, riskLevel: "medium" }),
      createMockEvent({ riskScore: 80, riskLevel: "critical", blocked: true }),
    ];

    const metrics = calculateMetrics(events, "1h");

    expect(metrics.summary.totalRequests).toBe(3);
    expect(metrics.summary.blockedRequests).toBe(1);
    expect(metrics.summary.averageRiskScore).toBe(50);
    expect(metrics.summary.highestRiskScore).toBe(80);
  });

  it("calculates risk distribution", () => {
    const events: SecurityAnalyticsEvent[] = [
      createMockEvent({ riskLevel: "low" }),
      createMockEvent({ riskLevel: "low" }),
      createMockEvent({ riskLevel: "medium", riskScore: 40 }),
      createMockEvent({ riskLevel: "high", riskScore: 60 }),
      createMockEvent({ riskLevel: "critical", riskScore: 80 }),
    ];

    const metrics = calculateMetrics(events, "1h");

    expect(metrics.riskDistribution.low).toBe(2);
    expect(metrics.riskDistribution.medium).toBe(1);
    expect(metrics.riskDistribution.high).toBe(1);
    expect(metrics.riskDistribution.critical).toBe(1);
  });

  it("calculates top factors", () => {
    const events: SecurityAnalyticsEvent[] = [
      createMockEvent({ factors: ["vpn", "new_device"] }),
      createMockEvent({ factors: ["vpn"] }),
      createMockEvent({ factors: ["vpn", "tor"] }),
      createMockEvent({ factors: ["new_device"] }),
    ];

    const metrics = calculateMetrics(events, "1h");

    expect(metrics.topFactors[0]?.factor).toBe("vpn");
    expect(metrics.topFactors[0]?.count).toBe(3);
  });

  it("filters events outside time range", () => {
    const oldEvent = createMockEvent({
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
    });
    const recentEvent = createMockEvent({
      timestamp: Date.now(),
    });

    const metrics = calculateMetrics([oldEvent, recentEvent], "1h");

    expect(metrics.summary.totalRequests).toBe(1);
  });

  it("returns recent blocked events", () => {
    const events: SecurityAnalyticsEvent[] = [
      createMockEvent({ blocked: true, type: "blocked1" }),
      createMockEvent({ blocked: false }),
      createMockEvent({ blocked: true, type: "blocked2" }),
    ];

    const metrics = calculateMetrics(events, "1h");

    expect(metrics.recentBlocks).toHaveLength(2);
  });

  it("handles empty events array", () => {
    const metrics = calculateMetrics([], "1h");

    expect(metrics.summary.totalRequests).toBe(0);
    expect(metrics.summary.averageRiskScore).toBe(0);
    expect(metrics.riskDistribution.low).toBe(0);
  });
});

describe("Metrics Cache", () => {
  beforeEach(() => {
    clearMetricsCache();
  });

  it("caches and retrieves metrics", () => {
    const metrics = calculateMetrics([], "1h");
    cacheMetrics("1h", metrics);

    const cached = getCachedMetrics("1h");
    expect(cached).toEqual(metrics);
  });

  it("returns null for uncached time range", () => {
    const cached = getCachedMetrics("24h");
    expect(cached).toBeNull();
  });

  it("clears cache", () => {
    const metrics = calculateMetrics([], "1h");
    cacheMetrics("1h", metrics);

    clearMetricsCache();

    const cached = getCachedMetrics("1h");
    expect(cached).toBeNull();
  });

  it("returns cache stats", () => {
    cacheMetrics("1h", calculateMetrics([], "1h"));
    cacheMetrics("24h", calculateMetrics([], "24h"));

    const stats = getMetricsCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.ranges).toContain("1h");
    expect(stats.ranges).toContain("24h");
  });
});

describe("dashboard measurement integrity", () => {
  it("counts unique observed sessions, excludes future events, and assigns boundary events once", () => {
    const now = Date.now();
    const events = [
      createMockEvent({ timestamp: now, sessionId: "same" }),
      createMockEvent({ timestamp: now - 1000, sessionId: "same" }),
      createMockEvent({ timestamp: now - 3600000, sessionId: "other" }),
      createMockEvent({ timestamp: now + 1, sessionId: "future" }),
    ];
    const metrics = calculateMetrics(events, "24h", now);
    expect(metrics.summary.totalRequests).toBe(3);
    expect(metrics.hourlyActivity.reduce((sum, bucket) => sum + bucket.requests, 0)).toBe(3);
    expect(metrics.hourlyActivity.at(-1)?.sessions).toBe(2);
    expect(metrics.hourlyActivity.at(-1)?.timestamp).toBe(now - 3600000);
  });

  it("uses risk engine boundaries even when stored labels contradict the score", () => {
    const now = Date.now();
    const metrics = calculateMetrics(
      [39, 40, 60, 80].map((riskScore) =>
        createMockEvent({ riskScore, riskLevel: "low", timestamp: now }),
      ),
      "24h",
      now,
    );
    expect(metrics.riskDistribution).toEqual({ low: 1, medium: 1, high: 1, critical: 1 });
  });

  it("does not invent location, device trust, or risk contribution measurements", () => {
    const metrics = calculateMetrics(
      [createMockEvent({ ip: "8.8.8.8", factors: ["vpn", "vpn"] })],
      "24h",
    );
    expect(metrics.geographicBreakdown).toEqual([]);
    expect(metrics.signalBreakdown?.deviceTrust).toBeNull();
    expect(metrics.signalBreakdown?.locationTrust).toBeNull();
    expect(metrics.topFactors[0]?.count).toBe(1);
    expect(metrics.topFactors[0]?.averageRiskContribution).toBeUndefined();
  });
});
