/**
 * Analytics Metrics Aggregation
 *
 * Aggregates security metrics for dashboard display.
 */

import type { SecurityAnalyticsEvent } from "./collector";
import { getRiskLevel } from "../core/risk-engine";

// ============================================
// Types
// ============================================

export type TimeRange = "1h" | "24h" | "7d" | "30d";

export interface MetricsSummary {
  timestamp: number;
  period: TimeRange;
  totalRequests: number;
  blockedRequests: number;
  captchaChallenges: number;
  captchaSuccessRate: number;
  rateLimitedRequests: number;
  averageRiskScore: number;
  highestRiskScore: number;
  totalSessions?: number;
  activeSessions?: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface HourlyActivity {
  timestamp?: number;
  hour: number;
  requests: number;
  blocked: number;
  averageRisk: number;
  sessions?: number;
}

export interface TopFactor {
  factor: string;
  count: number;
  percentage: number;
  label?: string;
  averageRiskContribution?: number;
}

export interface GeographicBreakdown {
  country: string;
  countryCode?: string;
  count: number;
  percentage: number;
  sessions?: number;
  averageRisk?: number;
}

export interface SignalBreakdown {
  deviceTrust: number | null;
  behaviorTrust: number | null;
  automationDetected: number;
  locationTrust: number | null;
  vpnDetected: number;
  captchaTriggered: number;
  sessionsFlagged: number;
}

export interface DashboardMetrics {
  summary: MetricsSummary;
  riskDistribution: RiskDistribution;
  hourlyActivity: HourlyActivity[];
  topFactors: TopFactor[];
  topRiskFactors?: TopFactor[];
  recentBlocks: SecurityAnalyticsEvent[];
  geographicBreakdown?: GeographicBreakdown[];
  signalBreakdown?: SignalBreakdown;
}

// ============================================
// Time Range Helpers
// ============================================

export function getTimeRangeMs(range: TimeRange): number {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

export function getTimeRangeStart(range: TimeRange): number {
  return Date.now() - getTimeRangeMs(range);
}

// ============================================
// Metrics Calculation
// ============================================

export function calculateMetrics(
  events: SecurityAnalyticsEvent[],
  range: TimeRange,
  windowEnd = Date.now(),
): DashboardMetrics {
  const startTime = windowEnd - getTimeRangeMs(range);
  const filteredEvents = events.filter((e) => e.timestamp >= startTime && e.timestamp <= windowEnd);

  const summary = calculateSummary(filteredEvents, range);
  const riskDistribution = calculateRiskDistribution(filteredEvents);
  const hourlyActivity = calculateHourlyActivity(filteredEvents, range, windowEnd);
  const topFactors = calculateTopFactors(filteredEvents);
  const recentBlocks = filteredEvents.filter((e) => e.blocked).slice(0, 10);
  const signalBreakdown = calculateSignalBreakdown(filteredEvents);

  const geographicBreakdown = calculateGeographicBreakdown(filteredEvents);

  return {
    summary,
    riskDistribution,
    hourlyActivity,
    topFactors,
    topRiskFactors: topFactors,
    recentBlocks,
    signalBreakdown,
    geographicBreakdown,
  };
}

function calculateSummary(events: SecurityAnalyticsEvent[], range: TimeRange): MetricsSummary {
  const blockedEvents = events.filter((e) => e.blocked);
  const captchaEvents = events.filter((e) => e.captchaRequired);
  const captchaPassedEvents = events.filter((e) => e.type === "captcha_passed");
  const rateLimitedEvents = events.filter((e) => e.rateLimited);

  const riskScores = events.map((e) => e.riskScore);
  const avgRisk =
    riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
  const maxRisk = riskScores.length > 0 ? Math.max(...riskScores) : 0;

  const captchaSuccessRate =
    captchaEvents.length > 0 ? (captchaPassedEvents.length / captchaEvents.length) * 100 : 0;

  return {
    timestamp: Date.now(),
    period: range,
    totalRequests: events.length,
    blockedRequests: blockedEvents.length,
    captchaChallenges: captchaEvents.length,
    captchaSuccessRate: Math.round(captchaSuccessRate * 10) / 10,
    rateLimitedRequests: rateLimitedEvents.length,
    averageRiskScore: Math.round(avgRisk * 10) / 10,
    highestRiskScore: maxRisk,
  };
}

function calculateRiskDistribution(events: SecurityAnalyticsEvent[]): RiskDistribution {
  const distribution: RiskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

  for (const event of events) {
    switch (getRiskLevel(event.riskScore)) {
      case "low":
        distribution.low++;
        break;
      case "medium":
        distribution.medium++;
        break;
      case "high":
        distribution.high++;
        break;
      case "critical":
        distribution.critical++;
        break;
    }
  }

  return distribution;
}

function calculateHourlyActivity(
  events: SecurityAnalyticsEvent[],
  range: TimeRange,
  now: number,
): HourlyActivity[] {
  const hours = range === "1h" ? 1 : range === "24h" ? 24 : range === "7d" ? 168 : 720;
  const bucketSize = getTimeRangeMs(range) / Math.min(hours, 24);
  const activity: HourlyActivity[] = [];

  for (let i = 0; i < Math.min(hours, 24); i++) {
    const bucketEnd = now - i * bucketSize;
    const bucketStart = bucketEnd - bucketSize;

    const bucketEvents = events.filter(
      (e) =>
        e.timestamp >= bucketStart &&
        (e.timestamp < bucketEnd || (i === 0 && e.timestamp === bucketEnd)),
    );

    const riskScores = bucketEvents.map((e) => e.riskScore);
    const avgRisk =
      riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;

    activity.unshift({
      timestamp: bucketStart,
      hour: new Date(bucketStart).getUTCHours(),
      requests: bucketEvents.length,
      sessions: new Set(bucketEvents.map((event) => event.sessionId).filter(Boolean)).size,
      blocked: bucketEvents.filter((e) => e.blocked).length,
      averageRisk: Math.round(avgRisk * 10) / 10,
    });
  }

  return activity;
}

function calculateTopFactors(events: SecurityAnalyticsEvent[]): TopFactor[] {
  const factorCounts = new Map<string, number>();

  for (const event of events) {
    for (const factor of new Set(event.factors)) {
      const count = factorCounts.get(factor) ?? 0;
      factorCounts.set(factor, count + 1);
    }
  }

  const totalEvents = events.length || 1;

  return Array.from(factorCounts.entries())
    .map(([factor, count]) => ({
      factor,
      label: formatFactorLabel(factor),
      count,
      percentage: Math.round((count / totalEvents) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function formatFactorLabel(factor: string): string {
  return factor.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function calculateSignalBreakdown(events: SecurityAnalyticsEvent[]): SignalBreakdown {
  const total = events.length || 1;

  // Event risk does not establish device trust.
  const deviceTrust = null;

  // Count observed automation indicators; missing indicators do not establish human behaviour.
  const automatedEvents = events.filter((e) =>
    e.factors.some((f) => f.includes("bot") || f.includes("automation")),
  ).length;
  const behaviorTrust = null;
  const automationDetected = automatedEvents / total;

  // VPN/proxy indicators do not establish location trust.
  const vpnSessions = events.filter((e) =>
    e.factors.some((f) => f.includes("vpn") || f.includes("proxy")),
  ).length;
  const locationTrust = null;
  const vpnDetected = vpnSessions / total;

  // CAPTCHA triggered
  const captchaSessions = events.filter((e) => e.captchaRequired).length;
  const captchaTriggered = captchaSessions / total;

  // High-risk event fraction (legacy sessionsFlagged field).
  const flaggedSessions = events.filter((e) => e.riskScore >= 60).length;
  const sessionsFlagged = flaggedSessions / total;

  return {
    deviceTrust,
    behaviorTrust,
    automationDetected,
    locationTrust,
    vpnDetected,
    captchaTriggered,
    sessionsFlagged,
  };
}

// Events do not include authoritative geographic data. Do not infer geography from IP examples.
function calculateGeographicBreakdown(_events: SecurityAnalyticsEvent[]): GeographicBreakdown[] {
  return [];
}

// ============================================
// Metrics Cache
// ============================================

interface CachedMetrics {
  data: DashboardMetrics;
  expiresAt: number;
}

const metricsCache = new Map<TimeRange, CachedMetrics>();
const CACHE_TTL = 60 * 1000;

export function getCachedMetrics(range: TimeRange): DashboardMetrics | null {
  const cached = metricsCache.get(range);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    metricsCache.delete(range);
  }
  return null;
}

export function cacheMetrics(range: TimeRange, metrics: DashboardMetrics): void {
  metricsCache.set(range, {
    data: metrics,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

export function clearMetricsCache(): void {
  metricsCache.clear();
}

export function getMetricsCacheStats(): { size: number; ranges: TimeRange[] } {
  return {
    size: metricsCache.size,
    ranges: Array.from(metricsCache.keys()),
  };
}
