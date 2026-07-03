<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: className,
		children,
		showCloseButton = true,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet; showCloseButton?: boolean } = $props();
</script>

<div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
	<div class={cn("bg-background text-foreground max-h-[90vh] w-full max-w-lg overflow-auto rounded-md border p-6 shadow-lg", className)} {...rest}>
		{@render children?.()}
	</div>
</div>
