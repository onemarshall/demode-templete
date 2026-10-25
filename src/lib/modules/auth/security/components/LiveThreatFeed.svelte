<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Shield, Wifi, WifiOff, RefreshCw, AlertTriangle, Ban, Activity } from '@lucide/svelte';
	import { onMount, onDestroy } from 'svelte';
	import { logger } from '#lib/platform/logger.js';

	interface LiveThreat {
		id: string;
		type: 'blocked_ip' | 'attack_pattern' | 'security_event' | 'brute_force';
		title: string;
		description: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		timestamp: number;
		source?: string;
		target?: string;
		status: 'active' | 'resolved';
	}

	let { autoRefresh = true }: { autoRefresh?: boolean } = $props();

	let threats = $state<LiveThreat[]>([]);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let isConnected = $state(false);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	type HealthStatus = 'operational' | 'degraded' | 'critical';

	const statusMeta: Record<HealthStatus, { label: string; badge: string }> = {
		operational: {
			label: 'Operational',
			badge: 'border-emerald-200 text-emerald-700 bg-emerald-50'
		},
		degraded: {
			label: 'Degraded',
			badge: 'border-amber-200 text-amber-800 bg-amber-50'
		},
		critical: {
			label: 'Critical',
			badge: 'border-red-200 text-red-800 bg-red-50'
		}
	};

	// Mock data for development
	const mockThreats: LiveThreat[] = [
		{
			id: '1',
			type: 'blocked_ip',
			title: 'IP Address Blocked',
			description: '192.168.1.100 blocked due to suspicious activity',
			severity: 'high',
			timestamp: Date.now() - 5000,
			source: '192.168.1.100',
			status: 'active'
		},
		{
			id: '2',
			type: 'attack_pattern',
			title: 'SQL Injection Attempt',
			description: 'SQL injection pattern detected in request parameters',
			severity: 'critical',
			timestamp: Date.now() - 120000,
			target: '/api/auth/login',
			status: 'active'
		},
		{
			id: '3',
			type: 'brute_force',
			title: 'Brute Force Attack',
			description: 'Multiple failed login attempts detected',
			severity: 'medium',
			timestamp: Date.now() - 300000,
			source: '10.0.0.50',
			status: 'resolved'
		}
	];

	function getThreatIcon(type: string) {
		switch (type) {
			case 'blocked_ip':
				return Ban;
			case 'attack_pattern':
				return AlertTriangle;
			case 'brute_force':
				return Activity;
			default:
				return Shield;
		}
	}

	function statusFromSeverity(severity: LiveThreat['severity']): HealthStatus {
		switch (severity) {
			case 'critical':
			case 'high':
				return 'critical';
			case 'medium':
				return 'degraded';
			default:
				return 'operational';
		}
	}

	function formatTimestamp(ts: number): string {
		const now = Date.now();
		const diff = now - ts;

		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return new Date(ts).toLocaleDateString();
	}

	async function fetchThreats() {
		try {
			isRefreshing = true;

			const response = await fetch('/api/live-threats?limit=10');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (result.success) {
				threats = result.data.threats;
				isConnected = true;
			} else {
				throw new Error('API returned failure');
			}
		} catch (error) {
			logger.error('Failed to fetch threats:', error);
			isConnected = false;

			// Fallback to mock data if API fails
			const fallbackThreats = mockThreats.map((threat) => ({
				...threat,
				timestamp: Date.now() - Math.random() * 600000
			}));
			threats = fallbackThreats.sort((a, b) => b.timestamp - a.timestamp);
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	function startAutoRefresh() {
		if (autoRefresh && !refreshInterval) {
			refreshInterval = setInterval(fetchThreats, 30000); // Refresh every 30 seconds
		}
	}

	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	const panelStatus = $derived((): HealthStatus => {
		if (!isConnected) return 'critical';
		const active = threats.filter((t) => t.status === 'active');
		if (active.some((t) => t.severity === 'critical' || t.severity === 'high')) return 'critical';
		if (active.length > 0) return 'degraded';
		return 'operational';
	});

	onMount(async () => {
		await fetchThreats();
		startAutoRefresh();
	});

	onDestroy(() => {
		stopAutoRefresh();
	});
</script>

<Card.Root class="bg-card border shadow-md">
	<Card.Header class="flex flex-col gap-3">
		<div class="flex w-full items-center justify-between gap-4">
			<div>
				<Card.Title class="flex items-center gap-2 text-lg">
					{#if isConnected}
						<Wifi class="h-5 w-5 text-emerald-600" />
					{:else}
						<WifiOff class="h-5 w-5 text-red-600" />
					{/if}
					Live Threat Feed
				</Card.Title>
				<Card.Description>Real-time security threats and attack patterns</Card.Description>
			</div>

			<Badge variant="secondary" class={`capitalize ${statusMeta[panelStatus()]?.badge ?? ''}`}>
				{statusMeta[panelStatus()]?.label ?? panelStatus()}
			</Badge>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={fetchThreats}
				disabled={isRefreshing}
				class="gap-1"
			>
				{#if isRefreshing}
					<RefreshCw class="h-3 w-3 animate-spin" />
				{:else}
					<RefreshCw class="h-3 w-3" />
				{/if}
				Refresh
			</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if isLoading}
			<div class="space-y-3">
				{#each Array(3) as _}
					<div class="bg-muted/30 animate-pulse rounded-lg border p-4">
						<div class="flex items-start justify-between">
							<div class="space-y-2">
								<div class="bg-muted h-4 w-32 rounded"></div>
								<div class="bg-muted h-3 w-48 rounded"></div>
							</div>
							<div class="bg-muted h-6 w-16 rounded"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if threats.length === 0}
			<div class="bg-muted/30 text-muted-foreground rounded-lg border p-8 text-center">
				<Shield class="mx-auto h-12 w-12 opacity-50" />
				<p class="mt-2 text-sm font-medium">No active threats detected</p>
				<p class="text-xs">Your security systems are operating normally</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each threats as threat (threat.id)}
					{@const ThreatIcon = getThreatIcon(threat.type)}
					<div class="bg-muted/30 rounded-lg border p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-3">
								<ThreatIcon class="text-muted-foreground mt-1 h-4 w-4" />
								<div>
									<p class="text-muted-foreground text-xs tracking-wide uppercase">{threat.type}</p>
									<p class="mt-1 text-sm font-semibold">{threat.title}</p>
									<p class="text-muted-foreground mt-1 text-xs">{threat.description}</p>
								</div>
							</div>

							<div class="flex flex-col items-end gap-2">
								<Badge
									variant="secondary"
									class={`capitalize ${statusMeta[statusFromSeverity(threat.severity)]?.badge ?? ''}`}
								>
									{threat.severity}
								</Badge>

								{#if threat.status === 'active'}
									<Badge variant="secondary" class="border-amber-200 bg-amber-50 text-amber-800">
										Active
									</Badge>
								{:else}
									<Badge variant="secondary" class="border-muted text-muted-foreground bg-muted/10">
										Resolved
									</Badge>
								{/if}

								<span class="text-muted-foreground text-xs"
									>{formatTimestamp(threat.timestamp)}</span
								>
							</div>
						</div>

						{#if threat.source || threat.target}
							<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
								{#if threat.source}
									<div class="text-muted-foreground">Source</div>
									<div class="text-right font-medium">{threat.source}</div>
								{/if}
								{#if threat.target}
									<div class="text-muted-foreground">Target</div>
									<div class="text-right font-medium">{threat.target}</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
