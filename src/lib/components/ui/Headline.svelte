<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLElement> {
		headline?: string | null;
		as?: "h1" | "h2" | "h3";
		size?: "sm" | "md" | "lg" | "xl";
		children?: Snippet;
	}

	let {
		headline,
		as = "h2",
		size = "md",
		class: className,
		children,
		...rest
	}: Props = $props();

	const sizeClass = $derived(
		({
			sm: "text-2xl",
			md: "text-3xl md:text-4xl",
			lg: "text-4xl md:text-5xl",
			xl: "text-5xl md:text-6xl",
		})[size],
	);
</script>

{#if headline || children}
	{#if as === "h1"}
		<h1 class={cn("font-serif font-semibold leading-tight text-balance", sizeClass, className)} {...rest}>
			{#if headline}{headline}{/if}
			{@render children?.()}
		</h1>
	{:else if as === "h3"}
		<h3 class={cn("font-serif font-semibold leading-tight text-balance", sizeClass, className)} {...rest}>
			{#if headline}{headline}{/if}
			{@render children?.()}
		</h3>
	{:else}
		<h2 class={cn("font-serif font-semibold leading-tight text-balance", sizeClass, className)} {...rest}>
			{#if headline}{headline}{/if}
			{@render children?.()}
		</h2>
	{/if}
{/if}
