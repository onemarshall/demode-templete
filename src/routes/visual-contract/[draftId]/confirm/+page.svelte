<script lang="ts">
	import ConfirmScreen from '#lib/modules/visual-contract/ui/confirm-screen.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Check your choices — Visual Contract</title></svelte:head>

<ConfirmScreen
	choices={data.choices}
	base="/visual-contract"
	draftId={data.draftId}
/>
