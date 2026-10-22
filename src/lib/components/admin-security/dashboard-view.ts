import type { ActionsFilterState, RecommendedActionItem } from './triage/types';
import { ALL_ACTION_SOURCES, ALL_ACTION_STATUSES, DEFAULT_ACTION_FILTER } from './triage/derive';

export const SECURITY_MODES = ['today', 'investigate', 'trends'] as const;
export const INVESTIGATION_VIEWS = ['incidents', 'authentication', 'sessions_devices', 'ip_network', 'api_traffic', 'automation'] as const;
export type SecurityMode = typeof SECURITY_MODES[number];
export type InvestigationView = typeof INVESTIGATION_VIEWS[number];

export function readDashboardView(url: { searchParams: Pick<URLSearchParams, 'get'> }) {
	const query = url.searchParams;
	const requestedMode = query.get('mode');
	const requestedView = query.get('view');
	const requestedHour = query.get('hour');
	const requestedRisk = query.get('risk');
	const requestedBucket = query.get('bucket');
	const bucket = requestedBucket && /^\d{10,16}$/.test(requestedBucket) ? Number(requestedBucket) : null;
	const hour = requestedHour !== null && /^\d{1,2}$/.test(requestedHour) ? Number(requestedHour) : null;
	return {
		mode: SECURITY_MODES.find((value) => value === requestedMode) ?? 'today',
		view: INVESTIGATION_VIEWS.find((value) => value === requestedView) ?? 'incidents',
		actionId: query.get('action'),
		bucket: bucket !== null && Number.isSafeInteger(bucket) && bucket >= 0 ? bucket : null,
		hour: hour !== null && hour >= 0 && hour <= 23 ? hour : null,
		risk: ['low', 'medium', 'high', 'critical'].find((value) => value === requestedRisk) ?? null,
		filter: {
			...DEFAULT_ACTION_FILTER,
			search: query.get('search') ?? '',
			severity: ['critical', 'high', 'medium', 'low'].find((value) => value === query.get('severity')) ?? 'all',
			source: ALL_ACTION_SOURCES.find((value) => value === query.get('source')) ?? 'all',
			status: ALL_ACTION_STATUSES.find((value) => value === query.get('status')) ?? 'all',
			newOnly: query.get('new') === '1',
		} as ActionsFilterState,
	};
}

export function dashboardHref(url: { href: string }, changes: Record<string, string | number | null>): string {
	const next = new URL(url.href);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null || value === '') next.searchParams.delete(key);
		else next.searchParams.set(key, String(value));
	}
	return `${next.pathname}${next.search}${next.hash}`;
}

export function investigationForAction(item: RecommendedActionItem): InvestigationView {
	switch (item.panelAnchor) {
		case '#auth-metrics': return 'authentication';
		case '#flagged-sessions': return 'sessions_devices';
		case '#ip-intelligence':
		case '#blocked-ips': return 'ip_network';
		case '#rate-limit-stats': return 'api_traffic';
		default: return 'incidents';
	}
}
