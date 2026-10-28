<script lang="ts">
	import AppShell from '$lib/app/shell/app-shell.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AppShell
	user={data.user}
	tenancyEnabled
	organisations={data.organisations}
	activeBrandId={data.activeBrandId}
>
	{@render children()}
</AppShell>
