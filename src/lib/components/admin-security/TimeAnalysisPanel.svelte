<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Clock, Calendar, TrendingUp } from '@lucide/svelte';
	import type { TimeAnalysis } from '#lib/auth/security/services/sdk.js';

	let { timeAnalysis = null }: { timeAnalysis: TimeAnalysis | null } = $props();

	const maxPeakAttacks = $derived(() => {
		if (!timeAnalysis?.peakAttackTimes) return 1;
		return Math.max(...timeAnalysis.peakAttackTimes.map((p) => p.attackCount), 1);
	});

	const maxDayEvents = $derived(() => {
		if (!timeAnalysis?.dayOfWeekPatterns) return 1;
		return Math.max(...timeAnalysis.dayOfWeekPatterns.map((d) => d.totalEvents), 1);
	});

	const maxHourlyRisk = $derived(() => {
		if (!timeAnalysis?.hourlyTrends) return 1;
		return Math.max(...timeAnalysis.hourlyTrends.map((h) => h.avgRisk), 1);
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Clock class="h-5 w-5" />
			When is activity spiking?
		</Card.Title>
		<Card.Description>Peak times, unusual hours, and trends over time.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if timeAnalysis}
			<!-- Peak Attack Times -->
			{#if timeAnalysis.peakAttackTimes.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">Peak Attack Hours</h4>
					<div class="flex h-16 items-end gap-1">
						{#each Array(24) as _, hour}
							{@const attackData = timeAnalysis.peakAttackTimes.find((p) => p.hour === hour)}
							{@const count = attackData?.attackCount ?? 0}
							{@const max = maxPeakAttacks()}
							{@const heightPercent = max > 0 ? (count / max) * 100 : 0}
							<div class="group relative flex flex-1 flex-col items-center">
								<div
									class="w-full rounded-t transition-all"
									class:bg-red-500={count > 0}
									class:bg-gray-200={count === 0}
									style="height: {Math.max(heightPercent, 4)}%"
									title="{hour}:00 - {count} attacks"
								></div>
								{#if hour % 6 === 0}
									<span class="text-muted-foreground mt-1 text-[0.6rem]">{hour}h</span>
								{/if}
							</div>
						{/each}
					</div>
					{#if timeAnalysis.peakAttackTimes[0]}
						<p class="text-muted-foreground mt-2 text-xs">
							Peak: {timeAnalysis.peakAttackTimes[0].hour}:00 with {timeAnalysis.peakAttackTimes[0]
								.attackCount} attacks
						</p>
					{/if}
				</div>
			{/if}

			<!-- Day of Week Patterns -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
					<Calendar class="h-4 w-4" />
					Weekly Pattern
				</h4>
				<div class="space-y-2">
					{#each timeAnalysis.dayOfWeekPatterns as day}
						{@const max = maxDayEvents()}
						{@const totalPercent = max > 0 ? (day.totalEvents / max) * 100 : 0}
						{@const blockedPercent =
							day.totalEvents > 0 ? (day.blockedEvents / day.totalEvents) * 100 : 0}
						<div class="flex items-center gap-3">
							<span class="text-muted-foreground w-12 text-xs">{day.day.slice(0, 3)}</span>
							<div class="relative h-4 flex-1 overflow-hidden rounded bg-gray-100">
								<div
									class="absolute top-0 left-0 h-full bg-blue-400"
									style="width: {totalPercent}%"
								></div>
								<div
									class="absolute top-0 left-0 h-full bg-red-500"
									style="width: {(blockedPercent * totalPercent) / 100}%"
								></div>
							</div>
							<div class="flex w-20 items-center justify-end gap-1 text-xs">
								<span>{day.totalEvents}</span>
								{#if day.blockedEvents > 0}
									<Badge variant="destructive" class="text-[0.6rem]">{day.blockedEvents}</Badge>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<div class="mt-2 flex items-center justify-center gap-4 text-xs">
					<span class="flex items-center gap-1"
						><span class="h-2 w-2 rounded bg-blue-400"></span> Total</span
					>
					<span class="flex items-center gap-1"
						><span class="h-2 w-2 rounded bg-red-500"></span> Blocked</span
					>
				</div>
			</div>

			<!-- Hourly Risk Trends -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
					<TrendingUp class="h-4 w-4" />
					Risk Level Trend (24h)
				</h4>
				<div class="flex h-12 items-end gap-px">
					{#each timeAnalysis.hourlyTrends as hour}
						{@const max = maxHourlyRisk()}
						{@const heightPercent = max > 0 ? (hour.avgRisk / max) * 100 : 0}
						<div
							class="flex-1 rounded-t transition-all"
							class:bg-green-400={hour.avgRisk < 30}
							class:bg-amber-400={hour.avgRisk >= 30 && hour.avgRisk < 60}
							class:bg-red-400={hour.avgRisk >= 60}
							style="height: {Math.max(heightPercent, 4)}%"
							title="{hour.hour}:00 - Avg risk: {hour.avgRisk}, Events: {hour.eventCount}"
						></div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Clock class="mb-2 h-8 w-8 opacity-50" />
				<p>No time analysis data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
