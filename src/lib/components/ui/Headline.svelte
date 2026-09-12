<script lang="ts">
	import { cn } from "$lib/utils";

	type HeadlineSize = "sm" | "md" | "lg" | "xl";

	const sizeClasses: Record<HeadlineSize, string> = {
		sm: "text-2xl md:text-3xl lg:text-4xl",
		md: "text-3xl md:text-4xl lg:text-5xl",
		lg: "text-4xl md:text-5xl lg:text-6xl",
		xl: "text-5xl md:text-5xl lg:text-headline",
	};

	interface Props {
		headline?: string | null;
		as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
		size?: HeadlineSize;
		class?: string;
		"data-directus"?: string;
		[key: string]: unknown;
	}

	let {
		headline,
		as = "p",
		size = "md",
		class: className,
		"data-directus": dataDirectus,
	}: Props = $props();
</script>

{#if headline}
	<svelte:element
		this={as}
		class={cn(
			"font-heading font-normal text-foreground",
			sizeClasses[size],
			className,
		)}
		data-directus={dataDirectus}
	>
		{headline}
	</svelte:element>
{/if}
