<!-- src/lib/components/errors/RouteError.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { House, RefreshCw, SearchX, TriangleAlert } from '@lucide/svelte';

	interface Props {
		homeHref?: string;
		homeLabel?: string;
	}

	let { homeHref = '/', homeLabel = 'Go home' }: Props = $props();

	const isNotFound = $derived(page.status === 404);
	const title = $derived(isNotFound ? 'Page not found' : 'Something went wrong');
	const detail = $derived(
		isNotFound
			? 'The page you are looking for could not be found. Check the URL and try again.'
			: 'Something went wrong while loading this page. The rest of the app is unaffected.'
	);

	async function retry() {
		await goto(page.url.pathname + page.url.search, { invalidateAll: true, replaceState: true });
	}
</script>

<svelte:head>
	<title>{page.status}: {page.error?.message ?? title}</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center">
	<Card.Root class="w-full max-w-md {isNotFound ? '' : 'border-destructive/20'}">
		<Card.Header class="pb-4 text-center">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-full {isNotFound
					? 'bg-muted'
					: 'bg-destructive/10'}"
			>
				{#if isNotFound}
					<SearchX class="text-muted-foreground h-8 w-8" />
				{:else}
					<TriangleAlert class="text-destructive h-8 w-8" />
				{/if}
			</div>
			<p
				class="mt-4 text-5xl font-bold tracking-tight {isNotFound
					? 'text-foreground'
					: 'text-destructive'}"
			>
				{page.status}
			</p>
			<Card.Title class="mt-2 text-xl">{title}</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-6">
			<p class="text-muted-foreground text-center text-sm">{detail}</p>

			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				{#if !isNotFound}
					<Button onclick={retry} variant="outline" class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4" />
						Try again
					</Button>
				{/if}
				<Button href={homeHref} class="flex items-center gap-2">
					<House class="h-4 w-4" />
					{homeLabel}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
