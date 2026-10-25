<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { ArrowLeft } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		description?: string;
		backHref?: string;
		actions?: Snippet;
	};

	let { title, description, backHref, actions }: Props = $props();
</script>

<div class="flex items-start justify-between gap-4">
	<div class="flex items-center gap-2">
		{#if backHref}
			<Button variant="ghost" size="icon" href={backHref}>
				<ArrowLeft class="h-4 w-4" />
				<span class="sr-only">Back</span>
			</Button>
		{/if}
		<div class="space-y-1">
			<h1 class="text-2xl font-bold">{title}</h1>
			{#if description}
				<p class="text-muted-foreground text-sm">{description}</p>
			{/if}
		</div>
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
