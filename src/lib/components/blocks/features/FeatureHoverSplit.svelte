<script lang="ts">
	import { resolve } from "$app/paths";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/utils/directus-links";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { getImageUuid } from "$lib/utils/get-image-uuid";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import { fade } from "scripts/actions";
	import Tagline from "$lib/components/ui/Tagline.svelte";
	interface FeatureHoverSplitLink {
		type?: "page" | "post" | "url" | null;
		url?: string | null;
		page?: { permalink?: string | null } | null;
		post?: { slug?: string | null } | null;
	}

	interface FeatureHoverSplitItemData {
		id: string | number;
		title?: string | null;
		description?: string | null;
		link_label?: string | null;
		link?: FeatureHoverSplitLink | DirectusLinkValue | string | null;
		image?: string | null | { id: string };
		overlay_strength?: "soft" | "medium" | "strong" | null;
		sort?: number | null;
	}

	interface FeatureHoverSplitBlock {
		id: string | number;
		headline?: string | null;
		subheadline?: string | null;
		items?: FeatureHoverSplitItemData[] | null;
	}

	let { data } = $props<{
		data: FeatureHoverSplitBlock;
	}>();

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: FeatureHoverSplitItemData, b: FeatureHoverSplitItemData) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);

	function getOverlayClass(
		overlayStrength?: FeatureHoverSplitItemData["overlay_strength"],
	) {
		switch (overlayStrength) {
			case "soft":
				return "from-slate-950/10 via-slate-950/35 to-slate-950/65";
			case "strong":
				return "from-slate-950/25 via-slate-950/60 to-slate-950/90";
			case "medium":
			default:
				return "from-slate-950/15 via-slate-950/45 to-slate-950/80";
		}
	}
</script>

<section
	class="group/feature"
	data-directus={setAttr({
		collection: "block_feature_hover_split",
		item: data.id,
		fields: "headline,subheadline,items",
		mode: "popover",
	})}
>
	{#if data.headline || data.subheadline}
		<Container class="py-8 lg:py-12 lg:mt-20">
			{#if data.headline}
				<div use:fade={{ x: -20, delay: 0.2, duration: 1 }}>
					<Headline
						headline={data.headline}
						size="lg"
						class="tracking-tight"
					/>
				</div>
			{/if}

			{#if data.subheadline}
				<Tagline
					tagline={data.subheadline}
					data-directus={setAttr({
						collection: "block_posts",
						item: data.id,
						fields: "tagline",
						mode: "popover",
					})}
				/>
			{/if}
		</Container>
	{/if}

	{#snippet linkBtn(href: string, label: string, isExternal: boolean)}
		{#if !isExternal}
			<a
				href={resolve(href as "/")}
				class="inline-flex items-center bg-transparent px-5 py-2 text-sm font-medium text-white backdrop-blur-lg transition-all duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:px-8 lg:py-3 rounded-full border-2 border-white/50 hover:border-white cursor-grab"
			>
				{label}
			</a>
		{:else}
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center bg-transparent px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:px-8 lg:py-3 rounded-full border-2 border-white/50 hover:border-white cursor-pointer"
			>
				{label}
			</a>
		{/if}
	{/snippet}

	{#if items.length}
		<div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
			{#each items as item (item.id)}
				{@const link = resolveDirectusLink(item.link)}
				{@const overlayClass = getOverlayClass(item.overlay_strength)}
				<div
					class="feature-hover-split__panel group/panel relative flex w-full min-h-88 overflow-hidden px-5 py-12 md:min-h-110 lg:min-h-150 lg:px-8"
					data-directus={setAttr({
						collection: "block_feature_hover_split_items",
						item: item.id,
						fields: "title,description,link_label,link,image,overlay_strength",
						mode: "popover",
					})}
				>
					{#if item.image}a
						<DirectusImage
							uuid={getImageUuid(item.image)}
							alt={item.title || "Feature image"}
							class="absolute inset-0 block h-full min-h-full w-full min-w-full object-cover transition-transform duration-500 ease-out group-hover/panel:scale-105"
							sizes="(max-width: 1024px) 100vw, 50vw"
						/>
					{/if}

					<div
						class={`pointer-events-none absolute inset-0 bg-linear-to-t ${overlayClass}`}
					></div>
					<!-- <div
						class="pointer-events-none absolute inset-0 transition-colors duration-300 ease-out lg:group-hover/feature:bg-slate-950/40 lg:group-hover/panel:bg-transparent"
					></div> -->

					<div
						class="relative z-10 mt-auto mx-auto flex w-full max-w-md flex-col items-start text-left text-white transition-all duration-300 ease-out lg:group-hover/feature:opacity-50 lg:group-hover/panel:-translate-y-2 lg:group-hover/panel:opacity-100 border-2 border-white/50 p-10 rounded-sm backdrop-blur-md h-full justify-between"
					>
						<div class="space-y-2">
							{#if item.title}
								<h3
									class="text-4xl font-serif font-semibold text-inherit"
								>
									{item.title}
								</h3>
							{/if}
							{#if item.description}
								<p class="text-lg leading-7 text-white/90">
									{item.description}
								</p>
							{/if}
						</div>

						{#if link.href && item.link_label}
							<div class="mt-5">
								{@render linkBtn(
									link.href,
									item.link_label,
									!!link.isExternal,
								)}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
