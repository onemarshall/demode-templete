<script lang="ts">
	import AppShell from '#lib/components/efferd/app-shell/app-shell-2/app-shell.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<AppShell user={data.user}>
	{@render children()}
</AppShell>
