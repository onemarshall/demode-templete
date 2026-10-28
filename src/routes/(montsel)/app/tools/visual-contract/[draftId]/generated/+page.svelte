<script lang="ts">
	import GeneratedScreen from '#lib/modules/visual-contract/ui/generated-screen.svelte';
	import DesignerSend from '#lib/modules/visual-contract/ui/designer-send.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Your Visual Contract is ready — Montsel</title></svelte:head>

<div class="flex flex-col gap-8">
	<GeneratedScreen
		publicId={data.publicId}
		publicUrl={data.publicUrl}
		saveUrl={data.saveUrl}
		content={data.content}
		context={data.context}
		confirmedAt={data.confirmedAt}
		claim={data.claim}
	/>

	<DesignerSend
		senderName={data.senderName}
		message={form?.message ?? null}
		sentTo={form?.sentTo ?? null}
	/>
</div>
