<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { helpTopics } from '$lib/app/navigation/config';
</script>

<svelte:head><title>Help — Montsel</title></svelte:head>

<header>
	<h1 class="text-3xl font-semibold">Help</h1>
	<p class="text-muted-foreground mt-2">
		How Montsel fits together, and where to find your work.
	</p>
</header>

<ol class="grid gap-6 md:grid-cols-3">
	{#each helpTopics as topic, index (topic.title)}
		<li>
			<Card.Root class="h-full">
				<Card.Header class="gap-3">
					<span
						class="border-foreground/20 flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
					>
						{index + 1}
					</span>
					<div class="flex flex-col gap-1">
						<Card.Title class="text-base">{topic.title}</Card.Title>
						<Card.Description>{topic.body}</Card.Description>
					</div>
				</Card.Header>
			</Card.Root>
		</li>
	{/each}
</ol>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">Where things live</Card.Title>
		<Card.Description>
			Diagnostic and Strategy each have their own landing page. Tools holds the standalone
			products. Documents collects every output for the active brand.
		</Card.Description>
	</Card.Header>
	<Card.Footer class="flex-wrap gap-2">
		<Button variant="outline" size="sm" href="/app/diagnostic">Diagnostic</Button>
		<Button variant="outline" size="sm" href="/app/strategy">Strategy</Button>
		<Button variant="outline" size="sm" href="/app/tools">Tools</Button>
		<Button variant="outline" size="sm" href="/app/documents">Documents</Button>
	</Card.Footer>
</Card.Root>
