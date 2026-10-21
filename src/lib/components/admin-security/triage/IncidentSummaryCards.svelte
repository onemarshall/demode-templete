<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { AlertTriangle, ArrowRight, Clock3, Radar } from '@lucide/svelte';
	import type { SummaryCard } from './types';

	let {
		cards,
		onCardCta
	}: { cards: [SummaryCard, SummaryCard, SummaryCard]; onCardCta: (card: SummaryCard) => void } =
		$props();

	const toneBySeverity = {
		critical: 'destructive',
		high: 'high',
		medium: 'medium',
		low: 'low'
	} as const;
</script>

<div class="grid gap-4 md:grid-cols-3">
	{#each cards as card}
		<Card.Root>
			<Card.Header class="space-y-2 pb-3">
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-2">
						{#if card.id === 'now'}
							<AlertTriangle class="text-muted-foreground h-4 w-4" />
						{:else if card.id === 'next'}
							<ArrowRight class="text-muted-foreground h-4 w-4" />
						{:else}
							<Radar class="text-muted-foreground h-4 w-4" />
						{/if}
						<Card.Title class="text-base">{card.title}</Card.Title>
					</div>
					<Badge variant={toneBySeverity[card.severity]}>{card.count}</Badge>
				</div>
				<Card.Description>{card.subtitle}</Card.Description>
			</Card.Header>
			<Card.Content class="pt-0">
				<Button variant="outline" size="sm" onclick={() => onCardCta(card)} class="w-full gap-2">
					<Clock3 class="h-4 w-4" />
					{card.ctaLabel}
				</Button>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
