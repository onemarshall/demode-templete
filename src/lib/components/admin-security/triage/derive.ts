import type {
	ActionSource,
	ActionStatus,
	ActionsFilterState,
	IncidentCounts,
	RecommendedActionItem,
	Severity,
	SummaryCard
} from './types';

type ThreatFeedItem = {
	id?: string;
	timestamp?: number;
	riskLevel?: string;
	severity?: string;
	title?: string;
	type?: string;
};

type FlaggedSession = {
	sessionId?: string;
	flaggedAt?: number;
	riskLevel?: 'low' | 'medium' | 'high' | 'critical';
	riskScore?: number;
	ip?: string;
};

type BlockedIPInfo = {
	ip?: string;
	blockedAt?: number;
	reason?: string;
};

type AuthStats = {
	bruteForceAttempts?: Array<{ ip?: string; failureCount?: number; lastAttempt?: number }>;
	recentFailures?: Array<{ timestamp?: number; ip?: string; reason?: string }>;
};

type IPIntelligence = {
	knownBadActors?: Array<{ ip?: string; reason?: string; lastSeen?: number }>;
};

export type DeriveInput = {
	threatFeed?: ThreatFeedItem[] | null;
	sessions?: FlaggedSession[] | null;
	blockedIPs?: BlockedIPInfo[] | null;
	authStats?: AuthStats | null;
	rateLimitStats?: unknown;
	ipIntelligence?: IPIntelligence | null;
	now?: number;
};

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAGE_ACTION_THRESHOLDS = {
	maxActions: 30,
	maxThreatFeedActions: 8,
	maxSessionActions: 6,
	maxBlockedIPActions: 3,
	maxBadActorActions: 3,
	bruteForceMinFailures: 5,
	sessionMinRiskScore: 55,
	rateLimitMinTopIPCount: 20,
	rateLimitCriticalTopIPCount: 40
} as const;

function normalizeSeverity(value: unknown): Severity {
	const v = String(value ?? '').toLowerCase();
	if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') return v;
	return 'medium';
}

function scoreToSeverity(score: number | undefined): Severity {
	if (!Number.isFinite(score)) return 'medium';
	if ((score ?? 0) >= 85) return 'critical';
	if ((score ?? 0) >= 65) return 'high';
	if ((score ?? 0) >= 35) return 'medium';
	return 'low';
}

function rankSeverity(severity: Severity): number {
	switch (severity) {
		case 'critical':
			return 4;
		case 'high':
			return 3;
		case 'medium':
			return 2;
		case 'low':
			return 1;
	}
}

function asObject(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object') {
		return value as Record<string, unknown>;
	}
	return {};
}

function asRateLimitStats(value: unknown): {
	throttledRequests: number;
	topLimitedIPs: Array<{ ip?: string; count: number }>;
} {
	const source = asObject(value);
	const throttledRequests = Number(source.throttledRequests ?? 0);
	const maybeTop = Array.isArray(source.topLimitedIPs) ? source.topLimitedIPs : [];

	const topLimitedIPs = maybeTop
		.map((entry) => {
			const item = asObject(entry);
			const count = Number(item.count ?? 0);
			return {
				ip: typeof item.ip === 'string' ? item.ip : undefined,
				count: Number.isFinite(count) ? count : 0
			};
		})
		.filter((entry) => entry.count > 0);

	return {
		throttledRequests: Number.isFinite(throttledRequests) ? throttledRequests : 0,
		topLimitedIPs
	};
}

function shouldIncludeThreatFeedAction(
	severity: Severity,
	detectedAt: number,
	now: number
): boolean {
	if (severity === 'critical' || severity === 'high') return true;
	if (severity === 'medium' && now - detectedAt <= FIFTEEN_MIN_MS) return true;
	return false;
}

export function deriveIncidentCounts(input: DeriveInput): IncidentCounts {
	const now = input.now ?? Date.now();
	let critical = 0;
	let high = 0;
	let medium = 0;
	let low = 0;
	let newLast15m = 0;

	for (const item of input.threatFeed ?? []) {
		const sev = normalizeSeverity(item.severity ?? item.riskLevel);
		if (sev === 'critical') critical++;
		else if (sev === 'high') high++;
		else if (sev === 'medium') medium++;
		else low++;

		const ts = Number(item.timestamp ?? 0);
		if (ts > 0 && now - ts <= FIFTEEN_MIN_MS) newLast15m++;
	}

	for (const s of input.sessions ?? []) {
		const sev = s.riskLevel ?? scoreToSeverity(s.riskScore);
		if (sev === 'critical') critical++;
		else if (sev === 'high') high++;
		else if (sev === 'medium') medium++;
		else low++;

		const ts = Number(s.flaggedAt ?? 0);
		if (ts > 0 && now - ts <= FIFTEEN_MIN_MS) newLast15m++;
	}

	return { critical, high, medium, low, newLast15m };
}

export function deriveRecommendedActions(input: DeriveInput): RecommendedActionItem[] {
	const actions: RecommendedActionItem[] = [];
	const now = input.now ?? Date.now();
	const rateLimit = asRateLimitStats(input.rateLimitStats);

	for (const event of (input.threatFeed ?? []).slice(
		0,
		TRIAGE_ACTION_THRESHOLDS.maxThreatFeedActions
	)) {
		const severity = normalizeSeverity(event.severity ?? event.riskLevel);
		const detectedAt = Number(event.timestamp ?? now);
		if (!shouldIncludeThreatFeedAction(severity, detectedAt, now)) continue;

		actions.push({
			id: `tf:${event.id ?? `${event.type ?? 'event'}:${event.timestamp ?? now}`}`,
			severity,
			status: 'new',
			title: event.title ?? `Investigate ${event.type ?? 'security event'}`,
			reason: `Detected ${severity}-risk signal in threat feed`,
			source: 'threat_feed',
			sourceLabel: 'Threat Feed',
			detectedAt,
			primaryActionLabel: 'Review Event',
			detailsLabel: 'Open Threat Feed',
			entityType: 'event',
			entityId: event.id,
			panelAnchor: '#threat-feed'
		});
	}

	for (const session of (input.sessions ?? []).slice(
		0,
		TRIAGE_ACTION_THRESHOLDS.maxSessionActions
	)) {
		const severity = session.riskLevel ?? scoreToSeverity(session.riskScore);
		if (rankSeverity(severity) < rankSeverity('high')) {
			const score = Number(session.riskScore ?? 0);
			if (score < TRIAGE_ACTION_THRESHOLDS.sessionMinRiskScore) continue;
		}

		actions.push({
			id: `session:${session.sessionId ?? Math.random().toString(36).slice(2)}`,
			severity,
			status: 'new',
			title: `Investigate flagged session ${session.sessionId ?? ''}`.trim(),
			reason: `Session risk requires review${session.ip ? ` (IP ${session.ip})` : ''}`,
			source: 'session_analytics',
			sourceLabel: 'Session Analytics',
			detectedAt: Number(session.flaggedAt ?? now),
			primaryActionLabel: 'Review Session',
			detailsLabel: 'Open Flagged Sessions',
			entityType: 'session',
			entityId: session.sessionId,
			panelAnchor: '#flagged-sessions'
		});
	}

	for (const attempt of input.authStats?.bruteForceAttempts ?? []) {
		const count = Number(attempt.failureCount ?? 0);
		if (count < TRIAGE_ACTION_THRESHOLDS.bruteForceMinFailures) continue;
		const severity: Severity = count >= 8 ? 'critical' : count >= 5 ? 'high' : 'medium';

		actions.push({
			id: `bf:${attempt.ip ?? Math.random().toString(36).slice(2)}`,
			severity,
			status: 'new',
			title: `Brute-force pattern from ${attempt.ip ?? 'unknown IP'}`,
			reason: `${count} failed login attempts`,
			source: 'auth_metrics',
			sourceLabel: 'Authentication Metrics',
			detectedAt: Number(attempt.lastAttempt ?? now),
			primaryActionLabel: 'Review Auth Failures',
			detailsLabel: 'Open Auth Metrics',
			entityType: 'ip',
			entityId: attempt.ip,
			panelAnchor: '#auth-metrics'
		});
	}

	for (const ip of (input.blockedIPs ?? []).slice(
		0,
		TRIAGE_ACTION_THRESHOLDS.maxBlockedIPActions
	)) {
		const blockedAt = Number(ip.blockedAt ?? 0);
		if (blockedAt > 0 && now - blockedAt > ONE_DAY_MS) continue;

		actions.push({
			id: `blocked:${ip.ip ?? Math.random().toString(36).slice(2)}`,
			severity: 'high',
			status: 'new',
			title: `Review blocked IP ${ip.ip ?? ''}`.trim(),
			reason: ip.reason ?? 'IP blocked due to security policy',
			source: 'blocked_ips',
			sourceLabel: 'Blocked IPs',
			detectedAt: blockedAt || now,
			primaryActionLabel: 'Inspect Block Record',
			detailsLabel: 'Open Blocked IPs',
			entityType: 'ip',
			entityId: ip.ip,
			panelAnchor: '#blocked-ips'
		});
	}

	for (const actor of (input.ipIntelligence?.knownBadActors ?? []).slice(
		0,
		TRIAGE_ACTION_THRESHOLDS.maxBadActorActions
	)) {
		actions.push({
			id: `bad-actor:${actor.ip ?? Math.random().toString(36).slice(2)}`,
			severity: 'critical',
			status: 'new',
			title: `Known bad actor activity: ${actor.ip ?? 'unknown IP'}`,
			reason: actor.reason ?? 'Matched threat intelligence',
			source: 'ip_intelligence',
			sourceLabel: 'IP Intelligence',
			detectedAt: Number(actor.lastSeen ?? now),
			primaryActionLabel: 'Review IP Intelligence',
			detailsLabel: 'Open IP Intelligence',
			entityType: 'ip',
			entityId: actor.ip,
			panelAnchor: '#ip-intelligence'
		});
	}

	for (const limited of rateLimit.topLimitedIPs) {
		if (limited.count < TRIAGE_ACTION_THRESHOLDS.rateLimitMinTopIPCount) continue;

		actions.push({
			id: `rate-limit:${limited.ip ?? Math.random().toString(36).slice(2)}`,
			severity:
				limited.count >= TRIAGE_ACTION_THRESHOLDS.rateLimitCriticalTopIPCount ? 'critical' : 'high',
			status: 'new',
			title: `Rate-limit pressure from ${limited.ip ?? 'unknown IP'}`,
			reason: `${limited.count} throttled requests observed`,
			source: 'rate_limit_stats',
			sourceLabel: 'Rate Limit Stats',
			detectedAt: now,
			primaryActionLabel: 'Review Rate Limits',
			detailsLabel: 'Open Rate Limit Stats',
			entityType: 'ip',
			entityId: limited.ip,
			panelAnchor: '#rate-limit-stats'
		});
	}

	if (
		rateLimit.throttledRequests >= TRIAGE_ACTION_THRESHOLDS.rateLimitMinTopIPCount &&
		!actions.some((action) => action.source === 'rate_limit_stats')
	) {
		actions.push({
			id: 'rate-limit:global-pressure',
			severity: 'high',
			status: 'new',
			title: 'Global rate-limit pressure increased',
			reason: `${rateLimit.throttledRequests} throttled requests in current window`,
			source: 'rate_limit_stats',
			sourceLabel: 'Rate Limit Stats',
			detectedAt: now,
			primaryActionLabel: 'Review Rate Limits',
			detailsLabel: 'Open Rate Limit Stats',
			entityType: 'event',
			panelAnchor: '#rate-limit-stats'
		});
	}

	return actions
		.filter((action, index, all) => {
			return (
				all.findIndex((candidate) => {
					if (candidate.source !== action.source) return false;
					return (candidate.entityId ?? candidate.id) === (action.entityId ?? action.id);
				}) === index
			);
		})
		.sort((a, b) => {
			const severityDiff = rankSeverity(b.severity) - rankSeverity(a.severity);
			if (severityDiff !== 0) return severityDiff;
			return b.detectedAt - a.detectedAt;
		})
		.slice(0, TRIAGE_ACTION_THRESHOLDS.maxActions);
}

export function buildSummaryCards(args: {
	counts: IncidentCounts;
	items: RecommendedActionItem[];
}): [SummaryCard, SummaryCard, SummaryCard] {
	const { counts, items } = args;

	const nextCount = items.filter((i) => i.severity === 'high' || i.severity === 'medium').length;
	const watchCount = items.filter(
		(i) => i.severity === 'low' || i.status === 'acknowledged'
	).length;

	return [
		{
			id: 'now',
			title: `${counts.critical} critical issues now`,
			subtitle: 'Immediate investigation recommended',
			severity: 'critical',
			count: counts.critical,
			filter: { severities: ['critical'] },
			ctaLabel: 'Review critical'
		},
		{
			id: 'next',
			title: `${nextCount} high-priority checks`,
			subtitle: 'Action within this session',
			severity: 'high',
			count: nextCount,
			filter: { severities: ['high', 'medium'] },
			ctaLabel: 'Review next'
		},
		{
			id: 'watchlist',
			title: `${watchCount} watchlist items`,
			subtitle: 'Monitor for trend escalation',
			severity: 'medium',
			count: watchCount,
			filter: { severities: ['low', 'medium'], statuses: ['new', 'acknowledged'] },
			ctaLabel: 'View watchlist'
		}
	];
}

export function filterActions(
	items: RecommendedActionItem[],
	filter: ActionsFilterState,
	now = Date.now()
): RecommendedActionItem[] {
	const search = filter.search.trim().toLowerCase();

	return items.filter((item) => {
		if (filter.severity !== 'all' && item.severity !== filter.severity) return false;
		if (filter.source !== 'all' && item.source !== filter.source) return false;
		if (filter.status !== 'all' && item.status !== filter.status) return false;
		if (filter.newOnly && now - item.detectedAt > FIFTEEN_MIN_MS) return false;

		if (search.length > 0) {
			const haystack =
				`${item.title} ${item.reason} ${item.sourceLabel} ${item.entityId ?? ''}`.toLowerCase();
			if (!haystack.includes(search)) return false;
		}

		return true;
	});
}

export const DEFAULT_ACTION_FILTER: ActionsFilterState = {
	severity: 'all',
	source: 'all',
	status: 'all',
	newOnly: false,
	search: ''
};

export const ALL_ACTION_SOURCES: ActionSource[] = [
	'threat_feed',
	'auth_metrics',
	'session_analytics',
	'rate_limit_stats',
	'ip_intelligence',
	'user_risk_profiles',
	'blocked_ips',
	'trusted_devices',
	'api_security',
	'time_analysis',
	'overview'
];

export const ALL_ACTION_STATUSES: ActionStatus[] = [
	'new',
	'acknowledged',
	'in_progress',
	'resolved'
];
