<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="bg-background min-h-screen">
	<header class="border-b">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
			<div class="flex items-baseline gap-3">
				<a href="/consult" class="text-lg font-semibold">Consulting</a>
				<span class="text-muted-foreground text-sm">Langfell diagnostic workspace</span>
			</div>
			<div class="flex items-center gap-4 text-sm">
				<span class="text-muted-foreground">{data.user.email}</span>
				<a href="/app" class="underline underline-offset-4">Montsel app</a>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-6 py-8">
		{@render children()}
	</main>
</div>
