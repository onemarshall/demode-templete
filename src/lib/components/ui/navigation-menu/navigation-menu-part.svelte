<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	type Props = {
		as?: "nav" | "ul" | "li" | "div" | "a" | "button";
		href?: string;
		children?: Snippet;
		class?: string;
		style?: string;
		viewport?: boolean;
	};

	let { as = "div", href, class: className, style, children, viewport }: Props = $props();
</script>

{#if as === "nav"}
	<nav class={className} {style}>{@render children?.()}</nav>
{:else if as === "ul"}
	<ul class={className} {style}>{@render children?.()}</ul>
{:else if as === "li"}
	<li class={className} {style}>{@render children?.()}</li>
{:else if as === "a"}
	<a class={className} {href} {style}>{@render children?.()}</a>
{:else if as === "button"}
	<button class={cn("inline-flex items-center", className)} type="button" {style}>
		{@render children?.()}
	</button>
{:else}
	<div class={className} {style}>{@render children?.()}</div>
{/if}
