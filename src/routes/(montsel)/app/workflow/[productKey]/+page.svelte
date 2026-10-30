<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import SignalIntakeForm from '#lib/modules/diagnostic/ui/signal-intake-form.svelte';
	import GapIntakeForm from '#lib/modules/diagnostic/ui/gap-intake-form.svelte';
	import DirectionIntakeForm from '#lib/modules/diagnostic/ui/direction-intake-form.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const engagement = $derived(data.engagement);
	const subjectUrl = $derived(
		typeof engagement?.intake?.subjectUrl === 'string' ? engagement.intake.subjectUrl : ''
	);
	// The action's `fail` payload lands on `page.form`, not on page data.
	const submitted = $derived(
		page.form as { values?: Record<string, unknown>; fieldErrors?: Record<string, string> } | null
	);

	const description = $derived(
		data.variant?.family === 'gap'
			? 'Gap examines the mismatches, proof weaknesses and positioning opportunities the evidence supports. It does not create the final position.'
			: data.variant?.family === 'direction'
				? 'Direction tests one proposed direction against five decision checks. It does not create a replacement direction.'
				: 'Signal reads what your public material currently communicates. It is not a lighter Gap and it does not judge a proposed move.'
	);
</script>

<svelte:head><title>{data.product.name} — Montsel</title></svelte:head>

{#if data.variant}
	<div class="flex flex-col gap-6">
		<header class="flex flex-col gap-2">
			<p class="text-muted-foreground text-sm">{data.product.name}</p>
			<h1 class="text-3xl font-semibold">Start a {data.variant.name}</h1>
			<p class="text-muted-foreground max-w-2xl">
				{data.product.description} {description}
			</p>
		</header>

		{#if engagement}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">This diagnostic is recorded</Card.Title>
					<Card.Description>
						Started {formatDate(engagement.createdAt)} · {subjectUrl}
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					<div class="flex items-center gap-2 text-sm">
						<Badge variant="outline">{engagement.status.replaceAll('_', ' ')}</Badge>
						<span class="text-muted-foreground">
							{engagement.family} · {engagement.depth} · {engagement.deliveryRoute.replaceAll('_', ' ')}
						</span>
					</div>
					<p class="text-muted-foreground text-sm">
						Payment and the engine run are separate. The engagement and its intake are stored
						against this brand; the report appears on the diagnostic page when it is published.
					</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">
					{engagement ? 'Start a different diagnostic' : 'Intake'}
				</Card.Title>
				<Card.Description>
					Re-submitting an identical intake resumes the engagement already recorded rather than
					creating a second one.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.variant.family === 'gap'}
					<GapIntakeForm
						values={(submitted?.values ?? {}) as never}
						fieldErrors={submitted?.fieldErrors ?? {}}
						sectors={data.sectors}
						sectorError={data.sectorError}
					/>
				{:else if data.variant.family === 'direction'}
					<DirectionIntakeForm
						values={(submitted?.values ?? {}) as never}
						fieldErrors={submitted?.fieldErrors ?? {}}
						sectors={data.sectors}
						sectorError={data.sectorError}
					/>
				{:else}
					<SignalIntakeForm
						values={(submitted?.values ?? {}) as never}
						fieldErrors={submitted?.fieldErrors ?? {}}
					/>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:else}
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
{/if}
