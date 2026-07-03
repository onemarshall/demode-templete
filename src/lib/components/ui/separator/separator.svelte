<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: className,
		orientation = "horizontal",
		...rest
	}: HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" } = $props();
</script>

<div
	role="separator"
	aria-orientation={orientation}
	class={cn(orientation === "vertical" ? "h-full w-px" : "h-px w-full", "bg-border", className)}
	{...rest}
></div>
