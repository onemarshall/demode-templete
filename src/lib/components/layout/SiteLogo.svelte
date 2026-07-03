<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import type { SiteGlobals } from "$lib/content/schema";

	interface Props {
		site?: SiteGlobals;
		globals?: SiteGlobals;
		class?: string;
		style?: string;
		svgClass?: string;
		fill?: string;
		variant?: "wordmark" | "circle";
		width?: string | number;
		height?: string | number;
	}

	let {
		site,
		globals,
		class: className = "",
		style = "",
		svgClass = "",
		fill,
		variant = "wordmark",
		width = "420",
		height = "50",
	}: Props = $props();

	const isHome = $derived(page.url.pathname === "/");
	const wrapperClass = $derived(
		[style, className].filter(Boolean).join(" ").trim(),
	);
	const logoClass = $derived(svgClass || className);
	const currentVariant = $derived(variant);
	const name = $derived(globals?.title ?? site?.title ?? globals?.company ?? site?.company ?? "Site");
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "S",
	);
</script>

{#snippet logo()}
	<span
		class="inline-flex items-center gap-2 font-semibold tracking-tight {logoClass}"
		style:color={fill}
		style:width={typeof width === "number" ? `${width}px` : width}
		style:min-height={typeof height === "number" ? `${height}px` : height}
	>
		{#if currentVariant === "circle"}
			<span
				class="inline-flex aspect-square size-[2.25em] items-center justify-center rounded-full bg-current text-[0.38em] font-bold leading-none text-background"
				aria-hidden="true"
			>
				{initials}
			</span>
			<span class="sr-only">{name}</span>
		{:else}
			<span>{name}</span>
		{/if}
	</span>
{/snippet}

{#if isHome}
	<div class={wrapperClass}>
		{@render logo()}
	</div>
{:else}
	<a href={resolve("/")} class={wrapperClass} title="Home">
		{@render logo()}
	</a>
{/if}
