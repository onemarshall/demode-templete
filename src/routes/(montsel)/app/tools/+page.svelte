<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { BookOpenIcon, LayoutGridIcon, LightbulbIcon, ArrowRightIcon } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ActionButton from '$lib/app/components/montsel/action-button.svelte';
	import ProjectActions from '$lib/app/components/montsel/project-actions.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';
	import type { ProductAccess } from '#lib/modules/products/shared/access.js';
	import { RECENT_PROJECTS_LIMIT } from '#lib/modules/products/shared/access.js';

	let { data }: PageProps = $props();

	const sections = $derived(data.sections);
</script>

<svelte:head><title>Tools — Montsel</title></svelte:head>

{#snippet toolRow(entry: ProductAccess)}
	<Card.Root>
		<Card.Content class="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
			<div class="flex gap-4">
				<div class="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
					{#if entry.product.key === 'tool.visual_contract'}
						<BookOpenIcon class="size-6" />
					{:else}
						<LayoutGridIcon class="size-6" />
					{/if}
				</div>
				<div class="flex flex-col gap-2">
					<h2 class="font-semibold text-2xl">{entry.product.name}</h2>
					<p class="text-muted-foreground text-sm">{entry.product.summary}</p>
					<div class="pt-2">
						{#if entry.product.startAction && entry.action.kind !== 'unavailable'}
							<form method="POST" action={entry.product.startAction}>
								<Button type="submit">
									{entry.action.label}
									<ArrowRightIcon />
								</Button>
							</form>
						{:else}
							<ActionButton action={entry.action} />
						{/if}
					</div>
				</div>
			</div>

			{#if entry.product.supportsProjects}
				<div class="flex flex-col gap-3">
					<p class="text-muted-foreground text-xs font-medium">Your recent projects</p>
					{#if entry.projects.length}
						<ul class="flex flex-col divide-y rounded-lg border">
							{#each entry.projects.slice(0, RECENT_PROJECTS_LIMIT) as project (project.id)}
								<li class="flex items-center justify-between gap-3 px-3 py-2.5">
									<div class="flex min-w-0 flex-col gap-0.5">
										<p class="truncate text-sm">{project.title ?? 'Untitled project'}</p>
										<p class="text-muted-foreground text-xs">
											Updated {formatDate(project.lastActivityAt ?? project.startedAt)}
										</p>
									</div>
									<ProjectActions
										title={project.title ?? 'Untitled contract'}
										href={project.resumePath ?? entry.product.workflowPath}
										draftId={project.id}
									/>
								</li>
							{/each}
						</ul>
						<Button variant="outline" size="sm" href={entry.product.route}>
							{#if entry.projects.length > RECENT_PROJECTS_LIMIT}
								View all {entry.projects.length} {entry.product.name} projects
							{:else}
								View all {entry.product.name} projects
							{/if}
						</Button>
					{:else}
						<p class="text-muted-foreground rounded-lg border border-dashed px-3 py-8 text-center text-sm">
							No projects yet.
						</p>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
{/snippet}

<header class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<p class="text-muted-foreground text-sm">Tools</p>
		<h1 class="mt-1 text-3xl font-semibold">Montsel Tools Library</h1>
		<p class="text-muted-foreground mt-2 max-w-2xl">
			Practical tools to help you make clearer decisions, align with your clients and put your
			strategy into action.
		</p>
	</div>
	<Card.Root class="w-full max-w-sm">
		<Card.Content class="flex items-start gap-3">
			<LightbulbIcon class="mt-0.5 size-5 shrink-0" />
			<div class="flex flex-col gap-2">
				<p class="text-sm font-medium">Need help choosing a tool?</p>
				<p class="text-muted-foreground text-xs">
					Get guidance, ask a question or discuss how to use the tools with the AI assistant.
				</p>
				<Button variant="outline" size="sm" href="/app/assistant" class="self-start">
					Open AI assistant
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</header>

{#if sections.owned.length}
	<section aria-labelledby="your-tools" class="flex flex-col gap-4">
		<h2 id="your-tools" class="text-lg font-semibold">Your tools</h2>
		<p class="text-muted-foreground text-sm">
			Continue where you left off or start a new project.
		</p>
		{#each sections.owned as entry (entry.product.key)}
			{@render toolRow(entry)}
		{/each}
	</section>
{/if}

{#if sections.free.length}
	<section aria-labelledby="free-tools" class="flex flex-col gap-4">
		<h2 id="free-tools" class="text-lg font-semibold">Free tools</h2>
		<p class="text-muted-foreground text-sm">These tools are available to all Montsel users.</p>
		{#each sections.free as entry (entry.product.key)}
			{@render toolRow(entry)}
		{/each}
	</section>
{/if}

{#if sections.optional.length}
	<section aria-labelledby="other-tools" class="flex flex-col gap-4">
		<h2 id="other-tools" class="text-lg font-semibold">Explore other tools</h2>
		<p class="text-muted-foreground text-sm">
			These tools are not part of your current access.
		</p>
		{#each sections.optional as entry (entry.product.key)}
			{@render toolRow(entry)}
		{/each}
	</section>
{/if}

{#if !sections.owned.length && !sections.free.length && !sections.optional.length}
	<p class="text-muted-foreground text-sm">No tools are available yet.</p>
{/if}
