<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, RefreshCcw } from '@lucide/svelte';
	import type { IncidentCounts } from './types';

	let {
		counts,
		lastRefreshLabel,
		isRefreshing = false,
		onRefresh,
		onReviewCritical
	}: {
		counts: IncidentCounts;
		lastRefreshLabel: string;
		isRefreshing?: boolean;
		onRefresh: () => Promise<void> | void;
		onReviewCritical: () => void;
	} = $props();
</script>

<Card.Root>
	<Card.Content class="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
		<div class="space-y-2">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="destructive">Critical: {counts.critical}</Badge>
				<Badge variant="high">High: {counts.high}</Badge>
				<Badge variant="medium">New (15m): {counts.newLast15m}</Badge>
			</div>
			<p class="text-muted-foreground text-sm">Last refresh: {lastRefreshLabel}</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				variant="destructive"
				size="sm"
				onclick={onReviewCritical}
				disabled={counts.critical === 0}
				class="gap-2"
			>
				<AlertTriangle class="h-4 w-4" />
				Review Critical Alerts
			</Button>
			<Button variant="outline" size="sm" onclick={onRefresh} disabled={isRefreshing} class="gap-2">
				<RefreshCcw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
				{isRefreshing ? 'Refreshing...' : 'Refresh'}
			</Button>
		</div>
	</Card.Content>
</Card.Root>
