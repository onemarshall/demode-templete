<script lang="ts">
	/**
	 * One selection screen. Shared by the public and workspace trees; the route
	 * supplies only paths and data, so the two cannot drift apart.
	 */
	import { ArrowLeftIcon, ArrowRightIcon } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import ChoiceProgress from './choice-progress.svelte';
	import PairChoiceCard from './pair-choice-card.svelte';
	import type { ChoiceValue, PairDefinition } from '../shared/types.js';

	let {
		pair,
		index,
		total,
		selected = null,
		returnTo = false,
		backHref,
		message = null
	}: {
		pair: PairDefinition;
		index: number;
		total: number;
		selected?: ChoiceValue | null;
		returnTo?: boolean;
		backHref: string;
		message?: string | null;
	} = $props();

	let value = $state<ChoiceValue | null>(untrack(() => selected));
</script>

<div class="flex flex-col gap-8">
	<ChoiceProgress current={index} total={total} />

	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold">Which direction matters more for this project?</h1>
		<p class="text-muted-foreground max-w-xl text-sm">
			You can use both. Choose the quality that should lead when the designer has to make a
			trade-off.
		</p>
	</header>

	{#if message}
		<p class="border-destructive/40 text-destructive rounded-md border px-4 py-3 text-sm">
			{message}
		</p>
	{/if}

	<form method="POST" class="flex flex-col gap-6">
		<PairChoiceCard {pair} bind:value />

		{#if returnTo}
			<input type="hidden" name="return" value="confirm" />
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<Button type="submit" disabled={!value}>
				{returnTo ? 'Save and return' : index === total ? 'Review your choices' : 'Continue'}
				<ArrowRightIcon />
			</Button>
			<Button variant="ghost" href={backHref}>
				<ArrowLeftIcon />
				Back
			</Button>
		</div>
	</form>
</div>
