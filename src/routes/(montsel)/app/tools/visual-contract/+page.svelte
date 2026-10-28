<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BookOpenIcon, PlusIcon } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ShareButton from '$lib/app/components/montsel/share-button.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();

	const entry = $derived(data.entry);
	const hasHistory = $derived(data.contracts.length > 0 || data.drafts.length > 0);

	const HOW_IT_WORKS = [
		'Make six project-level visual choices.',
		'Review the choices you have made.',
		'Publish one shareable page with a Visual Contract Brief and an Evaluation Companion.'
	];
</script>

<svelte:head><title>Visual Contract — Montsel</title></svelte:head>

<header class="flex flex-wrap items-start justify-between gap-4">
	<div class="max-w-2xl">
		<p class="text-muted-foreground text-sm">Tools / Visual Contract</p>
		<h1 class="mt-1 text-3xl font-semibold">Visual Contract</h1>
		<p class="text-muted-foreground mt-2">
			Define a clear visual direction for a project and give your designer a brief they can work
			from.
		</p>
	</div>
	{#if entry && entry.access !== 'restricted'}
		<form method="POST" action="?/start">
			<Button type="submit">
				<PlusIcon />
				{hasHistory ? 'Create new Visual Contract' : 'Start Visual Contract'}
			</Button>
		</form>
	{/if}
</header>

{#if !entry || entry.access === 'restricted'}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
			<BookOpenIcon class="size-8" />
			<h2 class="text-lg font-semibold">Visual Contract is unavailable</h2>
			<p class="text-muted-foreground max-w-md text-sm">
				This tool is not open yet. It will appear here when it becomes available.
			</p>
		</Card.Content>
	</Card.Root>
{:else if !hasHistory}
	<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
		<Card.Root>
			<Card.Header class="gap-3">
				<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
					<BookOpenIcon class="size-5" />
				</div>
				<div class="flex flex-col gap-1">
					<Card.Title>Start your first Visual Contract</Card.Title>
					<Card.Description>
						A guided tool for non-designers. No design knowledge needed.
					</Card.Description>
				</div>
			</Card.Header>
			<Card.Footer class="justify-start">
				<form method="POST" action="?/start">
					<Button type="submit">Start Visual Contract</Button>
				</form>
			</Card.Footer>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">How it works</Card.Title>
			</Card.Header>
			<Card.Content>
				<ol class="flex flex-col gap-3">
					{#each HOW_IT_WORKS as step, index (step)}
						<li class="flex gap-3">
							<span
								class="border-foreground/20 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
							>
								{index + 1}
							</span>
							<span class="text-sm">{step}</span>
						</li>
					{/each}
				</ol>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="mt-6 flex flex-col gap-6">
		{#each data.drafts as draft (draft.id)}
			<Card.Root>
				<Card.Content class="flex flex-wrap items-center gap-4">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<p class="text-sm font-medium">{draft.title}</p>
						<p class="text-muted-foreground text-xs">Updated {formatDate(draft.updatedAt)}</p>
					</div>
					<Badge variant="secondary">Unfinished</Badge>
					<Button size="sm" href={draft.href}>Continue</Button>
				</Card.Content>
			</Card.Root>
		{/each}

		<Card.Root>
			<Card.Header>
				<Card.Title>Your contracts</Card.Title>
				<Card.Description>Completed contracts open as a shareable page.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.contracts.length}
					<ul class="flex flex-col divide-y">
						{#each data.contracts as contract (contract.id)}
							<li class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
								<div class="flex min-w-0 flex-1 flex-col gap-1">
									<p class="truncate text-sm font-medium">{contract.title}</p>
									<p class="text-muted-foreground text-xs">
										Created {formatDate(contract.createdAt)}
									</p>
								</div>
								{#if contract.canView}
									<Button variant="outline" size="sm" href={`/app/documents/${contract.id}`}>
										Open
									</Button>
								{/if}
								{#if contract.canShare && contract.shareSlug}
									<ShareButton path={`/share/${contract.shareSlug}`} />
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted-foreground text-sm">No completed contracts yet.</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<form method="POST" action="?/start">
					<Button type="submit" variant="outline">
						<PlusIcon />
						New Visual Contract
					</Button>
				</form>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}
