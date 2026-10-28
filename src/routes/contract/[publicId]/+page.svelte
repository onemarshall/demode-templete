<script lang="ts">
	import ContractPage from '#lib/modules/visual-contract/ui/contract-page.svelte';
	import CopyLink from '#lib/modules/visual-contract/ui/copy-link.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const title = $derived(data.context.projectName?.trim() || 'Visual Contract');
</script>

<svelte:head>
	<title>{title} — Visual Contract</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
	<section class="flex flex-col gap-3">
		<p class="text-muted-foreground text-sm">Visual Contract</p>
		<p class="text-muted-foreground text-sm">
			Read-only. This link records a direction; it does not let anyone change it.
		</p>
		{#if data.expiresAt}
			<p class="text-muted-foreground text-xs">
				This link expires on {formatDate(data.expiresAt)}.
			</p>
		{/if}
		<CopyLink value={data.publicUrl} />
	</section>

	<ContractPage
		content={data.content}
		context={data.context}
		confirmedAt={data.confirmedAt}
		publicId={data.publicId}
	/>
</main>
