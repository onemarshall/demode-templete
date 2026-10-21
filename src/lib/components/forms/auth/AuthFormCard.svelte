<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		/** When true, removes the outer page-centering wrapper. Use inside modals. */
		bare?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		title,
		description,
		bare = false,
		class: className = '',
		children,
	}: Props = $props();
</script>

{#snippet card()}
	<Card.Root class="mx-auto w-full max-w-md {className}">
		<Card.Header>
			<Card.Title class="text-2xl">{title}</Card.Title>
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content class="space-y-4">
			{@render children()}
		</Card.Content>
	</Card.Root>
{/snippet}

{#if bare}
	{@render card()}
{:else}
	<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
		{@render card()}
	</div>
{/if}
