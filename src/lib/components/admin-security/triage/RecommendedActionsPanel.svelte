<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import QuickFiltersBar from './QuickFiltersBar.svelte';
	import type { ActionSource, ActionStatus, ActionsFilterState, RecommendedActionItem, Severity } from './types';

	let {
		items, filter, visibleItems, availableSources, availableStatuses,
		availableSeverities = ['critical', 'high', 'medium', 'low'],
		onFilterChange, onResetFilters, onPrimaryAction, coverageLabel = 'Based on the available security records.'
	}: {
		items: RecommendedActionItem[];
		filter: ActionsFilterState;
		visibleItems: RecommendedActionItem[];
		availableSources: readonly ActionSource[];
		availableStatuses: readonly ActionStatus[];
		availableSeverities?: readonly Severity[];
		onFilterChange: (next: ActionsFilterState) => void;
		onResetFilters: () => void;
		onPrimaryAction: (item: RecommendedActionItem) => void;
		coverageLabel?: string;
	} = $props();
	let showAll = $state(false);
	const displayedItems = $derived(showAll ? visibleItems : visibleItems.slice(0, 3));
	const filtersActive = $derived(filter.search !== '' || filter.severity !== 'all' || filter.source !== 'all' || filter.status !== 'all' || filter.newOnly);
</script>

<section id="recommended-actions" tabindex="-1" aria-label="What should I do next?">
	<Card.Root>
		<Card.Header>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<Card.Title class="text-muted-foreground text-sm">What should I do next?</Card.Title>
				<Badge variant="secondary">{items.length} {items.length === 1 ? 'review' : 'reviews'}</Badge>
			</div>
			<Card.Description>{coverageLabel}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if items.length === 0}
				<Alert.Root>
					<Alert.Title>No recommended reviews in the available records</Alert.Title>
					<Alert.Description>Check monitoring coverage below before drawing conclusions. New observations will appear here.</Alert.Description>
				</Alert.Root>
			{:else}
				<ol class="flex flex-col gap-4">
					{#each displayedItems as item (item.id)}
						<li class="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
							<div class="flex min-w-0 flex-col gap-2">
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant={item.severity === 'critical' ? 'destructive' : item.severity === 'high' ? 'warning' : 'secondary'}>{item.severity}</Badge>
									<span class="text-muted-foreground text-sm">{item.sourceLabel}</span>
								</div>
								<p class="font-medium break-words">{item.title}</p>
								<p class="text-muted-foreground text-sm break-words">{item.reason}</p>
								<p class="text-muted-foreground text-xs">Observed {new Date(item.detectedAt).toLocaleString()}</p>
							</div>
							<Button size="sm" onclick={() => onPrimaryAction(item)}>Review evidence</Button>
						</li>
					{/each}
				</ol>
				{#if visibleItems.length === 0}
					<Alert.Root>
						<Alert.Title>No reviews match these filters</Alert.Title>
						<Alert.Description>Your other reviews are still available. Reset filters to see them.</Alert.Description>
					</Alert.Root>
					<Button variant="outline" onclick={onResetFilters}>Reset filters</Button>
				{:else if visibleItems.length > 3}
					<Button variant="outline" onclick={() => (showAll = !showAll)}>{showAll ? 'Show the first three' : `View all ${visibleItems.length} reviews`}</Button>
				{/if}
				<details open={filtersActive}>
					<summary class="cursor-pointer py-2 text-sm">Filter reviews{filtersActive ? ' (active)' : ''}</summary>
					<QuickFiltersBar value={filter} {availableSeverities} {availableSources} {availableStatuses} onChange={onFilterChange} onReset={onResetFilters} />
				</details>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
