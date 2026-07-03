<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } =
		$props();
</script>

<div class={cn("text-destructive text-sm", className)} {...rest}>
	{@render children?.()}
</div>
