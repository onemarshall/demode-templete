<script lang="ts">
	import AppShell from '$lib/components/efferd/app-shell/app-shell-2/app-shell.svelte';
	import WorkspaceSwitcher from '$lib/components/workspace/WorkspaceSwitcher.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>
<AppShell user={data.user}>
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-8">
		<WorkspaceSwitcher organisations={data.organisations} />
		{@render children()}
	</div>
</AppShell>
