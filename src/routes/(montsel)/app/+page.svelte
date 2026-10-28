<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowRightIcon,
		BookOpenIcon,
		ChartColumnIcon,
		CircleHelpIcon,
		FileCheckIcon,
		LayoutGridIcon,
		SparklesIcon
	} from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ActionButton from '$lib/app/components/montsel/action-button.svelte';
	import ProgressTrack from '$lib/app/components/montsel/progress-track.svelte';
	import { firstName, formatDate, formatLabel } from '$lib/app/components/montsel/format';
	import type { ProductFamily } from '#lib/modules/products/shared/registry.js';

	let { data }: PageProps = $props();

	const AREA_ICON = {
		diagnostic: ChartColumnIcon,
		strategy: FileCheckIcon,
		tool: LayoutGridIcon
	} satisfies Record<ProductFamily, unknown>;

	const AREA_DESCRIPTION: Record<ProductFamily, string> = {
		diagnostic: 'Understand your current position and identify opportunities.',
		strategy: 'Develop your strategic foundation through twelve connected modules.',
		tool: 'Access standalone tools to support your work.'
	};

	const greeting = $derived(firstName(data.user?.name, data.user?.email ?? ''));

	const HOW_IT_WORKS = [
		{ title: 'Choose a product', body: 'Start with a diagnostic, work through the strategy, or explore the tools.' },
		{ title: 'Complete your work', body: 'Follow a clear process with guidance at each step.' },
		{ title: 'Access your outputs', body: 'Find all your documents in one place.' }
	];
</script>

<svelte:head><title>Dashboard — Montsel</title></svelte:head>

<header class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="text-3xl font-semibold">
			{data.returning ? 'Welcome back' : 'Welcome to Montsel'}{greeting ? `, ${greeting}` : ''}
		</h1>
		<p class="text-muted-foreground mt-2">
			{data.returning
				? "Here's an overview of your Montsel workspace."
				: 'Montsel helps you understand your current position, develop a clear strategy and access practical tools to support your work.'}
		</p>
	</div>
	{#if data.returning}
		<Button variant="outline" href="/app/tools">New project</Button>
	{/if}
</header>

<div class="grid gap-6 md:grid-cols-3">
	{#each data.areas as area (area.family)}
		{@const Icon = AREA_ICON[area.family]}
		<Card.Root class="flex h-full flex-col">
			<Card.Header class="gap-3">
				<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
					<Icon class="size-5" />
				</div>
				<div class="flex flex-col gap-1">
					<Card.Title class="text-2xl">{area.label}</Card.Title>
					<Card.Description>{AREA_DESCRIPTION[area.family]}</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="flex-1">
				<p class="text-sm">
					<span class="text-muted-foreground">Status:</span> {area.status}
				</p>
			</Card.Content>
			<Card.Footer class="justify-start">
				<ActionButton action={area.action} size="sm" />
			</Card.Footer>
		</Card.Root>
	{/each}
</div>

{#if data.returning}
	<div class="grid gap-6 lg:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Your progress</Card.Title>
				<Button variant="ghost" size="sm" href="/app/documents">View all</Button>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				{#each data.work.filter((entry) => entry.work?.stepsTotal) as entry (entry.product.key)}
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="font-medium">{entry.product.name}</span>
							<span class="text-muted-foreground">{entry.work?.currentStepLabel ?? ''}</span>
						</div>
						<ProgressTrack
							completed={entry.work?.stepsCompleted ?? 0}
							total={entry.work?.stepsTotal ?? null}
						/>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No work in progress.</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Active work</Card.Title>
				<Button variant="ghost" size="sm" href="/app/documents">View all</Button>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y">
				{#each data.work as entry (entry.product.key)}
					<div class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">
								{entry.product.name}{entry.work?.currentStepLabel
									? ` · ${entry.work.currentStepLabel}`
									: ''}
							</p>
							<p class="text-muted-foreground mt-1 text-xs">
								{entry.work?.lastActivityAt
									? `Last activity ${formatDate(entry.work.lastActivityAt)}`
									: 'Not started'}
							</p>
						</div>
						<ActionButton action={entry.action} size="sm" />
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">Nothing in progress.</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<Card.Title>Recent documents</Card.Title>
			<Button variant="ghost" size="sm" href="/app/documents">
				View all
				<ArrowRightIcon />
			</Button>
		</Card.Header>
		<Card.Content>
			{#if data.documents.length}
				<table class="w-full text-left text-sm">
					<thead class="text-muted-foreground">
						<tr class="border-b">
							<th class="py-2 font-medium">Name</th>
							<th class="py-2 font-medium">Product</th>
							<th class="py-2 font-medium">Created</th>
							<th class="py-2 font-medium">Format</th>
							<th class="py-2 font-medium"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.documents as document (document.id)}
							<tr class="border-b last:border-0">
								<td class="py-2">{document.title}</td>
								<td class="text-muted-foreground py-2">{document.productKey}</td>
								<td class="py-2">{formatDate(document.createdAt)}</td>
								<td class="py-2">{formatLabel(document.format)}</td>
								<td class="py-2 text-right">
									{#if document.canView}
										<Button variant="outline" size="sm" href={`/app/documents/${document.id}`}>
											Open
										</Button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="text-muted-foreground text-sm">
					No documents yet. Completed work appears here.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
{:else}
	<div class="grid gap-6 lg:grid-cols-2">
		{#if data.visualContract?.access === 'free'}
			<Card.Root>
				<Card.Header class="gap-3">
					<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
						<BookOpenIcon class="size-5" />
					</div>
					<div class="flex flex-col gap-1">
						<Card.Title>Try the Visual Contract (Free)</Card.Title>
						<Card.Description>
							Create a clear design brief and review guide in minutes. No design knowledge needed.
						</Card.Description>
					</div>
				</Card.Header>
				<Card.Footer class="justify-start">
					<ActionButton action={data.visualContract.action} />
				</Card.Footer>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header class="gap-3">
				<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
					<CircleHelpIcon class="size-5" />
				</div>
				<div class="flex flex-col gap-1">
					<Card.Title>Need help getting started?</Card.Title>
					<Card.Description>
						Use the AI Assistant to ask questions or get guidance on which product to start with.
					</Card.Description>
				</div>
			</Card.Header>
			<Card.Footer class="justify-start">
				<Button variant="outline" href="/app/assistant">
					<SparklesIcon />
					Open AI Assistant
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>

	<section aria-labelledby="how-montsel-works" class="flex flex-col gap-5">
		<h2 id="how-montsel-works" class="text-lg font-semibold">How Montsel works</h2>
		<ol class="grid gap-6 md:grid-cols-3">
			{#each HOW_IT_WORKS as step, index (step.title)}
				<li class="flex gap-3">
					<span
						class="border-foreground/20 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
					>
						{index + 1}
					</span>
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium">{step.title}</p>
						<p class="text-muted-foreground text-sm">{step.body}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>
{/if}
