<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } =
		$props();
</script>

<div class={cn("rounded-md px-3 py-1.5 text-sm shadow-sm", className)} {...rest}>
	{@render children?.()}
</div>
