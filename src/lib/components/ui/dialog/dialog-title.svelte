<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className, children, ...rest }: HTMLAttributes<HTMLHeadingElement> & { children?: Snippet } =
		$props();
</script>

<h2 class={cn("text-lg font-semibold", className)} {...rest}>{@render children?.()}</h2>
