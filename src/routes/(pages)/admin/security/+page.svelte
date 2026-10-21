<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import * as Alert from '$lib/components/ui/alert/index.js'
	import { Button } from '$lib/components/ui/button'
	import { dev } from '$app/env'
	import { invalidateAll } from '$app/navigation'
	import { onMount } from 'svelte'
	import { RefreshCcw, TestTubes } from '@lucide/svelte'
	import type { PageData, ActionData } from './$types'
	import {
		OverviewStats,
		RiskDistributionChart,
		SecuritySignalsPanel,
		HourlyActivityChart,
		GeographicBreakdown,
		TopRiskFactors,
		FlaggedSessionsList,
		TrustedDevicesList,
		DashboardHeader,
		SystemHealthPanel,
		AuthMetricsPanel,
		BlockedIPsList,
		SessionAnalyticsPanel,
		RateLimitStatsPanel,
		IPIntelligencePanel,
		UserRiskProfilesPanel,
		APISecurityPanel,
		TimeAnalysisPanel,
		ThreatFeedPanel,
		IncidentSummaryCards,
		RecommendedActionsPanel,
		StatusHero,
		deriveSecurityStatus,
		ALL_ACTION_SOURCES,
		ALL_ACTION_STATUSES,
		DEFAULT_ACTION_FILTER,
		buildSummaryCards,
		deriveIncidentCounts,
		deriveRecommendedActions,
		filterActions,
		type RecommendedActionItem,
		type ActionsFilterState,
		type SummaryCard,
	} from '$lib/components/admin-security'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	// Keep these reactive to navigation/data updates from server load
	const metrics = $derived(data.metrics)
	const sessions = $derived(data.sessions)
	const devices = $derived(data.devices)
	const systemHealth = $derived(data.systemHealth)
	const blockedIPs = $derived(data.blockedIPs ?? [])
	const authStats = $derived(data.authStats)
	const sessionAnalytics = $derived(data.sessionAnalytics)
	const rateLimitStats = $derived(data.rateLimitStats)
	const ipIntelligence = $derived(data.ipIntelligence)
	const userRiskProfiles = $derived(data.userRiskProfiles ?? [])
	const apiSecurityStats = $derived(data.apiSecurityStats ?? null)
	const timeAnalysis = $derived(data.timeAnalysis)
	const threatFeed = $derived(data.threatFeed ?? [])

	// Real-time refresh
	let refreshInterval: ReturnType<typeof setInterval>
	let testBroadcastChannel: BroadcastChannel | null = null
	let isRefreshing = $state(false)
	let lastRefresh = $state(new Date().toLocaleTimeString())

	async function refreshDashboard() {
		if (isRefreshing) return
		isRefreshing = true
		try {
			await invalidateAll()
		} finally {
			isRefreshing = false
			lastRefresh = new Date().toLocaleTimeString()
		}
	}

	/** Poll-only refresh: skip if data hasn't changed */
	async function pollRefresh() {
		if (isRefreshing) return
		const prevVersion = data.dataVersion
		isRefreshing = true
		try {
			await invalidateAll()
		} finally {
			isRefreshing = false
			// Only update UI timestamp if data actually changed
			if (data.dataVersion !== prevVersion) {
				lastRefresh = new Date().toLocaleTimeString()
			}
		}
	}

	onMount(() => {
		// Auto-refresh every 30 seconds (with change detection)
		refreshInterval = setInterval(pollRefresh, 30000)

		// Listen for test events
		window.addEventListener('security-test-triggered', refreshDashboard)
		if ('BroadcastChannel' in window) {
			testBroadcastChannel = new BroadcastChannel('security-test-events')
			testBroadcastChannel.onmessage = () => {
				refreshDashboard()
			}
		}

		// Cleanup on unmount
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval)
			}
			window.removeEventListener('security-test-triggered', refreshDashboard)
			testBroadcastChannel?.close()
		}
	})

	const debugData = $derived(data.debugData)
	const actionResult = $derived(
		form && typeof form === 'object'
			? {
					success: 'success' in form ? Boolean(form.success) : false,
					message: 'message' in form && typeof form.message === 'string' ? form.message : '',
					error: 'error' in form && typeof form.error === 'string' ? form.error : '',
				}
			: null
	)
	let showDebug = $state(false)
	let actionFilter = $state<ActionsFilterState>({ ...DEFAULT_ACTION_FILTER })
	let acknowledgedActionIds = $state<Set<string>>(new Set())
	let lastHandledActionResult = $state('')
	type Mode = 'today' | 'investigate' | 'trends'
	type InvestigateView =
		| 'incidents'
		| 'authentication'
		| 'sessions_devices'
		| 'ip_network'
		| 'api_traffic'

	const modes: Array<{ id: Mode; label: string; description: string }> = [
		{ id: 'today', label: 'Today', description: "What needs your attention now" },
		{ id: 'investigate', label: 'Investigate', description: 'Drill into a specific area' },
		{ id: 'trends', label: 'Trends', description: 'Historical patterns and traffic' },
	]

	const investigateViews: Array<{ id: InvestigateView; label: string }> = [
		{ id: 'incidents', label: 'Recent threats' },
		{ id: 'authentication', label: 'Sign-ins' },
		{ id: 'sessions_devices', label: 'Sessions & devices' },
		{ id: 'ip_network', label: 'IPs & network' },
		{ id: 'api_traffic', label: 'API traffic' },
	]

	const investigateCounts = $derived<Record<InvestigateView, number>>({
		incidents: threatFeed.length,
		authentication: userRiskProfiles.length,
		sessions_devices: sessions?.length ?? 0,
		ip_network: blockedIPs.length,
		api_traffic: rateLimitStats?.totalBlocked ?? 0,
	})

	let mode = $state<Mode>('today')
	let investigateView = $state<InvestigateView>('incidents')

	const incidentCounts = $derived(
		deriveIncidentCounts({
			threatFeed,
			sessions,
			authStats,
			blockedIPs,
			rateLimitStats,
			ipIntelligence,
		})
	)

	const rawRecommendedActions = $derived<RecommendedActionItem[]>(
		deriveRecommendedActions({
			threatFeed,
			sessions,
			blockedIPs,
			authStats,
			rateLimitStats,
			ipIntelligence,
		})
	)

	const recommendedActions = $derived<RecommendedActionItem[]>(
		rawRecommendedActions.map((item) => ({
			...item,
			status: acknowledgedActionIds.has(item.id) ? 'acknowledged' : item.status,
		}))
	)

	const summaryCards = $derived<[SummaryCard, SummaryCard, SummaryCard]>(
		buildSummaryCards({ counts: incidentCounts, items: recommendedActions })
	)

	const securityStatus = $derived(
		deriveSecurityStatus({ counts: incidentCounts, actions: recommendedActions })
	)

	const visibleActions = $derived<RecommendedActionItem[]>(
		filterActions(recommendedActions, actionFilter)
	)

	function scrollToActions() {
		document.getElementById('recommended-actions')?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		})
	}

	function handleSummaryCardCta(card: SummaryCard) {
		actionFilter = {
			...actionFilter,
			severity: card.filter.severities?.[0] ?? 'all',
			source: card.filter.sources?.[0] ?? 'all',
			status: card.filter.statuses?.[0] ?? 'all',
		}
		scrollToActions()
	}

	function handleActionFilterChange(next: ActionsFilterState) {
		actionFilter = next
	}

	function handleActionFilterReset() {
		actionFilter = { ...DEFAULT_ACTION_FILTER }
	}

	function handlePrimaryAction(item: RecommendedActionItem) {
		if (item.panelAnchor) {
			const anchor = item.panelAnchor
			const target = getViewForAnchor(anchor)
			if (target) {
				mode = 'investigate'
				investigateView = target
			}

			setTimeout(() => {
				document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}, 0)
		}
	}

	function handleOpenActionDetails(item: RecommendedActionItem) {
		handlePrimaryAction(item)
	}

	function handleAcknowledgeAction(item: RecommendedActionItem) {
		const next = new Set(acknowledgedActionIds)
		next.add(item.id)
		acknowledgedActionIds = next
	}

	function getViewForAnchor(anchor: string): InvestigateView | null {
		switch (anchor) {
			case '#threat-feed':
				return 'incidents'
			case '#auth-metrics':
				return 'authentication'
			case '#flagged-sessions':
				return 'sessions_devices'
			case '#ip-intelligence':
				return 'ip_network'
			case '#blocked-ips':
				return 'ip_network'
			case '#rate-limit-stats':
				return 'api_traffic'
			default:
				return null
		}
	}

	$effect(() => {
		if (!actionResult?.success) {
			return
		}

		const signature = `${actionResult.message}:${data.dataVersion}`
		if (signature === lastHandledActionResult) {
			return
		}

		lastHandledActionResult = signature
		void refreshDashboard()
	})
</script>

<svelte:head>
	<title>Security Dashboard | Admin</title>
</svelte:head>

<div class="container mx-auto max-w-9xl space-y-6 p-6">
	<!-- Header -->
	<DashboardHeader {form} />

	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={refreshDashboard}
				disabled={isRefreshing}
				class="gap-2"
			>
				{#if isRefreshing}
					<RefreshCcw class="h-4 w-4 animate-spin"></RefreshCcw>
				{:else}
					<RefreshCcw class="h-4 w-4"></RefreshCcw>
				{/if}
				Refresh
			</Button>
			<div class="text-muted-foreground text-sm">
				Last: {lastRefresh}
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if dev}
				<Button variant="outline" href="/admin/security-test" class="text-xs"
					><TestTubes class="h-4"></TestTubes> Test Scenarios</Button
				>
			{/if}
			<Button variant="outline" onclick={() => (showDebug = !showDebug)} class="text-xs">
				{showDebug ? 'Hide debug JSON' : 'Show debug JSON'}
			</Button>
		</div>
	</div>

	{#if actionResult?.success && actionResult.message}
		<Alert.Root variant="success">
			<Alert.Description>{actionResult.message}</Alert.Description>
		</Alert.Root>
	{:else if actionResult?.error}
		<Alert.Root variant="destructive">
			<Alert.Description>{actionResult.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if showDebug}
		<Card.Root class="border-dashed">
			<Card.Content class="pt-4">
				<pre class="text-xs break-all whitespace-pre-wrap">
{JSON.stringify(debugData, null, 2)}
				</pre>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.error}
		<Card.Root class="border-destructive">
			<Card.Content class="pt-6">
				<p class="text-destructive">{data.error}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if metrics}
		<div class="grid gap-6 lg:grid-cols-[250px_1fr] lg:items-start">
			<Card.Root class="lg:sticky lg:top-6">
				<Card.Header>
					<Card.Title class="text-base">Security</Card.Title>
					<Card.Description>Start with Today. Use Investigate to dig in.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-1">
					{#each modes as m}
						<Button
							type="button"
							variant={mode === m.id ? 'default' : 'ghost'}
							onclick={() => (mode = m.id)}
							class="h-auto w-full justify-start px-3 py-2 text-left"
						>
							<span class="block text-sm font-medium">{m.label}</span>
						</Button>
						{#if m.id === 'investigate' && mode === 'investigate'}
							<div class="ml-3 space-y-1">
								{#each investigateViews as v}
									{@const count = investigateCounts[v.id]}
									{@const isEmpty = count === 0}
									{@const isActive = investigateView === v.id}
									<Button
										type="button"
										variant="ghost"
										onclick={() => (investigateView = v.id)}
										class="relative h-auto w-full justify-between gap-2 rounded-md border-l-2 py-1.5 pr-3 pl-3 text-left text-xs transition-colors {isActive
											? 'border-primary bg-primary/10 text-primary hover:bg-primary/10 font-semibold'
											: 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground'}"
									>
										<span class={!isActive && isEmpty ? 'opacity-60' : ''}>{v.label}</span>
										<span
											class="inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums {isActive
												? 'bg-primary text-primary-foreground'
												: isEmpty
													? 'bg-muted text-muted-foreground/60'
													: 'bg-primary/10 text-primary'}"
										>
											{count}
										</span>
									</Button>
								{/each}
							</div>
						{/if}
					{/each}
				</Card.Content>
			</Card.Root>

			<div class="space-y-6">
				{#snippet emptyState(message: string)}
					<Card.Root
						class="border-dashed border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10"
					>
						<Card.Content class="py-10">
							<div class="text-center">
								<p class="text-emerald-900 dark:text-emerald-100 text-sm">{message}</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/snippet}

				{#if mode === 'today'}
					<StatusHero
						status={securityStatus}
						lastRefreshLabel={lastRefresh}
						{isRefreshing}
						onRefresh={refreshDashboard}
						onReviewActions={scrollToActions}
					/>

					<IncidentSummaryCards cards={summaryCards} onCardCta={handleSummaryCardCta} />

					<RecommendedActionsPanel
						items={recommendedActions}
						filter={actionFilter}
						visibleItems={visibleActions}
						availableSources={ALL_ACTION_SOURCES}
						availableStatuses={ALL_ACTION_STATUSES}
						onFilterChange={handleActionFilterChange}
						onResetFilters={handleActionFilterReset}
						onPrimaryAction={handlePrimaryAction}
						onOpenDetails={handleOpenActionDetails}
						onAcknowledge={handleAcknowledgeAction}
					/>

					<SystemHealthPanel {systemHealth} />
				{:else if mode === 'investigate'}
					{#if investigateView === 'incidents'}
						{#if investigateCounts.incidents === 0}
							{@render emptyState("No recent threats. Nothing's been flagged yet — when something happens, it'll show up here.")}
						{:else}
							<div id="threat-feed">
								<ThreatFeedPanel {threatFeed} />
							</div>
							<TopRiskFactors {metrics} />
							<details class="group rounded-lg border bg-card">
								<summary
									class="text-muted-foreground hover:text-foreground cursor-pointer list-none px-4 py-3 text-sm font-medium select-none [&::-webkit-details-marker]:hidden"
								>
									<span class="inline-block transition-transform group-open:rotate-90">▸</span>
									Show signal breakdown chart
								</summary>
								<div class="border-t p-4">
									<SecuritySignalsPanel {metrics} />
								</div>
							</details>
						{/if}
					{:else if investigateView === 'authentication'}
						{#if investigateCounts.authentication === 0}
							{@render emptyState('No risky sign-ins. Everyone who has signed in looks normal so far.')}
						{:else}
							<div id="auth-metrics">
								<AuthMetricsPanel {authStats} />
							</div>
							<UserRiskProfilesPanel {userRiskProfiles} />
						{/if}
					{:else if investigateView === 'sessions_devices'}
						{#if investigateCounts.sessions_devices === 0}
							{@render emptyState('No flagged sessions. Active sessions all look normal.')}
						{:else}
							<div class="grid gap-6 lg:grid-cols-2">
								<SessionAnalyticsPanel {sessionAnalytics} />
								<TrustedDevicesList {devices} />
							</div>
							<div id="flagged-sessions">
								<FlaggedSessionsList {sessions} />
							</div>
						{/if}
					{:else if investigateView === 'ip_network'}
						{#if investigateCounts.ip_network === 0}
							{@render emptyState("No blocked IPs. Nothing's been bad enough to block yet.")}
						{:else}
							<div class="grid gap-6 lg:grid-cols-2">
								<div id="ip-intelligence">
									<IPIntelligencePanel {ipIntelligence} />
								</div>
								<div id="blocked-ips">
									<BlockedIPsList {blockedIPs} />
								</div>
							</div>
						{/if}
					{:else if investigateView === 'api_traffic'}
						{#if investigateCounts.api_traffic === 0}
							{@render emptyState("No API abuse detected. Nothing's hitting rate limits.")}
						{:else}
							<div class="grid gap-6 lg:grid-cols-2">
								<div id="rate-limit-stats">
									<RateLimitStatsPanel {rateLimitStats} />
								</div>
								<APISecurityPanel {apiSecurityStats} />
							</div>
						{/if}
					{/if}
				{:else if mode === 'trends'}
					<OverviewStats {metrics} {devices} />
					<div class="grid gap-6 lg:grid-cols-2">
						<TimeAnalysisPanel {timeAnalysis} />
						<HourlyActivityChart {metrics} />
					</div>
					<div class="grid gap-6 lg:grid-cols-2">
						<RiskDistributionChart {metrics} />
						<GeographicBreakdown {metrics} />
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<Card.Root class="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30">
			<Card.Content class="py-12">
				<div class="mx-auto max-w-xl text-center">
					<h3 class="text-emerald-900 dark:text-emerald-100 mb-2 text-xl font-semibold">
						Nothing to worry about yet.
					</h3>
					<p class="text-emerald-900/80 dark:text-emerald-100/80 mb-6 text-sm md:text-base">
						We haven't recorded any security events. That's a good thing — it just means nobody has
						signed in, signed up, or done anything unusual yet. Once they do, you'll see what's
						going on here.
					</p>
					<div class="flex flex-wrap justify-center gap-2">
						<Button href="/auth/sign-in" variant="outline">Try signing in</Button>
						<Button href="/auth/sign-up" variant="outline">Try signing up</Button>
						{#if dev}
							<Button href="/admin/security-test" variant="outline">Test scenarios</Button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
