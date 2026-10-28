<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Visual Contract — Montsel</title></svelte:head>

<div class="flex max-w-2xl flex-col gap-6">
	<h1 class="text-3xl font-semibold">Visual Contract</h1>
	<p class="text-muted-foreground">
		Choose six visual priorities for your project. Get a shareable brief and design review guide.
	</p>

	{#if form?.message}
		<p class="border-destructive/40 text-destructive rounded-md border px-4 py-3 text-sm">
			{form.message}
		</p>
	{/if}

	<form method="POST">
		<Button type="submit" size="lg">Start Visual Contract</Button>
	</form>

	<p class="text-muted-foreground text-sm">
		Free. You do not need an account or an email address to start, and the finished page can be
		opened from its link without either.
	</p>

	<ol class="text-muted-foreground flex flex-col gap-2 text-sm">
		<li>1. Six pairs of qualities. You choose which one leads.</li>
		<li>2. Check all six together, then check you could explain them.</li>
		<li>3. Get one page: the brief for your designer, and your review guide.</li>
	</ol>
</div>
