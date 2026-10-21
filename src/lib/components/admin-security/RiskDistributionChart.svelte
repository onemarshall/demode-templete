<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Activity } from '@lucide/svelte';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';

	let { metrics }: { metrics: DashboardMetrics } = $props();

	// Calculate risk percentages
	const riskPercentages = $derived(() => {
		const low = metrics?.riskDistribution?.low ?? 0;
		const medium = metrics?.riskDistribution?.medium ?? 0;
		const high = metrics?.riskDistribution?.high ?? 0;
		const critical = metrics?.riskDistribution?.critical ?? 0;

		const total = low + medium + high + critical;

		if (total === 0) return { low: 0, medium: 0, high: 0, critical: 0 };

		return {
			low: Math.round((low / total) * 100),
			medium: Math.round((medium / total) * 100),
			high: Math.round((high / total) * 100),
			critical: Math.round((critical / total) * 100)
		};
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Activity class="h-5 w-5" />
			Risk Distribution
		</Card.Title>
		<Card.Description>
			Breakdown of session risk levels across all analyzed sessions
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		{@const percents = riskPercentages()}

		<!-- Low Risk -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
					<span class="text-sm">Low Risk (0-3)</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{metrics?.riskDistribution?.low ?? 0}</span>
					<span class="text-muted-foreground text-xs">({percents.low}%)</span>
				</div>
			</div>
			<div class="bg-muted h-2 w-full rounded-full">
				<div class="h-2 rounded-full bg-green-500" style="width: {percents.low}%"></div>
			</div>
		</div>

		<!-- Medium Risk -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
					<span class="text-sm">Medium Risk (4-6)</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{metrics?.riskDistribution?.medium ?? 0}</span>
					<span class="text-muted-foreground text-xs">({percents.medium}%)</span>
				</div>
			</div>
			<div class="bg-muted h-2 w-full rounded-full">
				<div class="h-2 rounded-full bg-yellow-500" style="width: {percents.medium}%"></div>
			</div>
		</div>

		<!-- High Risk -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-orange-500"></div>
					<span class="text-sm">High Risk (7-8)</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{metrics?.riskDistribution?.high ?? 0}</span>
					<span class="text-muted-foreground text-xs">({percents.high}%)</span>
				</div>
			</div>
			<div class="bg-muted h-2 w-full rounded-full">
				<div class="h-2 rounded-full bg-orange-500" style="width: {percents.high}%"></div>
			</div>
		</div>

		<!-- Critical Risk -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-red-500"></div>
					<span class="text-sm">Critical Risk (9+)</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{metrics?.riskDistribution?.critical ?? 0}</span>
					<span class="text-muted-foreground text-xs">({percents.critical}%)</span>
				</div>
			</div>
			<div class="bg-muted h-2 w-full rounded-full">
				<div class="h-2 rounded-full bg-red-500" style="width: {percents.critical}%"></div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
