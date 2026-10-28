<script lang="ts">
	/** All six choices together, with single-pair editing. */
	import { Button } from '$lib/components/ui/button';
	import ConfirmationGrid from './confirmation-grid.svelte';
	import { getPair } from '../shared/pairs.js';
	import type { CompleteChoices } from '../shared/types.js';

	let {
		choices,
		base,
		draftId,
		message = null
	}: {
		choices: CompleteChoices;
		base: string;
		draftId: string;
		message?: string | null;
	} = $props();

	const editHref = (axis: Parameters<typeof getPair>[0]) =>
		`${base}/${draftId}/choose/${getPair(axis).index}?return=confirm`;
</script>

<div class="flex flex-col gap-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold">
			Is this the direction you want your designer to work toward?
		</h1>
		<p class="text-muted-foreground max-w-xl text-sm">
			These are conditional priorities, not a design specification. Each one says which quality
			should lead if the designer has to trade one against the other.
		</p>
	</header>

	{#if message}
		<p class="border-destructive/40 text-destructive rounded-md border px-4 py-3 text-sm">
			{message}
		</p>
	{/if}

	<ConfirmationGrid {choices} {editHref} />

	<form method="POST" class="flex flex-wrap items-center gap-3">
		<Button type="submit">Yes, this is right</Button>
	</form>
</div>
