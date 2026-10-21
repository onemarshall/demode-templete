<script lang="ts">
	import AppChrome from '#lib/components/navigation/AppChrome.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<AppChrome user={data.user}>
	{@render children()}
</AppChrome>
