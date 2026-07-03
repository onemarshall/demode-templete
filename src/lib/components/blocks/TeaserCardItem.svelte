<script lang="ts">
	import { cn } from "$lib/utils";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { resolve } from "$app/paths";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { Button } from "$lib/components/ui/button";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/shared/utils/directus-links";

	interface TeaserCardItem {
		id: string | number;
		title?: string | null;
		label?: string | null;
		badge?: string | null;
		link?: DirectusLinkValue | string | null;
		image?: string | null | { id: string };
	}

	let {
		data,
		duotone = false,
		duotoneColor = null,
	} = $props<{
		data: TeaserCardItem;
		duotone?: boolean;
		duotoneColor?: string | null;
	}>();

	const duotoneBg = $derived(
		duotone
			? `background-color: ${duotoneColor?.trim() || "var(--color-sec-50)"};`
			: undefined,
	);

	const resolvedLink = $derived(resolveDirectusLink(data.link));
	const href = $derived(
		resolvedLink.href
			? resolvedLink.isExternal
				? resolvedLink.href
				: resolve(resolvedLink.href as "/")
			: null,
	);
</script>

<svelte:element
	this={href ? "a" : "div"}
	href={href ?? undefined}
	class={cn(
		"group flex h-full flex-col overflow-hidden rounded-sm bg-white text-inherit no-underline shadow-sm transition-shadow duration-200",
		href &&
			"hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	)}
	aria-label={href ? data.title || "Teaser card link" : undefined}
	data-directus={setAttr({
		collection: "block_teaser_card_items",
		item: data.id,
		fields: "title,label,link,image",
		mode: "popover",
	})}
>
	{#if data.image}
		<figure class="overflow-hidden">
			<div class="relative aspect-4/3" style={duotoneBg}>
				<DirectusImage
					uuid={typeof data.image === "object" && data.image !== null
						? data.image.id
						: data.image}
					alt={data.title || "Teaser card image"}
					layout="fullWidth"
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
					maxWidth={960}
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] {duotone
						? 'grayscale mix-blend-multiply'
						: ''}"
				/>
			</div>
		</figure>
	{/if}

	<footer class="flex flex-1 flex-col p-3 lg:p-5 lg:pb-8">
		{#if data.badge}
			<p
				class="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-black/40"
			>
				{data.badge}
			</p>
		{/if}
		{#if data.label}
			<h4
				class="mb-3 text-3xl md:text-2xl font-serif text-gray-900 lg:mb-5"
			>
				<span
					class="bg-[linear-gradient(transparent_50%,hsl(245_58%_51%/0.2)_50%)] bg-size-[0%_100%] bg-no-repeat transition-[background-size] duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)] will-change-[background-size] group-hover:bg-size-[100%_100%]"
				>
					{data.label}
				</span>
			</h4>
		{/if}
		{#if data.title}
			<div class="flex-1">
				<h4 class="mb-3 text-sm text-gray-500 lg:mb-5">
					{data.title}
				</h4>
			</div>
		{/if}

		{#if href}
			<div class="mt-auto py-3">
				<Button variant="outline" class="pointer-events-none">
					{data.link?.title || "Read more"}
				</Button>
			</div>
		{/if}
	</footer>
</svelte:element>
