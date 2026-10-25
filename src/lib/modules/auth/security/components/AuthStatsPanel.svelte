<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { CheckCircle, XCircle, TrendingUp, Clock } from '@lucide/svelte';
	import type { AuthStats } from '../services/sdk.js';

	let { authStats = null }: { authStats: AuthStats | null } = $props();

	function formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	const successRateStatus = $derived(() => {
		if (!authStats) return 'operational';
		if (authStats.successRate >= 95) return 'operational';
		if (authStats.successRate >= 80) return 'degraded';
		return 'critical';
	});

	const statusMeta = {
		operational: { label: 'Healthy', badge: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
		degraded: { label: 'Warning', badge: 'border-amber-200 text-amber-800 bg-amber-50' },
		critical: { label: 'Critical', badge: 'border-red-200 text-red-800 bg-red-50' }
	};
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5" />
					Authentication Stats
				</Card.Title>
				<Card.Description>Login success and failure rates</Card.Description>
			</div>
			{#if authStats}
				{@const status = successRateStatus()}
				<Badge variant="outline" class={statusMeta[status].badge}>
					{statusMeta[status].label}
				</Badge>
			{/if}
		</div>
	</Card.Header>
	<Card.Content>
		{#if authStats}
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<CheckCircle class="h-5 w-5 text-green-500" />
						<span class="text-2xl font-bold text-green-600">{authStats.successCount}</span>
					</div>
					<p class="text-muted-foreground text-sm">Successful Logins</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<XCircle class="h-5 w-5 text-red-500" />
						<span class="text-2xl font-bold text-red-600">{authStats.failureCount}</span>
					</div>
					<p class="text-muted-foreground text-sm">Failed Attempts</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div
						class="text-2xl font-bold"
						class:text-green-600={authStats.successRate >= 95}
						class:text-amber-600={authStats.successRate >= 80 && authStats.successRate < 95}
						class:text-red-600={authStats.successRate < 80}
					>
						{authStats.successRate.toFixed(1)}%
					</div>
					<p class="text-muted-foreground text-sm">Success Rate</p>
				</div>
			</div>

			{#if authStats.recentFailures.length > 0}
				<div class="mt-4">
					<h4 class="text-muted-foreground mb-2 text-sm font-medium">Recent Failures</h4>
					<div class="space-y-2">
						{#each authStats.recentFailures as failure}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<div class="flex items-center gap-2">
									<XCircle class="h-4 w-4 text-red-500" />
									<code class="text-xs">{failure.ip}</code>
									<span class="text-muted-foreground">- {failure.reason}</span>
								</div>
								<span class="text-muted-foreground flex items-center gap-1 text-xs">
									<Clock class="h-3 w-3" />
									{formatTime(failure.timestamp)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<TrendingUp class="mb-2 h-8 w-8 opacity-50" />
				<p>No authentication data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
