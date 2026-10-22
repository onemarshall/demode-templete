import { describe, expect, it } from 'vitest';
import { dashboardHref, readDashboardView, investigationForAction } from '../dashboard-view';
import type { RecommendedActionItem } from '../triage/types';

describe('security investigation navigation', () => {
	it('retains selected evidence, a rolling time bucket and filters in a shareable URL', () => {
		const original = new URL('https://example.test/admin/security?mode=trends');
		const href = dashboardHref(original, { mode: 'investigate', view: 'incidents', bucket: 1792638900000, hour: 3, risk: 'critical', action: 'event:a/b', search: 'an account' });
		const state = readDashboardView(new URL(href, original));
		expect(state).toMatchObject({ mode: 'investigate', view: 'incidents', bucket: 1792638900000, hour: 3, risk: 'critical', actionId: 'event:a/b', filter: { search: 'an account' } });
		expect(original.searchParams.get('mode')).toBe('trends');
	});
	it('rejects unsupported modes, negative/out-of-range hours and invalid buckets', () => {
		expect(readDashboardView(new URL('https://example.test/?mode=admin&view=secrets&hour=24&bucket=NaN&risk=trusted&status=anything'))).toMatchObject({ mode: 'today', view: 'incidents', hour: null, bucket: null, risk: null, filter: { status: 'all' } });
		expect(readDashboardView(new URL('https://example.test/?hour=-1&bucket=-1')).hour).toBeNull();
	});
	it('clears detail selection without dropping the investigation area', () => {
		const url = new URL('https://example.test/admin/security?mode=investigate&view=ip_network&action=blocked%3A1.2.3.4');
		const next = readDashboardView(new URL(dashboardHref(url, { action: null }), url));
		expect(next.actionId).toBeNull();
		expect(next.view).toBe('ip_network');
	});
	it('keeps a flagged session review in its session investigation', () => {
		expect(investigationForAction({ panelAnchor: '#flagged-sessions' } as RecommendedActionItem)).toBe('sessions_devices');
	});
});
