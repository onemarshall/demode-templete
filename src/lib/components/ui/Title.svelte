<script lang="ts">
	import { cn } from "$lib/utils";

	interface TitleProps {
		title?: string | null;
		class?: string;
		as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
	}

	let { title, as = "h2", class: className }: TitleProps = $props();
</script>

{#if title}
	<svelte:element
		this={as}
		class={cn(
			"font-heading font-normal uppercase text-accent text-lg md:text-xl lg:text-title",
			className,
		)}
	>
		{title}
	</svelte:element>
{/if}
