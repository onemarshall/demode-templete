<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeftIcon } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import ShareButton from '$lib/app/components/montsel/share-button.svelte';
	import { formatDate, formatLabel } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.output.title} — Montsel</title></svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-4">
		<div>
			<Button variant="ghost" size="sm" href="/app/documents">
				<ArrowLeftIcon />
				Documents
			</Button>
		</div>

		<header class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-2">
				<p class="text-muted-foreground text-sm">{data.productName}</p>
				<h1 class="text-3xl font-semibold">{data.output.title}</h1>
				<div class="flex items-center gap-2 text-sm">
					<Badge variant="outline">{formatLabel(data.output.format)}</Badge>
					<span class="text-muted-foreground">Created {formatDate(data.output.createdAt)}</span>
				</div>
			</div>
			<div class="flex gap-2">
				{#if data.openPath}
					<Button href={data.openPath}>Open {data.productName}</Button>
				{/if}
				{#if data.output.canShare && data.output.shareSlug}
					<ShareButton path={`/share/${data.output.shareSlug}`} />
				{/if}
				{#if data.output.canDownload}
					<Button variant="outline" href={`/app/documents/${data.output.id}/download`}>
						Download
					</Button>
				{/if}
			</div>
		</header>
	</div>

	{#if data.report}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Report</Card.Title>
				<Card.Description>
					Version {data.report.versionNumber} · {formatDate(data.report.createdAt)} · verified
					against <code class="text-xs">{data.report.contentHash.slice(0, 12)}…</code>
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<article class="prose max-w-none" aria-label="Delivered report">
					{@html data.report.contentHtml}
				</article>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Output</Card.Title>
				<Card.Description>
					This record holds the output metadata. The content is rendered by the product that
					produced it.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}
</div>
