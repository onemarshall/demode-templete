<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from "$app/paths";
	import { parallaxImage } from "scripts/actions";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/shared/utils/directus-links";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import { fade } from "scripts/actions";
	import {
		getImageUuid,
		getImageObjectPosition,
	} from "$lib/shared/utils/get-image-uuid";
	import { Button } from "$lib/components/ui/button/index.js";

	interface FeatureBigImageLink {
		type?: "page" | "post" | "url" | null;
		url?: string | null;
		page?: { permalink?: string | null } | null;
		post?: { slug?: string | null } | null;
	}

	interface FeatureBigImageBlock {
		id: string | number;
		headline?: string | null;
		description?: string | null;
		word?: string | null;
		cta_label?: string | null;
		cta_link?: FeatureBigImageLink | DirectusLinkValue | string | null;
		show_cta?: boolean | null;
		image?:
			| string
			| null
			| {
					id: string;
					focal_point_x?: number | null;
					focal_point_y?: number | null;
					width?: number | null;
					height?: number | null;
			  };
		image_alt?: string | null;
		layout?: "v1" | "v2" | "v3";
	}

	let { data } = $props<{
		data: FeatureBigImageBlock;
	}>();

	const link = $derived(resolveDirectusLink(data.cta_link));
	const headline = $derived(
		data.headline?.trim() || "Understanding Our Mission",
	);
	const word = $derived(data.word?.trim() || "");
	const description = $derived(
		data.description?.trim() ||
			"A brief overview of what we do and why it matters",
	);
	const ctaLabel = $derived(
		data.cta_label?.trim() || "Learn more about our mission",
	);
	const shouldShowCta = $derived(
		getShouldShowCta(data.show_cta, ctaLabel, link.href),
	);

	function getShouldShowCta(
		showCta?: boolean | null,
		label?: string | null,
		href?: string | null,
	) {
		return showCta !== false && Boolean(label?.trim() && href?.trim());
	}
</script>

<section
	class="feature-v5"
	data-directus={setAttr({
		collection: "block_feature_big_image",
		item: data.id,
		fields: "headline,word,description,cta_label,cta_link,show_cta,image,image_alt",
		mode: "popover",
	})}
>
	<Container
		class={data.layout === "v1" ? " bg-white py-25" : " bg-white pt-10"}
	>
		<div class="grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
			{#if word}
				<div
					use:fade={{ x: -20, delay: 0.4, duration: 1 }}
					class="hidden lg:col-span-1 lg:flex lg:justify-start lg:pt-1"
				>
					<span
						class="text-sm font-medium tracking-[0.24em] text-gray-600 [writing-mode:vertical-rl]"
					>
						{word}
					</span>
				</div>
			{/if}

			<div
				use:fade={{ x: -70, duration: 1.3 }}
				class={word
					? "min-w-0 lg:col-span-9 lg:col-start-1 text-balance"
					: data.layout === "v1"
						? "min-w-0 lg:col-span-10 lg:col-start-3"
						: "min-w-0 lg:col-span-10 lg:col-start-2"}
			>
				<Headline
					{headline}
					size="xl"
					class="tracking-tight lg:leading-none"
				/>
			</div>

			<div
				class={data.layout === "v1"
					? "min-w-0 lg:col-span-7 lg:col-start-2 lg:pt-2"
					: "min-w-0 lg:col-span-7 lg:col-start-1 lg:pt-2"}
			>
				<p
					use:fade={{ x: -20, delay: 0.2, duration: 1 }}
					class="text-balance font-sans text-2xl md:text-4xl font-light leading-snug text-gray-600"
				>
					{description}
				</p>

				{#if shouldShowCta}
					<div
						class="mt-10"
						use:fade={{ x: -20, delay: 0.2, duration: 1 }}
					>
						{#if !link.isExternal}
							<Button
								variant="outline"
								class="rounded-full bg-white"
								size="lg"
								href={resolve(link.href as "/")}
							>
								{ctaLabel}
							</Button>
						{:else}
							<Button
								variant="outline"
								href={link.href}
								rel="noopener noreferrer"
								target="_blank"
							>
								{ctaLabel}
							</Button>
						{/if}
					</div>
				{/if}
			</div>

			{#if data.image && data.layout === "v2"}
				<figure
					use:parallaxImage={{ yPercent: 30, scrub: 0.4 }}
					class="mx-auto w-full overflow-hidden rounded-sm lg:col-span-8 lg:col-start-6"
				>
					<DirectusImage
						uuid={getImageUuid(data.image)}
						alt={data.image_alt || headline || "Feature image"}
						layout="constrained"
						class="block aspect-video w-full object-cover ring-1 ring-black/5 shadow-xl"
						objectPosition={getImageObjectPosition(data.image)}
						sizes="(max-width: 1024px) calc(100vw - 3rem), 64rem"
						maxWidth={1024}
					/>
				</figure>
			{/if}
			{#if data.image && data.layout === "v3"}
				<figure
					use:parallaxImage={{ yPercent: 30, scrub: 0.4 }}
					class="mt-7 mx-auto w-full overflow-hidden rounded-sm lg:col-span-12 lg:col-start-1 md:h-[60vh]"
				>
					<DirectusImage
						uuid={getImageUuid(data.image)}
						alt={data.image_alt || headline || "Feature image"}
						layout="constrained"
						class="block aspect-video w-full object-cover ring-1 ring-black/5 shadow-xl"
						objectPosition={getImageObjectPosition(data.image)}
						sizes="100vw"
						maxWidth={1920}
					/>
				</figure>
			{/if}
		</div>
	</Container>
</section>
