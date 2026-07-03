<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } =
		$props();
</script>

<div class={cn("z-50 mt-1 min-w-full rounded-md bg-background p-1", className)} {...rest}>
	{@render children?.()}
</div>
