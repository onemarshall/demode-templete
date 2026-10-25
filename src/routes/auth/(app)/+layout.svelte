<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import AppShell from '#lib/app/shell/app-shell.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<AppShell user={data.user}>
	{#if data.tenancyEnabled}<div class="px-4 py-3"><Button href="/organisations" variant="outline">Organisations & brands</Button></div>{/if}
	{@render children()}
</AppShell>
