<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
		import { Button } from '#lib/components/ui/button/index.js';
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { RefreshCcw } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import ActionReviewSheet from '#lib/components/admin-security/ActionReviewSheet.svelte';
	import { dashboardHref, readDashboardView, investigationForAction, type SecurityMode, type InvestigationView } from '#lib/components/admin-security/dashboard-view.js';
	import {
		OverviewStats, RiskDistributionChart, HourlyActivityChart, TopRiskFactors,
		FlaggedSessionsList, DashboardHeader, SystemHealthPanel, AuthMetricsPanel,
		BlockedIPsList, SessionAnalyticsPanel, RateLimitStatsPanel, IPIntelligencePanel,
		UserRiskProfilesPanel, APISecurityPanel, RecommendedActionsPanel, StatusHero,
		EscalationPolicyPanel, AutomationActionsPanel,
		deriveSecurityStatus, ALL_ACTION_SOURCES, ALL_ACTION_STATUSES,
		deriveIncidentCounts, deriveRecommendedActions, filterActions,
		type RecommendedActionItem, type ActionsFilterState,
	} from '#lib/components/admin-security/index.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let refreshError = $state('');
	let lastGoodData = $state<PageData | null>(null);
	const snapshot = $derived(data.error ? lastGoodData ?? data : data);
	// SvelteKit 3: shallow goto updates `page.shallow`, not `page.url`.
	// The effective current URL is the shallow target when one is active.
	const viewUrl = $derived(page.shallow?.url ?? page.url);
	const viewState = $derived(readDashboardView(viewUrl));
	const mode = $derived(viewState.mode);
	const investigateView = $derived(viewState.view);
	const metrics = $derived(snapshot.metrics);
	const coverage = $derived(snapshot.coverage);
	const events = $derived(snapshot.events ?? []);
	const sessions = $derived(snapshot.sessions ?? []);
	const blockedIPs = $derived(snapshot.blockedIPs ?? []);
	const threatFeed = $derived(snapshot.threatFeed ?? []);
	const sourceAvailable = $derived(coverage?.sources.events === 'available');
	const coverageLabel = $derived(coverage
		? `${coverage.sampleSize} recorded events in the last 24 hours (UTC). ${coverage.limitReached ? 'The latest-event limit was reached; this view is incomplete.' : 'This is a recent-event sample, not a complete traffic history.'}`
		: 'Monitoring coverage is unavailable. These records cannot establish overall security.');
	const recommendedActions = $derived(deriveRecommendedActions({ threatFeed, sessions, authStats: snapshot.authStats, blockedIPs, rateLimitStats: snapshot.rateLimitStats, ipIntelligence: snapshot.ipIntelligence }));
	const incidentCounts = $derived(deriveIncidentCounts({ threatFeed, sessions }));
	const securityStatus = $derived(deriveSecurityStatus({ counts: incidentCounts, actions: recommendedActions, monitoring: { available: sourceAvailable && !refreshError && !data.error, observedEvents: coverage?.sampleSize ?? 0, detail: coverage?.limitReached ? 'The event limit was reached; earlier activity may be missing.' : 'Based on the recorded sample; monitoring coverage is shown above.' } }));
	const visibleActions = $derived(filterActions(recommendedActions, viewState.filter));
	function resolveReview(id: string | null): RecommendedActionItem | null {
		const action = recommendedActions.find((item) => item.id === id);
		if (action) return action;
		const block = blockedIPs.find((entry) => `blocked:${entry.ip}` === id);
		if (block) return { id: `blocked:${block.ip}`, title: `Review block for ${block.ip}`, reason: block.reason, severity: 'medium', status: 'new', source: 'blocked_ips', sourceLabel: 'IP block record', detectedAt: block.blockedAt, primaryActionLabel: 'Review block', entityType: 'ip', entityId: block.ip, panelAnchor: '#blocked-ips' };
		const event = events.find((entry) => `event:${entry.id}` === id);
		return event ? { id: `event:${event.id}`, title: `Review activity from ${event.ip}`, reason: `${event.path} · ${event.blocked ? 'Request blocked' : 'Request not recorded as blocked'}`, severity: event.riskLevel as RecommendedActionItem['severity'], status: 'new', source: 'threat_feed', sourceLabel: 'Recorded event', detectedAt: event.timestamp, primaryActionLabel: 'Review evidence', entityType: 'event', entityId: event.id, panelAnchor: '#threat-feed' } : null;
	}
	const selectedItem = $derived(resolveReview(viewState.actionId));
	const relatedId = $derived(viewUrl.searchParams.get('related'));
	const relatedItem = $derived(resolveReview(relatedId));
	const filteredEvents = $derived(events.filter((event) => {
		if (viewState.bucket !== null) {
			const end = viewState.bucket + 3600000;
			if (event.timestamp < viewState.bucket || event.timestamp > end || (event.timestamp === end && end !== coverage?.windowEnd)) return false;
		} else if (viewState.hour !== null && new Date(event.timestamp).getUTCHours() !== viewState.hour) return false;
		if (viewState.risk && event.riskLevel !== viewState.risk) return false;
		if (relatedId && !relatedItem) return false;
		if (!relatedItem?.entityId) return true;
		switch (relatedItem.entityType) {
			case 'ip': return event.ip === relatedItem.entityId;
			case 'session': return event.sessionId === relatedItem.entityId || event.id === relatedItem.entityId;
			case 'user': return event.userId === relatedItem.entityId;
			case 'event': return event.id === relatedItem.entityId;
			default: return true;
		}
	}));
	const modes: { id: SecurityMode; label: string }[] = [{ id: 'today', label: 'Today' }, { id: 'investigate', label: 'Investigate' }, { id: 'trends', label: 'Trends' }];
	const investigationViews: { id: InvestigationView; label: string }[] = [{ id: 'incidents', label: 'Recent activity' }, { id: 'authentication', label: 'Sign-ins' }, { id: 'sessions_devices', label: 'Sessions & devices' }, { id: 'ip_network', label: 'IPs & network' }, { id: 'api_traffic', label: 'API traffic' }, { id: 'automation', label: 'Automation' }];
	let isRefreshing = $state(false);
	let isNavigating = $state(false);
	let lastSuccessfulRefresh = $state<string | null>(null);
	// The upstream Svelte bug (#18895) crashes when a pending async batch is
	// rebased by overlapping work. Serialise this page's own batch sources:
	// never start a shallow navigation while a refresh is pending, and never
	// start a refresh while a navigation is in flight.
	let inFlightRefresh: Promise<void> = Promise.resolve();

	function refreshDashboard(): Promise<void> {
		if (isRefreshing) return inFlightRefresh;
		isRefreshing = true;
		inFlightRefresh = (async () => {
			if (!data.error && data.coverage?.sources.events === 'available') lastGoodData = data;
			try {
				await invalidateAll();
				if (data.error || data.coverage?.sources.events !== 'available') {
					refreshError = 'Monitoring could not be refreshed completely. Available records may be stale; check source coverage.';
				} else {
					lastGoodData = data;
					lastSuccessfulRefresh = new Date().toLocaleString();
					refreshError = '';
				}
			} catch {
				refreshError = 'Refresh failed. The last successful sample remains visible when available; retry or check monitoring connections.';
			} finally { isRefreshing = false; }
		})();
		return inFlightRefresh;
	}

	onMount(() => {
		if (!data.error && data.coverage?.sources.events === 'available') lastGoodData = data;
		const interval = setInterval(() => { if (!document.hidden && !isNavigating) void refreshDashboard(); }, 30000);
		window.addEventListener('security-test-triggered', refreshDashboard);
		const channel = 'BroadcastChannel' in window ? new BroadcastChannel('security-test-events') : null;
		if (channel) channel.onmessage = () => { void refreshDashboard(); };
		return () => { clearInterval(interval); window.removeEventListener('security-test-triggered', refreshDashboard); channel?.close(); };
	});

	async function navigate(changes: Record<string, string | number | null>, focus = false, replace = false) {
		await inFlightRefresh;
		isNavigating = true;
		try {
			const href = dashboardHref(viewUrl, changes);
			await goto(href, { state: page.state, shallow: true, replace });
			if (focus) { await tick(); document.getElementById('security-content')?.focus(); }
		} finally { isNavigating = false; }
	}
	function filterChange(filter: ActionsFilterState) {
		void navigate({ search: filter.search || null, severity: filter.severity === 'all' ? null : filter.severity, source: filter.source === 'all' ? null : filter.source, status: filter.status === 'all' ? null : filter.status, new: filter.newOnly ? '1' : null }, false, true);
	}
	function resetFilters() { void navigate({ search: null, severity: null, source: null, status: null, new: null }, false, true); }
	function reviewTopTier() {
		const tier = recommendedActions.some((action) => action.status !== 'resolved' && action.severity === 'critical') ? 'critical' : 'high';
		filterChange({ search: '', severity: tier, source: 'all', status: 'all', newOnly: false });
	}
	function checkCoverage() {
		const details = document.getElementById('monitoring-coverage');
		if (details instanceof HTMLDetailsElement) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
	}
	function review(item: RecommendedActionItem) { void navigate({ action: item.id }); }
	function viewRelated(item: RecommendedActionItem) { void navigate({ mode: 'investigate', view: investigationForAction(item), action: null, related: item.id, hour: null, bucket: null, risk: null }, true); }
	function selectHour(hour: number, timestamp?: number) { void navigate({ mode: 'investigate', view: 'incidents', hour, bucket: timestamp ?? null, risk: null, related: null }, true); }
	function selectRisk(risk: 'low' | 'medium' | 'high' | 'critical') { void navigate({ mode: 'investigate', view: 'incidents', risk, hour: null, bucket: null, related: null }, true); }
	const actionFeedback = $derived(form && typeof form === 'object' ? { success: 'success' in form && Boolean(form.success), error: 'error' in form && typeof form.error === 'string' ? form.error : '', message: 'message' in form && typeof form.message === 'string' ? form.message : 'action' in form && typeof form.action === 'string' ? `${form.action} completed.` : '' } : null);
</script>

<svelte:head><title>Security | Admin</title></svelte:head>

<div class="flex min-w-0 flex-col gap-5">
	<PageHeader title="Security" description="What needs attention, why it matters, and what to do next.">
		{#snippet actions()}<DashboardHeader {form} />{/snippet}
	</PageHeader>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<nav aria-label="Security views" class="flex flex-wrap gap-1">
			{#each modes as entry (entry.id)}
				<Button variant={mode === entry.id ? 'default' : 'ghost'} href={dashboardHref(viewUrl, { mode: entry.id, action: null })} aria-current={mode === entry.id ? 'page' : undefined} onclick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); void navigate({ mode: entry.id, action: null }, true); } }}>{entry.label}</Button>
			{/each}
		</nav>
		<Button variant="outline" size="sm" disabled={isRefreshing} onclick={refreshDashboard}><RefreshCcw data-icon="inline-start" />{isRefreshing ? 'Refreshing…' : 'Refresh'}</Button>
	</div>
	{#if actionFeedback?.success && actionFeedback.message}<Alert.Root variant="success"><Alert.Title>Action completed</Alert.Title><Alert.Description>{actionFeedback.message}</Alert.Description></Alert.Root>{/if}
	{#if actionFeedback?.error}<Alert.Root variant="destructive"><Alert.Title>The action could not be completed</Alert.Title><Alert.Description>{actionFeedback.error}</Alert.Description></Alert.Root>{/if}
	{#if refreshError || data.error}<Alert.Root variant="destructive"><Alert.Title>Monitoring needs attention</Alert.Title><Alert.Description>{refreshError || data.error}</Alert.Description></Alert.Root>{/if}
	<div class="text-muted-foreground flex flex-col gap-1 text-xs">
		<p>{coverageLabel}</p>
		<p>{lastSuccessfulRefresh ? `Last successful refresh: ${lastSuccessfulRefresh}` : snapshot.lastUpdated ? `Data prepared: ${new Date(snapshot.lastUpdated).toLocaleString()}` : 'No successful observation timestamp is available.'}</p>
	</div>
	<main id="security-content" tabindex="-1" class="flex min-w-0 flex-col gap-5" aria-label="Security details">
		{#if mode === 'today'}
			<StatusHero status={securityStatus} actions={recommendedActions} onReviewTopTier={reviewTopTier} onShowAll={resetFilters} onCheckCoverage={checkCoverage} />
			<RecommendedActionsPanel items={recommendedActions} filter={viewState.filter} visibleItems={visibleActions} availableSources={ALL_ACTION_SOURCES} availableStatuses={ALL_ACTION_STATUSES} onFilterChange={filterChange} onResetFilters={resetFilters} onPrimaryAction={review} coverageLabel="Prioritised observations to check. Opening a review does not change access." />
			<details id="monitoring-coverage" open={!sourceAvailable}>
				<summary class="cursor-pointer py-2 font-medium">Can I rely on this monitoring?</summary>
				<div class="flex flex-col gap-4 pt-3">
					<Alert.Root><Alert.Title>What is connected?</Alert.Title><Alert.Description>{data.error ? 'Last successful source states. ' : ''}Event records: {sourceAvailable ? 'available' : 'unavailable'}. IP block records: {coverage?.sources.blockedIPs.replaceAll('-', ' ') ?? 'unknown'}. Account protection statistics: {coverage?.sources.twoFactor.replaceAll('-', ' ') ?? 'unknown'}. Infrastructure health: {coverage?.sources.systemHealth.replaceAll('-', ' ') ?? 'unknown'}. Device inventory requires its own connected source.</Alert.Description></Alert.Root>
					<SystemHealthPanel systemHealth={snapshot.systemHealth} />
				</div>
			</details>
		{:else if mode === 'investigate'}
			<nav aria-label="Investigation areas" class="flex flex-wrap gap-1">
				{#each investigationViews as entry (entry.id)}
					<Button size="sm" variant={investigateView === entry.id ? 'secondary' : 'ghost'} aria-current={investigateView === entry.id ? 'page' : undefined} onclick={() => navigate({ view: entry.id, action: null, related: null, hour: null, bucket: null, risk: null }, true)}>{entry.label}</Button>
				{/each}
			</nav>
			{#if relatedId && !relatedItem}<Alert.Root><Alert.Title>The selected review is no longer in this sample</Alert.Title><Alert.Description>Its absence does not establish that the issue was resolved. <Button variant="link" onclick={() => navigate({ related: null })}>Show current records</Button></Alert.Description></Alert.Root>{/if}
			{#if relatedItem}<Alert.Root><Alert.Title>Related to: {relatedItem.title}</Alert.Title><Alert.Description>The selected review remains available while you inspect this area. <Button variant="link" onclick={() => review(relatedItem)}>Open selected review</Button></Alert.Description></Alert.Root>{/if}
			{#if investigateView === 'incidents'}
				<Card.Root>
					<Card.Header>
						<Card.Title>What happened in the available records?</Card.Title>
						<Card.Description>{viewState.bucket !== null ? `${new Date(viewState.bucket).toLocaleString('en-GB', { timeZone: 'UTC' })} to ${new Date(viewState.bucket + 3600000).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. ` : viewState.hour !== null ? `UTC hour ${String(viewState.hour).padStart(2, '0')}:00. ` : ''}{viewState.risk ? `${viewState.risk} risk. ` : ''}{filteredEvents.length} events in this selection.</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						{#if viewState.bucket !== null || viewState.hour !== null || viewState.risk || relatedId}<Button variant="outline" onclick={() => navigate({ hour: null, bucket: null, risk: null, related: null })}>Show all available events</Button>{/if}
						{#if filteredEvents.length === 0}<Alert.Root><Alert.Title>No recorded events in this selection</Alert.Title><Alert.Description>{sourceAvailable ? 'Try another interval or clear the filters. An empty sample does not establish that monitoring is complete.' : 'The event source is unavailable. Check the monitoring connection and try refreshing.'}</Alert.Description></Alert.Root>{/if}
						<ul class="flex flex-col gap-3">
							{#each filteredEvents as event (event.id)}
								<li class="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
									<div class="flex min-w-0 flex-col gap-1"><p class="font-medium break-all">{event.path}</p><p class="text-muted-foreground text-sm break-all">{event.ip} · {new Date(event.timestamp).toLocaleString()} (local time)</p><p class="text-sm">{event.riskLevel} risk · {event.blocked ? 'Blocked' : 'Not recorded as blocked'}</p></div>
									<Button size="sm" variant="outline" onclick={() => navigate({ action: `event:${event.id}` })}>Review event</Button>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
				{#if metrics}<TopRiskFactors {metrics} />{/if}
			{:else if investigateView === 'authentication'}
				<AuthMetricsPanel authStats={snapshot.authStats} />
				<UserRiskProfilesPanel userRiskProfiles={snapshot.userRiskProfiles ?? []} />
			{:else if investigateView === 'sessions_devices'}
				<SessionAnalyticsPanel sessionAnalytics={snapshot.sessionAnalytics} />
				<FlaggedSessionsList {sessions} selectedEntityId={relatedItem?.entityId} />
				<Alert.Root><Alert.Title>Device trust is not measured by event risk</Alert.Title><Alert.Description>A low-risk event does not prove that a device is trusted. An authoritative device inventory is not connected to this dashboard.</Alert.Description></Alert.Root>
			{:else if investigateView === 'ip_network'}
				<IPIntelligencePanel ipIntelligence={snapshot.ipIntelligence} />
				{#if coverage?.sources.blockedIPs === 'available'}<BlockedIPsList {blockedIPs} onReview={(ip) => navigate({ action: `blocked:${ip}` })} />{:else}<Alert.Root><Alert.Title>IP block records are unavailable</Alert.Title><Alert.Description>Refresh or check the block-store connection. No conclusion can be drawn about how many IPs are currently blocked.</Alert.Description></Alert.Root>{/if}
			{:else if investigateView === 'api_traffic'}
				<RateLimitStatsPanel rateLimitStats={snapshot.rateLimitStats} />
				<APISecurityPanel apiSecurityStats={snapshot.apiSecurityStats} />
			{:else if investigateView === 'automation'}
				<EscalationPolicyPanel policy={snapshot.escalationPolicy} />
				<AutomationActionsPanel actions={snapshot.automationActions ?? []} />
			{/if}
		{:else if metrics}
			<HourlyActivityChart {metrics} {coverage} onSelectHour={selectHour} />
			<RiskDistributionChart {metrics} onSelectRisk={selectRisk} />
			<details><summary class="cursor-pointer py-2 font-medium">More context about these observations</summary><div class="pt-3"><OverviewStats {metrics} devices={snapshot.devices} /></div></details>
		{:else}
			<Alert.Root><Alert.Title>Activity charts are unavailable</Alert.Title><Alert.Description>Connect the event source or refresh to load observations. There is no history to chart yet.</Alert.Description></Alert.Root>
		{/if}
	</main>
	{#if dev}<Button variant="link" href="/admin/security-test">Open test scenarios</Button>{/if}
</div>

{#key viewState.actionId}
<ActionReviewSheet open={viewState.actionId !== null} item={selectedItem} {events} {blockedIPs} onClose={() => navigate({ action: null }, false, true)} onViewRelated={viewRelated} />

{/key}
