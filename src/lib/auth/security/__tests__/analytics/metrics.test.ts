/**
 * Analytics Metrics Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	calculateMetrics,
	getCachedMetrics,
	cacheMetrics,
	clearMetricsCache,
	getMetricsCacheStats,
	getTimeRangeMs,
	getTimeRangeStart
} from '../../analytics/metrics';
import type { SecurityAnalyticsEvent } from '../../analytics/collector';

// ============================================
// Test Helpers
// ============================================

function createMockEvent(overrides: Partial<SecurityAnalyticsEvent> = {}): SecurityAnalyticsEvent {
	return {
		id: crypto.randomUUID(),
		type: 'request',
		timestamp: Date.now(),
		ip: '1.2.3.4',
		path: '/api/auth/sign-in',
		method: 'POST',
		riskScore: 25,
		riskLevel: 'low',
		blocked: false,
		captchaRequired: false,
		rateLimited: false,
		factors: [],
		...overrides
	};
}

// ============================================
// Tests
// ============================================

describe('Time Range Helpers', () => {
	describe('getTimeRangeMs', () => {
		it('returns correct milliseconds for 1h', () => {
			expect(getTimeRangeMs('1h')).toBe(60 * 60 * 1000);
		});

		it('returns correct milliseconds for 24h', () => {
			expect(getTimeRangeMs('24h')).toBe(24 * 60 * 60 * 1000);
		});

		it('returns correct milliseconds for 7d', () => {
			expect(getTimeRangeMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
		});

		it('returns correct milliseconds for 30d', () => {
			expect(getTimeRangeMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
		});
	});

	describe('getTimeRangeStart', () => {
		it('returns timestamp in the past', () => {
			const now = Date.now();
			const start = getTimeRangeStart('1h');
			expect(start).toBeLessThan(now);
			expect(now - start).toBeCloseTo(60 * 60 * 1000, -2);
		});
	});
});

describe('calculateMetrics', () => {
	it('calculates summary from events', () => {
		const events: SecurityAnalyticsEvent[] = [
			createMockEvent({ riskScore: 20, riskLevel: 'low' }),
			createMockEvent({ riskScore: 50, riskLevel: 'medium' }),
			createMockEvent({ riskScore: 80, riskLevel: 'critical', blocked: true })
		];

		const metrics = calculateMetrics(events, '1h');

		expect(metrics.summary.totalRequests).toBe(3);
		expect(metrics.summary.blockedRequests).toBe(1);
		expect(metrics.summary.averageRiskScore).toBe(50);
		expect(metrics.summary.highestRiskScore).toBe(80);
	});

	it('calculates risk distribution', () => {
		const events: SecurityAnalyticsEvent[] = [
			createMockEvent({ riskLevel: 'low' }),
			createMockEvent({ riskLevel: 'low' }),
			createMockEvent({ riskLevel: 'medium' }),
			createMockEvent({ riskLevel: 'high' }),
			createMockEvent({ riskLevel: 'critical' })
		];

		const metrics = calculateMetrics(events, '1h');

		expect(metrics.riskDistribution.low).toBe(2);
		expect(metrics.riskDistribution.medium).toBe(1);
		expect(metrics.riskDistribution.high).toBe(1);
		expect(metrics.riskDistribution.critical).toBe(1);
	});

	it('calculates top factors', () => {
		const events: SecurityAnalyticsEvent[] = [
			createMockEvent({ factors: ['vpn', 'new_device'] }),
			createMockEvent({ factors: ['vpn'] }),
			createMockEvent({ factors: ['vpn', 'tor'] }),
			createMockEvent({ factors: ['new_device'] })
		];

		const metrics = calculateMetrics(events, '1h');

		expect(metrics.topFactors[0]?.factor).toBe('vpn');
		expect(metrics.topFactors[0]?.count).toBe(3);
	});

	it('filters events outside time range', () => {
		const oldEvent = createMockEvent({
			timestamp: Date.now() - 2 * 60 * 60 * 1000
		});
		const recentEvent = createMockEvent({
			timestamp: Date.now()
		});

		const metrics = calculateMetrics([oldEvent, recentEvent], '1h');

		expect(metrics.summary.totalRequests).toBe(1);
	});

	it('returns recent blocked events', () => {
		const events: SecurityAnalyticsEvent[] = [
			createMockEvent({ blocked: true, type: 'blocked1' }),
			createMockEvent({ blocked: false }),
			createMockEvent({ blocked: true, type: 'blocked2' })
		];

		const metrics = calculateMetrics(events, '1h');

		expect(metrics.recentBlocks).toHaveLength(2);
	});

	it('handles empty events array', () => {
		const metrics = calculateMetrics([], '1h');

		expect(metrics.summary.totalRequests).toBe(0);
		expect(metrics.summary.averageRiskScore).toBe(0);
		expect(metrics.riskDistribution.low).toBe(0);
	});
});

describe('Metrics Cache', () => {
	beforeEach(() => {
		clearMetricsCache();
	});

	it('caches and retrieves metrics', () => {
		const metrics = calculateMetrics([], '1h');
		cacheMetrics('1h', metrics);

		const cached = getCachedMetrics('1h');
		expect(cached).toEqual(metrics);
	});

	it('returns null for uncached time range', () => {
		const cached = getCachedMetrics('24h');
		expect(cached).toBeNull();
	});

	it('clears cache', () => {
		const metrics = calculateMetrics([], '1h');
		cacheMetrics('1h', metrics);

		clearMetricsCache();

		const cached = getCachedMetrics('1h');
		expect(cached).toBeNull();
	});

	it('returns cache stats', () => {
		cacheMetrics('1h', calculateMetrics([], '1h'));
		cacheMetrics('24h', calculateMetrics([], '24h'));

		const stats = getMetricsCacheStats();
		expect(stats.size).toBe(2);
		expect(stats.ranges).toContain('1h');
		expect(stats.ranges).toContain('24h');
	});
});
