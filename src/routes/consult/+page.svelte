<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();
	const label = (value: string) => value.replaceAll('_', ' ');
</script>

<svelte:head><title>Consulting — Langfell</title></svelte:head>

<header class="mb-6 flex flex-col gap-2">
	<h1 class="text-3xl font-semibold">Consulting engagements</h1>
	<p class="text-muted-foreground">
		Engagements granted to you. The client surface remains separate; this workspace is for
		scoping, analysis acceptance and decision-record approval.
	</p>
</header>

{#if data.engagements.length === 0}
	<Card.Root>
		<Card.Content class="py-10 text-center">
			<p class="font-medium">No engagements are assigned to you.</p>
			<p class="text-muted-foreground mt-1 text-sm">
				A Langfell administrator grants access to a specific engagement.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col gap-3">
		{#each data.engagements as engagement (engagement.id)}
			<Card.Root>
				<Card.Content class="flex flex-wrap items-center gap-4">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<p class="text-sm font-medium">
							{engagement.brandName} · {label(engagement.family)}
						</p>
						<p class="text-muted-foreground text-xs">
							{label(engagement.deliveryRoute)} · {engagement.grantRole} ·
							updated {formatDate(engagement.updatedAt)}
						</p>
					</div>
					<Badge variant="outline">{label(engagement.status)}</Badge>
					<Button size="sm" href={`/consult/${engagement.id}`}>Open</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
