<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import QuickFiltersBar from './QuickFiltersBar.svelte';
	import type {
		ActionSource,
		ActionStatus,
		ActionsFilterState,
		RecommendedActionItem,
		Severity
	} from './types';

	let {
		title = 'Recommended Actions',
		items,
		filter,
		visibleItems,
		availableSeverities = ['critical', 'high', 'medium', 'low'],
		availableSources,
		availableStatuses,
		isLoading = false,
		error = null,
		onFilterChange,
		onResetFilters,
		onPrimaryAction,
		onOpenDetails,
		onAcknowledge
	}: {
		title?: string;
		items: RecommendedActionItem[];
		filter: ActionsFilterState;
		visibleItems: RecommendedActionItem[];
		availableSeverities?: readonly Severity[];
		availableSources: readonly ActionSource[];
		availableStatuses: readonly ActionStatus[];
		isLoading?: boolean;
		error?: string | null;
		onFilterChange: (next: ActionsFilterState) => void;
		onResetFilters: () => void;
		onPrimaryAction: (item: RecommendedActionItem) => void;
		onOpenDetails: (item: RecommendedActionItem) => void;
		onAcknowledge: (item: RecommendedActionItem) => void;
	} = $props();

	const severityVariant: Record<Severity, 'destructive' | 'high' | 'medium' | 'low'> = {
		critical: 'destructive',
		high: 'high',
		medium: 'medium',
		low: 'low'
	};

	function formatRelativeTime(timestamp: number): string {
		const ms = Date.now() - timestamp;
		const minutes = Math.max(Math.floor(ms / 60000), 0);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
</script>

<section id="recommended-actions" class="space-y-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>{title}</Card.Title>
			<Card.Description>
				{visibleItems.length} of {items.length} action items visible
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<QuickFiltersBar
				value={filter}
				{availableSeverities}
				{availableSources}
				{availableStatuses}
				onChange={onFilterChange}
				onReset={onResetFilters}
			/>
		</Card.Content>
	</Card.Root>

	{#if error}
		<Card.Root class="border-destructive">
			<Card.Content class="pt-6 text-sm text-red-600">{error}</Card.Content>
		</Card.Root>
	{:else if isLoading}
		<Card.Root>
			<Card.Content class="space-y-3 pt-6">
				<div class="bg-muted h-12 animate-pulse rounded-md"></div>
				<div class="bg-muted h-12 animate-pulse rounded-md"></div>
				<div class="bg-muted h-12 animate-pulse rounded-md"></div>
			</Card.Content>
		</Card.Root>
	{:else if visibleItems.length === 0}
		<Card.Root>
			<Card.Content class="pt-6 text-sm">
				<p class="font-medium">No actions match your current filters.</p>
				<p class="text-muted-foreground">
					Try resetting filters or widening severity/source scope.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="space-y-3 pt-6">
				{#each visibleItems as item}
					<div class="rounded-lg border p-3">
						<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div class="space-y-1">
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant={severityVariant[item.severity]}>{item.severity}</Badge>
									<Badge variant="outline">{item.sourceLabel}</Badge>
									<Badge variant="outline">{item.status.replaceAll('_', ' ')}</Badge>
								</div>
								<p class="font-medium">{item.title}</p>
								<p class="text-muted-foreground text-sm">{item.reason}</p>
								<p class="text-muted-foreground text-xs">
									Detected {formatRelativeTime(item.detectedAt)}
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<Button size="sm" onclick={() => onPrimaryAction(item)}
									>{item.primaryActionLabel}</Button
								>
								<Button size="sm" variant="outline" onclick={() => onOpenDetails(item)}>
									{item.detailsLabel ?? 'Details'}
								</Button>
								{#if item.status === 'new'}
									<Button size="sm" variant="ghost" onclick={() => onAcknowledge(item)}>
										Acknowledge
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</section>
