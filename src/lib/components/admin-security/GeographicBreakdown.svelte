<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { MapPin, Globe } from '@lucide/svelte';
	import type { DashboardMetrics } from '$lib/auth/security/types';

	let { metrics }: { metrics: DashboardMetrics } = $props();

	function getCountryFlag(countryCode: string): string {
		if (!countryCode || countryCode === 'XX') return '🌍';
		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map((char) => 127397 + char.charCodeAt(0));
		return String.fromCodePoint(...codePoints);
	}

	function getRiskBadgeVariant(score: number): 'low' | 'medium' | 'high' {
		if (score >= 50) return 'high';
		if (score >= 25) return 'medium';
		return 'low';
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<MapPin class="h-5 w-5" />
			Where in the world is activity?
		</Card.Title>
		<Card.Description>Top countries by recent session count.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if metrics?.geographicBreakdown && metrics.geographicBreakdown.length > 0}
			<div class="space-y-2">
				{#each metrics.geographicBreakdown as geo}
					<div class="flex items-center justify-between rounded-lg border p-2">
						<div class="flex items-center gap-2">
							<span class="text-lg">{getCountryFlag(geo.countryCode ?? '')}</span>
							<span class="text-sm font-medium">{geo.country}</span>
						</div>
						<div class="flex items-center gap-2">
							<Badge variant={getRiskBadgeVariant(geo.averageRisk ?? 0)} class="text-xs">
								Avg: {geo.averageRisk ?? 0}
							</Badge>
							<span class="text-muted-foreground text-sm">{geo.sessions ?? 0} sessions</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground flex h-32 items-center justify-center">
				<Globe class="mr-2 h-8 w-8 opacity-50" />
				<p class="text-sm">No geographic data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
