<script lang="ts">
	import type { PageProps } from './$types';
	import { formatDate, formatLabel } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.shared.title} — Montsel</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
	<header class="flex flex-col gap-2">
		<p class="text-muted-foreground text-sm">Shared {data.shared.productName} output</p>
		<h1 class="text-3xl font-semibold">{data.shared.title}</h1>
		<p class="text-muted-foreground text-sm">
			{formatLabel(data.shared.format)} · {formatDate(data.shared.createdAt)}
		</p>
	</header>
	<section class="rounded-xl border p-6">
		{#if data.shared.report}
			<article class="prose max-w-none" aria-label="Shared report">
				{@html data.shared.report.contentHtml}
			</article>
		{:else}
			<p class="text-muted-foreground text-sm">
				This link shares the output record. The rendered content is published by the product that
				produced it.
			</p>
		{/if}
	</section>
</main>
