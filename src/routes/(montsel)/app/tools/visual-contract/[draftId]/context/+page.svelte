<script lang="ts">
	import ProjectContextForm from '#lib/modules/visual-contract/ui/project-context-form.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Project details — Visual Contract</title></svelte:head>

<div class="flex flex-col gap-6">
	<header class="flex flex-col gap-2">
		<p class="text-muted-foreground text-sm">Tools / Visual Contract</p>
		<h1 class="text-2xl font-semibold">Project details</h1>
		<p class="text-muted-foreground max-w-xl text-sm">
			Optional. Anything you add here can shape the examples later. It does not change what any of
			the six choices mean.
		</p>
	</header>

	<ProjectContextForm
		values={data.draft.projectContext}
		skipHref={`${data.base}/${data.draft.id}/choose/1`}
		submitLabel="Continue to the first choice"
	/>
</div>
