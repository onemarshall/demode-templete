<script lang="ts">
	import type { Snippet } from "svelte";
	let { children }: { children?: Snippet } = $props();
</script>

<span class="relative inline-flex">
	{@render children?.()}
</span>
