<script lang="ts">
	/** The review-and-use check. One scannable view, no extra wizard pages. */
	import { Button } from '$lib/components/ui/button';
	import ReviewUseGrid from './review-use-grid.svelte';
	import type { ReviewPrompt } from '../shared/generate.js';

	let {
		prompts,
		confirmHref,
		message = null
	}: {
		prompts: readonly ReviewPrompt[];
		confirmHref: string;
		message?: string | null;
	} = $props();
</script>

<div class="flex flex-col gap-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold">
			Can you explain and use these choices when design work is presented back to you?
		</h1>
		<p class="text-muted-foreground max-w-xl text-sm">
			This is the review guide you will get on your page. Read each one and check the words feel
			usable. If they do not, go back and change the choice.
		</p>
	</header>

	{#if message}
		<p class="border-destructive/40 text-destructive rounded-md border px-4 py-3 text-sm">
			{message}
		</p>
	{/if}

	<ReviewUseGrid {prompts} />

	<form method="POST" class="flex flex-wrap items-center gap-3">
		<Button type="submit">Generate my Visual Contract</Button>
		<Button variant="ghost" href={confirmHref}>Go back and revise</Button>
	</form>
</div>
