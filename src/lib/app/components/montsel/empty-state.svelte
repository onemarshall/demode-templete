<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRightIcon } from '@lucide/svelte';

	let {
		title,
		description,
		action
	}: {
		title: string;
		description: string;
		action?: { label: string; href: string };
	} = $props();
</script>

<section
	class="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center"
>
	<h2 class="text-lg font-semibold">{title}</h2>
	<p class="text-muted-foreground max-w-md text-sm">{description}</p>
	{#if action}
		<Button href={action.href}>
			{action.label}
			<ArrowRightIcon />
		</Button>
	{/if}
</section>
