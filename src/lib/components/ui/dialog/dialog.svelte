<script lang="ts">
	import type { Snippet } from "svelte";

	let { open = $bindable(false), children }: { open?: boolean; children?: Snippet } = $props();
</script>

{#if open}
	{@render children?.()}
{/if}
