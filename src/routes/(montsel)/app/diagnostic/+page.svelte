<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ChartColumnIcon, FileCheckIcon, InfoIcon, LockIcon } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ActionButton from '$lib/app/components/montsel/action-button.svelte';
	import ProgressTrack from '$lib/app/components/montsel/progress-track.svelte';
	import WorkStatus from '$lib/app/components/montsel/work-status.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();

	const hasAccess = $derived(data.fullOwned || data.owned.length > 0);
</script>

<svelte:head><title>Diagnostic — Montsel</title></svelte:head>

<header>
	<p class="text-muted-foreground text-sm">Diagnostic</p>
	<h1 class="mt-1 text-3xl font-semibold">Montsel Diagnostic</h1>
	<p class="text-muted-foreground mt-2">
		Your current diagnostic and what to do next.
	</p>
</header>

{#if !hasAccess}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
			<div class="bg-muted flex size-12 items-center justify-center rounded-lg">
				<ChartColumnIcon class="size-6" />
			</div>
			<div class="space-y-1">
				<h2 class="text-lg font-semibold">Choose a diagnostic to get started</h2>
				<p class="text-muted-foreground mx-auto max-w-md text-sm">
					Each diagnostic answers a different question. Select the one that fits your needs or
					choose the Full Diagnostic for a complete view.
				</p>
			</div>
			<Button href="/auth/pricing">View diagnostic options</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="flex items-start gap-3">
			<InfoIcon class="text-muted-foreground mt-0.5 size-4 shrink-0" />
			<div class="flex flex-col gap-1 text-sm">
				<p class="font-medium">Already purchased?</p>
				<p class="text-muted-foreground">
					Make sure you're signed in with the correct organisation or check your account.
				</p>
			</div>
			<Button variant="outline" size="sm" href="/organisations" class="ml-auto shrink-0">
				Check organisation
			</Button>
		</Card.Content>
	</Card.Root>
{:else if data.fullOwned}
	<section aria-labelledby="full-diagnostic" class="flex flex-col gap-4">
		<div class="flex items-center justify-between gap-3">
			<h2 id="full-diagnostic" class="text-lg font-semibold">Full Diagnostic</h2>
			<Badge variant="outline">Owned</Badge>
		</div>
		<p class="text-muted-foreground text-sm">
			All three diagnostics in one journey, with one integrated report.
		</p>

		<ol class="flex flex-col gap-3">
			{#each data.stages as stage, index (stage.key)}
				<li>
					<Card.Root>
						<Card.Content class="flex flex-wrap items-center gap-4">
							<span
								class="border-foreground/20 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
							>
								{index + 1}
							</span>
							<div class="flex min-w-0 flex-1 flex-col gap-1">
								<p class="text-sm font-medium">{stage.name}</p>
								<p class="text-muted-foreground text-xs">
									{#if stage.work}
										{stage.work.currentStepLabel ?? 'In this journey'} · {stage.work.stepsCompleted} of
										{stage.work.stepsTotal ?? '?'}
									{:else}
										Not started
									{/if}
								</p>
							</div>
							{#if stage.work}
								<WorkStatus state={stage.work.state} />
							{:else}
								<Badge variant="ghost">Not started</Badge>
							{/if}
							<ActionButton action={stage.action} size="sm" />
						</Card.Content>
					</Card.Root>
				</li>
			{/each}

			<li>
				<Card.Root>
					<Card.Content class="flex flex-wrap items-center gap-4">
						<span
							class="border-foreground/20 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
						>
							4
						</span>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<p class="text-sm font-medium">Integrated Diagnostic report</p>
							<p class="text-muted-foreground text-xs">
								All three diagnostics combined into one comprehensive report.
							</p>
						</div>
						{#if data.report}
							<Button variant="outline" size="sm" href={`/app/documents/${data.report.id}`}>
								View full report
							</Button>
						{:else}
							<Button variant="outline" size="sm" disabled title="Available once the stages are complete">
								<LockIcon />
								Not ready
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			</li>
		</ol>
	</section>
{:else}
	<section aria-labelledby="your-diagnostic" class="flex flex-col gap-4">
		<h2 id="your-diagnostic" class="text-lg font-semibold">Your diagnostic</h2>
		{#each data.owned as entry (entry.product.key)}
			<Card.Root>
				<Card.Header class="gap-3">
					<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
						<FileCheckIcon class="size-5" />
					</div>
					<div class="flex flex-col gap-1">
						<Card.Title>{entry.product.name}</Card.Title>
						<Card.Description>{entry.product.summary}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					<div class="flex items-center gap-2 text-sm">
						<WorkStatus state={entry.work?.state ?? 'not_started'} />
						{#if entry.work?.startedAt}
							<span class="text-muted-foreground"
								>Started {formatDate(entry.work.startedAt)}</span
							>
						{/if}
					</div>
					{#if entry.work?.stepsTotal}
						<ProgressTrack
							completed={entry.work.stepsCompleted}
							total={entry.work.stepsTotal}
							label={entry.work.currentStepLabel ?? undefined}
						/>
					{/if}
				</Card.Content>
				<Card.Footer class="justify-start">
					<ActionButton action={entry.action} />
				</Card.Footer>
			</Card.Root>
		{/each}
	</section>
{/if}

{#if hasAccess && data.unowned.length}
	<section aria-labelledby="expand-insight" class="flex flex-col gap-4">
		<h2 id="expand-insight" class="text-lg font-semibold">Expand your insight</h2>
		<p class="text-muted-foreground text-sm">
			These diagnostics are not part of your current access.
		</p>
		<div class="grid gap-6 md:grid-cols-3">
			{#each data.unowned as entry (entry.product.key)}
				<Card.Root class="flex h-full flex-col">
					<Card.Header class="gap-2">
						<Card.Title class="text-base">{entry.product.name}</Card.Title>
						<Card.Description>{entry.product.summary}</Card.Description>
					</Card.Header>
					<Card.Footer class="mt-auto justify-start">
						<ActionButton action={entry.action} size="sm" />
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</section>
{/if}
