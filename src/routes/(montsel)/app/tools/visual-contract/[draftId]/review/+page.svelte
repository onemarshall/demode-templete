<script lang="ts">
	import ReviewScreen from '#lib/modules/visual-contract/ui/review-screen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Review and use — Visual Contract</title></svelte:head>

<ReviewScreen
	prompts={data.prompts}
	confirmHref={`/app/tools/visual-contract/${data.draftId}/confirm`}
	message={form?.message ?? null}
/>
