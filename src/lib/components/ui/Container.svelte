<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div class={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
	{@render children?.()}
</div>
