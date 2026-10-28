<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowRightIcon,
		ChartColumnIcon,
		CheckIcon,
		LayersIcon,
		MessageSquareIcon,
		TargetIcon
	} from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ActionButton from '$lib/app/components/montsel/action-button.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();

	const strategy = $derived(data.strategy);
	const work = $derived(strategy?.work ?? null);
	const owned = $derived(strategy?.access === 'owned');
	const currentStepNumber = $derived(work ? Math.min(work.stepsCompleted + 1, work.stepsTotal ?? 12) : 1);
	const steps = $derived(
		Array.from({ length: work?.stepsTotal ?? 12 }, (_, index) => index + 1)
	);
</script>

<svelte:head><title>Strategy — Montsel</title></svelte:head>

<header class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<p class="text-muted-foreground text-sm">Strategy</p>
		<h1 class="mt-1 text-3xl font-semibold">Montsel Strategy</h1>
		<p class="text-muted-foreground mt-2">
			Develop your business choices and turn them into a clear, practical strategy.
		</p>
	</div>
	<Card.Root class="w-full max-w-sm">
		<Card.Content class="flex items-start gap-3">
			<TargetIcon class="mt-0.5 size-5 shrink-0" />
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Turn insight into a clear plan</p>
				<p class="text-muted-foreground text-xs">
					Work through a structured process with guidance, evidence and connected outputs.
				</p>
				<a class="mt-1 text-xs underline underline-offset-4" href="/app/diagnostic">
					Learn more about Montsel Strategy
				</a>
			</div>
		</Card.Content>
	</Card.Root>
</header>

{#if !strategy}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
			<LayersIcon class="size-8" />
			<h2 class="text-lg font-semibold">Strategy is unavailable</h2>
			<p class="text-muted-foreground max-w-md text-sm">
				Strategy is not part of your current access. Diagnostic findings are not required to start.
			</p>
			<Button href="/auth/pricing" variant="outline">Learn more</Button>
		</Card.Content>
	</Card.Root>
{:else if !owned}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
			<LayersIcon class="size-8" />
			<h2 class="text-lg font-semibold">Strategy is not part of your access</h2>
			<p class="text-muted-foreground max-w-md text-sm">
				Strategy is a separate product and does not require a Diagnostic purchase.
			</p>
			<Button href={strategy.product.learnMorePath} variant="outline">Learn more</Button>
		</Card.Content>
	</Card.Root>
{:else if !work || work.state === 'not_started'}
	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
			<LayersIcon class="size-8" />
			<div class="space-y-1">
				<h2 class="text-lg font-semibold">Start your strategy</h2>
				<p class="text-muted-foreground mx-auto max-w-md text-sm">
					Work through twelve connected modules, from foundations to implementation. Nothing is
					completed until you record it.
				</p>
			</div>
			<ActionButton action={strategy.action} />
		</Card.Content>
	</Card.Root>
{:else}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
		<div class="flex flex-col gap-6">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title>Your strategy progress</Card.Title>
					{#if data.pendingApproval}
						<Badge variant="warning">Decision pending</Badge>
					{/if}
				</Card.Header>
				<Card.Content>
					<ol class="flex snap-x gap-3 overflow-x-auto pb-2" aria-label="Strategy steps">
						{#each steps as step (step)}
							{@const complete = step <= work.stepsCompleted}
							{@const current = step === currentStepNumber}
							<li
								class="flex w-40 shrink-0 snap-start flex-col gap-2 rounded-lg border p-3 {current
									? 'border-foreground/40'
									: ''}"
								aria-current={current ? 'step' : undefined}
							>
								<div class="flex items-center justify-between">
									<span class="text-muted-foreground text-xs">Step {step}</span>
									{#if complete}
										<CheckIcon class="size-4" />
									{:else if current}
										<span class="bg-foreground size-2 rounded-full"></span>
									{/if}
								</div>
								<p class="text-sm font-medium">
									{current ? (work.currentStepLabel ?? 'In progress') : complete ? 'Complete' : 'Not started'}
								</p>
								{#if current}
									<Button size="sm" href={strategy.action.href ?? strategy.product.workflowPath}>
										{strategy.action.label}
									</Button>
								{/if}
							</li>
						{/each}
					</ol>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title>Recent outputs</Card.Title>
					<Button variant="ghost" size="sm" href="/app/documents">
						View all
						<ArrowRightIcon />
					</Button>
				</Card.Header>
				<Card.Content class="flex flex-col divide-y">
					{#each data.outputs as output (output.id)}
						<div class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
							<div class="flex min-w-0 flex-col gap-1">
								<p class="truncate text-sm font-medium">{output.title}</p>
								<p class="text-muted-foreground text-xs">{formatDate(output.createdAt)}</p>
							</div>
							{#if output.canView}
								<Button variant="outline" size="sm" href={`/app/documents/${output.id}`}>
									Open
								</Button>
							{/if}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No outputs yet.</p>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<aside class="flex flex-col gap-6" aria-label="Strategy context">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Current focus</Card.Title>
					<Card.Description>
						{currentStepNumber}. {work.currentStepLabel ?? 'In progress'}
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					<p class="text-muted-foreground text-sm">
						{work.stepsCompleted} of {work.stepsTotal ?? 12} steps complete.
					</p>
					<ActionButton action={strategy.action} />
					<Button variant="outline" href="/app/documents">View module overview</Button>
				</Card.Content>
			</Card.Root>

			{#if data.diagnosticFindings}
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">Connected insight</Card.Title>
						<Card.Description>
							You have diagnostic findings that can inform your strategy work.
						</Card.Description>
					</Card.Header>
					<Card.Footer>
						<Button variant="outline" size="sm" href="/app/diagnostic">
							<ChartColumnIcon />
							View diagnostic insights
						</Button>
					</Card.Footer>
				</Card.Root>
			{/if}

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Need help?</Card.Title>
					<Card.Description>
						Ask a question or discuss your progress with the AI assistant.
					</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button variant="outline" size="sm" href="/app/assistant">
						<MessageSquareIcon />
						Ask the assistant
					</Button>
				</Card.Footer>
			</Card.Root>
		</aside>
	</div>
{/if}
