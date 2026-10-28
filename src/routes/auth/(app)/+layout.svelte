<script lang="ts">
	import AppShell from '#lib/app/shell/app-shell.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<AppShell
	user={data.user}
	tenancyEnabled={data.tenancyEnabled}
	organisations={data.organisations}
	activeBrandId={data.activeBrandId}
>
	{@render children()}
</AppShell>
