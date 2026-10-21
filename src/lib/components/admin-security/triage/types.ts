export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ActionSource =
	| 'threat_feed'
	| 'auth_metrics'
	| 'session_analytics'
	| 'rate_limit_stats'
	| 'ip_intelligence'
	| 'user_risk_profiles'
	| 'blocked_ips'
	| 'trusted_devices'
	| 'api_security'
	| 'time_analysis'
	| 'overview';

export type ActionStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';

export interface IncidentCounts {
	critical: number;
	high: number;
	medium: number;
	low: number;
	newLast15m: number;
}

export interface SummaryCard {
	id: 'now' | 'next' | 'watchlist';
	title: string;
	subtitle: string;
	severity: Severity;
	count: number;
	filter: {
		severities?: Severity[];
		sources?: ActionSource[];
		statuses?: ActionStatus[];
	};
	ctaLabel: string;
}

export interface RecommendedActionItem {
	id: string;
	severity: Severity;
	status: ActionStatus;
	title: string;
	reason: string;
	source: ActionSource;
	sourceLabel: string;
	detectedAt: number;
	primaryActionLabel: string;
	detailsLabel?: string;
	entityType?: 'ip' | 'session' | 'user' | 'event' | 'api_key';
	entityId?: string;
	panelAnchor?: string;
	metadata?: Record<string, unknown>;
}

export interface ActionsFilterState {
	severity: 'all' | Severity;
	source: 'all' | ActionSource;
	status: 'all' | ActionStatus;
	newOnly: boolean;
	search: string;
}
