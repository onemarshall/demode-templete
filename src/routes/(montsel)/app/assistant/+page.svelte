<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { SparklesIcon } from '@lucide/svelte';
</script>

<svelte:head><title>AI Assistant — Montsel</title></svelte:head>

<header>
	<p class="text-muted-foreground text-sm">AI Assistant</p>
	<h1 class="mt-1 text-3xl font-semibold">The assistant is not open yet</h1>
	<p class="text-muted-foreground mt-2 max-w-2xl">
		Montsel's assistant is being designed. Its conversation history, tool permissions and
		retrieval scope need their own specification before it can be used, so this page does not
		pretend to be a working chat.
	</p>
</header>

<Card.Root>
	<Card.Header class="gap-3">
		<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
			<SparklesIcon class="size-5" />
		</div>
		<div class="flex flex-col gap-1">
			<Card.Title>What it will do</Card.Title>
			<Card.Description>
				Explain parts of the product, help you find your way, and answer questions about your own
				authorised work in the active brand.
			</Card.Description>
		</div>
	</Card.Header>
	<Card.Content>
		<p class="text-muted-foreground text-sm">
			It will not approve decisions, change documents, run assessments or reach products you do
			not have access to.
		</p>
	</Card.Content>
	<Card.Footer class="justify-start">
		<Button variant="outline" href="/app/help">Read the help topics</Button>
	</Card.Footer>
</Card.Root>
