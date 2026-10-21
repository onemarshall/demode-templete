<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Clock, Globe } from '@lucide/svelte';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';

	let { metrics }: { metrics: DashboardMetrics } = $props();

	// Get max hourly count for chart scaling
	const maxHourlyCount = $derived(() => {
		if (!metrics?.hourlyActivity) return 1;
		return Math.max(...metrics.hourlyActivity.map((h) => h.sessions ?? 0), 1);
	});

	function formatHour(hour: number): string {
		return `${hour.toString().padStart(2, '0')}:00`;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Clock class="h-5 w-5" />
			Hourly Activity
		</Card.Title>
		<Card.Description>Session activity distribution over 24 hours</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if metrics?.hourlyActivity && metrics.hourlyActivity.some((h) => (h.sessions ?? 0) > 0)}
			<div class="flex h-32 items-end gap-1">
				{#each metrics.hourlyActivity as hour (hour.hour)}
					{@const maxCount = maxHourlyCount()}
					{@const heightPercent = maxCount > 0 ? ((hour.sessions ?? 0) / maxCount) * 100 : 0}
					<div class="group relative flex flex-1 flex-col items-center">
						<div
							class="w-full rounded-t transition-all {hour.averageRisk >= 50
								? 'bg-red-500'
								: hour.averageRisk >= 25
									? 'bg-yellow-500'
									: 'bg-green-500'} hover:opacity-80"
							style="height: {Math.max(heightPercent, 2)}%"
							title="{formatHour(
								Number(hour.hour)
							)}: {hour.sessions} sessions, avg risk: {hour.averageRisk}"
						></div>
						{#if Number(hour.hour) % 6 === 0}
							<span class="text-muted-foreground mt-1 text-[0.6rem]">{hour.hour}h</span>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-3 flex items-center justify-center gap-4 text-xs">
				<div class="flex items-center gap-1">
					<div class="h-2 w-2 rounded-full bg-green-500"></div>
					<span>Low Risk</span>
				</div>
				<div class="flex items-center gap-1">
					<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
					<span>Medium</span>
				</div>
				<div class="flex items-center gap-1">
					<div class="h-2 w-2 rounded-full bg-red-500"></div>
					<span>High</span>
				</div>
			</div>
		{:else}
			<div class="text-muted-foreground flex h-32 items-center justify-center">
				<p class="text-sm">No activity data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
