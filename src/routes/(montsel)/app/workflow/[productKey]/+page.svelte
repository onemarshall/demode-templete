<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.product.name} — Montsel</title></svelte:head>

<header>
	<p class="text-muted-foreground text-sm">{data.product.name}</p>
	<h1 class="mt-1 text-3xl font-semibold">This workflow is not open yet</h1>
	<p class="text-muted-foreground mt-2 max-w-2xl">
		You have access to {data.product.name}, but its working screens are still being built. This
		page will become the start of the assessment when the workflow is released.
	</p>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">What you can do now</Card.Title>
		<Card.Description>{data.product.description}</Card.Description>
	</Card.Header>
	<Card.Footer class="flex-wrap gap-2">
		<Button variant="outline" href={data.product.route}>Back to {data.product.name}</Button>
		<Button variant="outline" href="/app/documents">View documents</Button>
	</Card.Footer>
</Card.Root>
