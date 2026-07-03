<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLParagraphElement> {
		tagline?: string | null;
		children?: Snippet;
	}

	let { tagline, class: className, children, ...rest }: Props = $props();
</script>

{#if tagline || children}
	<p class={cn("text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground", className)} {...rest}>
		{#if tagline}{tagline}{/if}
		{@render children?.()}
	</p>
{/if}
