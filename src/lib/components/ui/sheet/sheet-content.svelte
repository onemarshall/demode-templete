<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: className,
		side = "right",
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & {
		side?: "top" | "right" | "bottom" | "left";
		children?: Snippet;
	} = $props();

	const position = $derived(
		({
			right: "right-0 top-0 h-full",
			left: "left-0 top-0 h-full",
			top: "left-0 top-0 w-full",
			bottom: "bottom-0 left-0 w-full",
		})[side],
	);
</script>

<div class="fixed inset-0 z-50 bg-black/40">
	<div class={cn("bg-background fixed max-h-full max-w-full shadow-lg", position, className)} {...rest}>
		{@render children?.()}
	</div>
</div>
