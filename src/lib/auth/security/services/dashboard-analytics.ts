/**
 * Security Dashboard SDK — analytics calculators.
 *
 * Pure functions extracted from SecurityDashboardSDK's private methods.
 * Each takes a SecurityAnalyticsEvent[] (and sometimes a Set of session
 * IDs) and returns a typed shape ready for the dashboard panels.
 *
 * None of these depend on SDK state — keeping them at module scope makes
 * them testable, tree-shakable, and easier to read.
 */

import { getRiskLevel } from '../core/risk-engine';
import type { SecurityAnalyticsEvent } from '../analytics';
import type {
	APISecurityStats,
	RateLimitStats,
	SessionAnalytics,
	ThreatEvent,
	TimeAnalysis,
	UserRiskProfile,
} from './dashboard-types';

/**
 * Bucket events into 24 hourly slots (most recent hour last).
 * Returns an array of 24 elements, each produced by `aggregate` from the events in that hour.
 */
export function bucketByHour<T>(
	events: SecurityAnalyticsEvent[],
	aggregate: (hourEvents: SecurityAnalyticsEvent[], hour: number) => T,
): T[] {
	const now = Date.now();
	const hourMs = 60 * 60 * 1000;
	const buckets: SecurityAnalyticsEvent[][] = Array.from({ length: 24 }, () => []);
	for (const e of events) {
		const hoursAgo = Math.floor((now - e.timestamp) / hourMs);
		if (hoursAgo >= 0 && hoursAgo < 24) {
			buckets[hoursAgo]!.push(e);
		}
	}
	const result: T[] = [];
	for (let i = 23; i >= 0; i--) {
		const hourStart = now - (i + 1) * hourMs;
		result.push(aggregate(buckets[i]!, new Date(hourStart).getHours()));
	}
	return result;
}

export function calculateSessionAnalytics(
	events: SecurityAnalyticsEvent[],
	uniqueSessionIds: Set<string | undefined>,
): SessionAnalytics {
	const sessionBounds = new Map<
		string,
		{ firstSeen: number; lastSeen: number; explicitDurationMs: number }
	>();
	const invalidationReasonCounts = new Map<string, number>();

	for (const event of events) {
		if (event.sessionId) {
			const existing = sessionBounds.get(event.sessionId) ?? {
				firstSeen: event.timestamp,
				lastSeen: event.timestamp,
				explicitDurationMs: 0,
			};
			existing.firstSeen = Math.min(existing.firstSeen, event.timestamp);
			existing.lastSeen = Math.max(existing.lastSeen, event.timestamp);

			const explicitDuration = event.metadata?.sessionDurationMs;
			if (typeof explicitDuration === 'number' && explicitDuration > 0) {
				existing.explicitDurationMs = Math.max(
					existing.explicitDurationMs,
					explicitDuration,
				);
			}
			sessionBounds.set(event.sessionId, existing);
		}

		const invalidationReason = event.metadata?.invalidationReason;
		if (typeof invalidationReason === 'string' && invalidationReason.length > 0) {
			invalidationReasonCounts.set(
				invalidationReason,
				(invalidationReasonCounts.get(invalidationReason) ?? 0) + 1,
			);
		}
	}

	const activeSessionsCount = Array.from(uniqueSessionIds).filter(
		(sessionId): sessionId is string =>
			typeof sessionId === 'string' && sessionId.length > 0,
	).length;

	const sessionDurations = Array.from(sessionBounds.values()).map((bounds) =>
		bounds.explicitDurationMs > 0
			? bounds.explicitDurationMs
			: Math.max(0, bounds.lastSeen - bounds.firstSeen),
	);
	const averageSessionDuration =
		sessionDurations.length > 0
			? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
			: 0;

	const sessionDurationDistribution = [
		{ range: '< 5 min', count: sessionDurations.filter((d) => d < 300000).length },
		{
			range: '5-15 min',
			count: sessionDurations.filter((d) => d >= 300000 && d < 900000).length,
		},
		{
			range: '15-30 min',
			count: sessionDurations.filter((d) => d >= 900000 && d < 1800000).length,
		},
		{
			range: '30-60 min',
			count: sessionDurations.filter((d) => d >= 1800000 && d < 3600000).length,
		},
		{ range: '> 60 min', count: sessionDurations.filter((d) => d >= 3600000).length },
	];

	const sessionsByUser = new Map<string, Set<string>>();
	for (const event of events) {
		if (event.userId && event.sessionId) {
			const sessions = sessionsByUser.get(event.userId) ?? new Set<string>();
			sessions.add(event.sessionId);
			sessionsByUser.set(event.userId, sessions);
		}
	}
	const concurrentSessionsPerUser = Array.from(sessionsByUser.entries())
		.map(([userId, sessions]) => ({ userId, sessionCount: Math.min(sessions.size, 5) }))
		.filter((u) => u.sessionCount > 1)
		.sort((a, b) => b.sessionCount - a.sessionCount)
		.slice(0, 10);

	const invalidationReasons = Array.from(invalidationReasonCounts.entries())
		.map(([reason, count]) => ({ reason, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		activeSessionsCount,
		averageSessionDuration,
		sessionDurationDistribution,
		concurrentSessionsPerUser,
		invalidationReasons,
	};
}

export function calculateRateLimitStats(events: SecurityAnalyticsEvent[]): RateLimitStats {
	const rateLimitedEvents = events.filter((e) => e.rateLimited);

	const ipCounts = new Map<string, { count: number; lastBlocked: number }>();
	for (const event of rateLimitedEvents) {
		const existing = ipCounts.get(event.ip) ?? { count: 0, lastBlocked: 0 };
		existing.count++;
		existing.lastBlocked = Math.max(existing.lastBlocked, event.timestamp);
		ipCounts.set(event.ip, existing);
	}
	const topRateLimitedIPs = Array.from(ipCounts.entries())
		.map(([ip, data]) => ({ ip, blockedCount: data.count, lastBlocked: data.lastBlocked }))
		.sort((a, b) => b.blockedCount - a.blockedCount)
		.slice(0, 10);

	const endpointCounts = new Map<string, { count: number; lastBreach: number }>();
	for (const event of rateLimitedEvents) {
		const existing = endpointCounts.get(event.path) ?? { count: 0, lastBreach: 0 };
		existing.count++;
		existing.lastBreach = Math.max(existing.lastBreach, event.timestamp);
		endpointCounts.set(event.path, existing);
	}
	const thresholdBreaches = Array.from(endpointCounts.entries())
		.map(([endpoint, data]) => ({
			endpoint,
			breachCount: data.count,
			lastBreach: data.lastBreach,
		}))
		.sort((a, b) => b.breachCount - a.breachCount)
		.slice(0, 10);

	const hourlyBlocked = bucketByHour(rateLimitedEvents, (hourEvents, hour) => ({
		hour,
		count: hourEvents.length,
	}));

	return {
		totalBlocked: rateLimitedEvents.length,
		topRateLimitedIPs,
		thresholdBreaches,
		hourlyBlocked,
	};
}

export function calculateIPReputationScores(
	events: SecurityAnalyticsEvent[],
): Array<{ ip: string; score: number; category: string }> {
	const ipStats = new Map<string, { totalRisk: number; count: number; blocked: number }>();
	for (const event of events) {
		const existing = ipStats.get(event.ip) ?? { totalRisk: 0, count: 0, blocked: 0 };
		existing.totalRisk += event.riskScore;
		existing.count++;
		if (event.blocked) existing.blocked++;
		ipStats.set(event.ip, existing);
	}

	return Array.from(ipStats.entries())
		.map(([ip, stats]) => {
			const avgRisk = stats.totalRisk / stats.count;
			const score = Math.max(0, 100 - avgRisk - stats.blocked * 10);
			const category =
				score >= 80
					? 'trusted'
					: score >= 50
						? 'neutral'
						: score >= 20
							? 'suspicious'
							: 'malicious';
			return { ip, score: Math.round(score), category };
		})
		.sort((a, b) => a.score - b.score)
		.slice(0, 10);
}

export function detectKnownBadActors(
	events: SecurityAnalyticsEvent[],
): Array<{ ip: string; reason: string; firstSeen: number }> {
	const badActors: Array<{ ip: string; reason: string; firstSeen: number }> = [];
	const ipStats = new Map<string, { blocked: number; firstSeen: number }>();

	for (const event of events) {
		if (event.blocked) {
			const existing = ipStats.get(event.ip) ?? {
				blocked: 0,
				firstSeen: event.timestamp,
			};
			existing.blocked++;
			existing.firstSeen = Math.min(existing.firstSeen, event.timestamp);
			ipStats.set(event.ip, existing);
		}
	}

	for (const [ip, stats] of ipStats.entries()) {
		if (stats.blocked >= 3) {
			badActors.push({
				ip,
				reason: stats.blocked >= 5 ? 'Repeated attacks' : 'Suspicious activity',
				firstSeen: stats.firstSeen,
			});
		}
	}

	return badActors.sort((a, b) => b.firstSeen - a.firstSeen).slice(0, 10);
}

export function detectTorExitNodes(
	events: SecurityAnalyticsEvent[],
): Array<{ ip: string; detectedAt: number }> {
	return events
		.filter((e) =>
			e.factors.some(
				(f) => f.includes('tor') || f.includes('vpn') || f.includes('proxy'),
			),
		)
		.slice(0, 5)
		.map((e) => ({ ip: e.ip, detectedAt: e.timestamp }));
}

export function calculateUserRiskProfiles(
	events: SecurityAnalyticsEvent[],
): UserRiskProfile[] {
	const userStats = new Map<
		string,
		{
			totalRisk: number;
			count: number;
			suspicious: number;
			lastActivity: number;
			blocked: number;
		}
	>();

	for (const event of events) {
		if (!event.userId) continue;
		const existing = userStats.get(event.userId) ?? {
			totalRisk: 0,
			count: 0,
			suspicious: 0,
			lastActivity: 0,
			blocked: 0,
		};
		existing.totalRisk += event.riskScore;
		existing.count++;
		if (event.riskScore >= 50) existing.suspicious++;
		existing.lastActivity = Math.max(existing.lastActivity, event.timestamp);
		if (event.blocked) existing.blocked++;
		userStats.set(event.userId, existing);
	}

	return Array.from(userStats.entries())
		.map(([userId, stats]) => {
			const avgRisk = stats.totalRisk / stats.count;
			const riskLevel = getRiskLevel(avgRisk);
			const isLocked = stats.blocked >= 5;
			return {
				userId,
				riskScore: Math.round(avgRisk),
				riskLevel,
				suspiciousActivities: stats.suspicious,
				lastActivity: stats.lastActivity,
				isLocked,
				lockoutHistory: isLocked
					? [
							{
								lockedAt: stats.lastActivity,
								reason: 'Multiple blocked requests',
								duration: 3600000,
							},
						]
					: [],
			} as UserRiskProfile;
		})
		.sort((a, b) => b.riskScore - a.riskScore)
		.slice(0, 10);
}

export function calculateAPISecurityStats(
	events: SecurityAnalyticsEvent[],
): APISecurityStats {
	const endpointStats = new Map<string, { count: number; ips: Set<string> }>();
	for (const event of events) {
		const existing = endpointStats.get(event.path) ?? { count: 0, ips: new Set() };
		existing.count++;
		existing.ips.add(event.ip);
		endpointStats.set(event.path, existing);
	}

	const endpointAbuse = Array.from(endpointStats.entries())
		.map(([endpoint, stats]) => ({
			endpoint,
			requestCount: stats.count,
			uniqueIPs: stats.ips.size,
			isAbusive: stats.count > 50 || (stats.count > 20 && stats.ips.size === 1),
		}))
		.sort((a, b) => b.requestCount - a.requestCount)
		.slice(0, 10);

	const unusualPatterns: Array<{
		pattern: string;
		occurrences: number;
		severity: 'low' | 'medium' | 'high';
	}> = [];
	const highRiskEvents = events.filter((e) => e.riskScore >= 70);
	if (highRiskEvents.length > 10) {
		unusualPatterns.push({
			pattern: 'High volume of risky requests',
			occurrences: highRiskEvents.length,
			severity: 'high',
		});
	}
	const blockedEvents = events.filter((e) => e.blocked);
	if (blockedEvents.length > 5) {
		unusualPatterns.push({
			pattern: 'Multiple blocked requests',
			occurrences: blockedEvents.length,
			severity: 'medium',
		});
	}

	const apiKeyStats = new Map<string, { requestCount: number; lastUsed: number }>();
	for (const event of events) {
		const keyId = event.metadata?.apiKeyId;
		if (typeof keyId !== 'string' || keyId.length === 0) continue;
		const existing = apiKeyStats.get(keyId) ?? { requestCount: 0, lastUsed: 0 };
		existing.requestCount++;
		existing.lastUsed = Math.max(existing.lastUsed, event.timestamp);
		apiKeyStats.set(keyId, existing);
	}

	const apiKeyUsage = Array.from(apiKeyStats.entries())
		.map(([keyId, stats]) => ({
			keyId,
			requestCount: stats.requestCount,
			lastUsed: stats.lastUsed,
		}))
		.sort((a, b) => b.requestCount - a.requestCount)
		.slice(0, 10);

	return { endpointAbuse, unusualPatterns, apiKeyUsage };
}

export function calculateTimeAnalysis(events: SecurityAnalyticsEvent[]): TimeAnalysis {
	const hourlyAttacks = new Map<number, number>();
	for (const event of events.filter((e) => e.blocked || e.riskScore >= 70)) {
		const hour = new Date(event.timestamp).getHours();
		hourlyAttacks.set(hour, (hourlyAttacks.get(hour) ?? 0) + 1);
	}
	const peakAttackTimes = Array.from(hourlyAttacks.entries())
		.map(([hour, attackCount]) => ({ hour, attackCount }))
		.sort((a, b) => b.attackCount - a.attackCount);

	const dayNames = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	const dayStats = new Map<number, { total: number; blocked: number }>();
	for (const event of events) {
		const day = new Date(event.timestamp).getDay();
		const existing = dayStats.get(day) ?? { total: 0, blocked: 0 };
		existing.total++;
		if (event.blocked) existing.blocked++;
		dayStats.set(day, existing);
	}
	const dayOfWeekPatterns = dayNames.map((day, i) => ({
		day,
		totalEvents: dayStats.get(i)?.total ?? 0,
		blockedEvents: dayStats.get(i)?.blocked ?? 0,
	}));

	const hourlyTrends = bucketByHour(events, (hourEvents, hour) => {
		const avgRisk =
			hourEvents.length > 0
				? hourEvents.reduce((sum, e) => sum + e.riskScore, 0) / hourEvents.length
				: 0;
		return {
			hour,
			avgRisk: Math.round(avgRisk * 10) / 10,
			eventCount: hourEvents.length,
		};
	});

	return { peakAttackTimes, dayOfWeekPatterns, hourlyTrends };
}

export function generateThreatFeed(events: SecurityAnalyticsEvent[]): ThreatEvent[] {
	const threats: ThreatEvent[] = [];

	for (const event of events
		.filter((e) => e.riskScore >= 50 || e.blocked)
		.slice(0, 20)) {
		let type: ThreatEvent['type'] = 'warning';
		let description = 'Suspicious activity detected';

		if (event.blocked) {
			type = 'blocked';
			description = `Request blocked: ${event.factors.join(', ') || 'Security policy'}`;
		} else if (event.riskScore >= 80) {
			type = 'attack';
			description = `High-risk activity: ${event.factors.join(', ') || 'Multiple risk factors'}`;
		} else if (event.riskScore >= 60) {
			type = 'anomaly';
			description = `Anomalous behavior: ${event.factors.join(', ') || 'Unusual pattern'}`;
		}

		const severity = getRiskLevel(event.riskScore);

		threats.push({
			id: event.id,
			timestamp: event.timestamp,
			type,
			severity,
			ip: event.ip,
			description,
			details: { path: event.path, userId: event.userId, riskScore: event.riskScore },
		});
	}

	return threats.sort((a, b) => b.timestamp - a.timestamp);
}
