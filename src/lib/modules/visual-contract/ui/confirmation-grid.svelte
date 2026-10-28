<script lang="ts">
	/**
	 * All six choices together. Changing one pair reopens only that pair and
	 * returns here with the other five intact, so corrections never reset work.
	 */
	import { PencilIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { AXIS_KEYS, type CompleteChoices } from '../shared/types.js';
	import { getPair, resolveChoice } from '../shared/pairs.js';

	let {
		choices,
		editHref
	}: {
		choices: CompleteChoices;
		editHref: (axis: (typeof AXIS_KEYS)[number]) => string;
	} = $props();

	let editing = $state(false);

	const cards = $derived(
		AXIS_KEYS.map((axis) => {
			const pair = getPair(axis);
			const { chosen, other } = resolveChoice(axis, choices[axis]);
			return { axis, pair, chosen, other };
		})
	);
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each cards as card (card.axis)}
		<div class="flex flex-col gap-2 rounded-xl border p-5">
			<p class="text-muted-foreground text-xs">Pair {card.pair.index}</p>
			<p class="text-lg font-semibold">{card.chosen.word}</p>
			<p class="text-muted-foreground text-sm">{card.chosen.gloss}</p>
			<p class="text-muted-foreground mt-auto pt-2 text-xs">Instead of {card.other.word}</p>
			{#if editing}
				<Button variant="outline" size="sm" href={editHref(card.axis)} class="mt-2 self-start">
					<PencilIcon />
					Change {card.chosen.word}
				</Button>
			{/if}
		</div>
	{/each}
</div>

<div class="mt-4">
	<Button variant="ghost" size="sm" onclick={() => (editing = !editing)} aria-pressed={editing}>
		<PencilIcon />
		{editing ? 'Done changing' : 'Change a choice'}
	</Button>
</div>
