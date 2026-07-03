<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className, children, ...rest }: HTMLAttributes<HTMLParagraphElement> & { children?: Snippet } =
		$props();
</script>

<p class={cn("text-muted-foreground text-sm", className)} {...rest}>
	{@render children?.()}
</p>
