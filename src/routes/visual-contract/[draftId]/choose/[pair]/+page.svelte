<script lang="ts">
	import ChooseScreen from '#lib/modules/visual-contract/ui/choose-screen.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Card {data.index} of {data.total} — Visual Contract</title></svelte:head>

<ChooseScreen
	pair={data.pair}
	index={data.index}
	total={data.total}
	selected={data.selected}
	returnTo={data.returnTo === 'confirm'}
	backHref={data.backHref}
	message={form?.message ?? null}
/>
