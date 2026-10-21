<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { ShieldOff, AlertTriangle, Clock } from '@lucide/svelte';
	import type { RateLimitStats } from '#lib/auth/security/services/sdk.js';

	let { rateLimitStats = null }: { rateLimitStats: RateLimitStats | null } = $props();

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const maxHourlyBlocked = $derived(() => {
		if (!rateLimitStats?.hourlyBlocked) return 1;
		return Math.max(...rateLimitStats.hourlyBlocked.map((h) => h.count), 1);
	});
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<ShieldOff class="h-5 w-5" />
					Is anyone hammering us?
				</Card.Title>
				<Card.Description>Requests we've throttled or blocked for going too fast.</Card.Description>
			</div>
			{#if rateLimitStats}
				<Badge variant={rateLimitStats.totalBlocked > 10 ? 'destructive' : 'secondary'}>
					{rateLimitStats.totalBlocked} blocked
				</Badge>
			{/if}
		</div>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if rateLimitStats}
			<!-- Hourly Blocked Chart -->
			<div>
				<h4 class="mb-3 text-sm font-medium">Blocked Requests (24h)</h4>
				<div class="flex h-20 items-end gap-1">
					{#each rateLimitStats.hourlyBlocked as hourData}
						{@const max = maxHourlyBlocked()}
						{@const heightPercent = max > 0 ? (hourData.count / max) * 100 : 0}
						<div class="group relative flex flex-1 flex-col items-center">
							<div
								class="w-full rounded-t bg-red-500 transition-all hover:bg-red-600"
								style="height: {Math.max(heightPercent, 4)}%"
								title="{hourData.hour}:00 - {hourData.count} blocked"
							></div>
							{#if hourData.hour % 6 === 0}
								<span class="text-muted-foreground mt-1 text-[0.6rem]">{hourData.hour}h</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Top Rate-Limited IPs -->
			{#if rateLimitStats.topRateLimitedIPs.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">Top Rate-Limited IPs</h4>
					<div class="space-y-2">
						{#each rateLimitStats.topRateLimitedIPs.slice(0, 5) as ip}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<div class="flex items-center gap-2">
									<code class="text-xs">{ip.ip}</code>
									<span class="text-muted-foreground text-xs">{formatTimeAgo(ip.lastBlocked)}</span>
								</div>
								<Badge variant="destructive">{ip.blockedCount} blocked</Badge>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Threshold Breaches -->
			{#if rateLimitStats.thresholdBreaches.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<AlertTriangle class="h-4 w-4 text-amber-500" />
						Endpoint Threshold Breaches
					</h4>
					<div class="space-y-2">
						{#each rateLimitStats.thresholdBreaches.slice(0, 5) as breach}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<div class="flex items-center gap-2">
									<code class="text-xs">{breach.endpoint}</code>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-muted-foreground text-xs"
										>{formatTimeAgo(breach.lastBreach)}</span
									>
									<Badge variant="outline">{breach.breachCount}x</Badge>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<ShieldOff class="mb-2 h-8 w-8 opacity-50" />
				<p>No rate limiting data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
