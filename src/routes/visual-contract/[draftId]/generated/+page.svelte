<script lang="ts">
	import GeneratedScreen from '#lib/modules/visual-contract/ui/generated-screen.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Your Visual Contract is ready — Montsel</title></svelte:head>

<GeneratedScreen
	publicId={data.publicId}
	publicUrl={data.publicUrl}
	saveUrl={data.saveUrl}
	content={data.content}
	context={data.context}
	confirmedAt={data.confirmedAt}
	claim={data.claim}
	emailLocked={Boolean(data.claim)}
/>
