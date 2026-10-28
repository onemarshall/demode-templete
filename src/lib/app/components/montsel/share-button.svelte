<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { CheckIcon, Share2Icon } from '@lucide/svelte';

	let { path, label = 'Share' }: { path: string; label?: string } = $props();

	let copied = $state(false);
	let failed = $state(false);

	async function copy() {
		const url = `${page.url.origin}${path}`;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			failed = false;
			setTimeout(() => (copied = false), 2000);
		} catch {
			failed = true;
		}
	}
</script>

<Button variant="outline" size="sm" onclick={copy}>
	{#if copied}
		<CheckIcon />
		Link copied
	{:else}
		<Share2Icon />
		{label}
	{/if}
</Button>
{#if failed}
	<span class="text-muted-foreground text-xs">Copy failed. Share {page.url.origin}{path}</span>
{/if}
