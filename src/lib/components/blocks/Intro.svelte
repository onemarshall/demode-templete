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
	import { getImageUuid } from "$lib/shared/utils/get-image-uuid";

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
		cta_label?: string | null;
		cta_link?: FeatureBigImageLink | DirectusLinkValue | string | null;
		show_cta?: boolean | null;
		image?: string | null | { id: string };
		image_alt?: string | null;
	}

	let { data } = $props<{
		data: FeatureBigImageBlock;
	}>();

	const link = $derived(resolveDirectusLink(data.cta_link));
	const headline = $derived(
		data.headline?.trim() || "Understanding Our Mission",
	);
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
	class="feature-v5 pb-12"
	data-directus={setAttr({
		collection: "block_feature_big_image",
		item: data.id,
		fields: "headline,description,cta_label,cta_link,show_cta,image,image_alt",
		mode: "popover",
	})}
>
	<div class="bg-gray-100 pt-12 pb-20 lg:pt-14 lg:pb-28">
		<Container>
			<div class="grid gap-y-6 lg:grid-cols-12 lg:gap-x-8 lg:col-start-4">
				<Headline
					{headline}
					as="h2"
					size="xl"
					class="min-w-0 tracking-tight lg:col-span-10 lg:leading-none"
				/>

				<div class="min-w-0 lg:col-span-7 lg:col-start-5 lg:pt-2">
					<p class="text-2xl leading-snug text-gray-600">
						{description}
					</p>

					{#if shouldShowCta}
						<div class="mt-3">
							{#if !link.isExternal}
								<a
									href={resolve(link.href as "/")}
									class="inline-flex items-center text-lg leading-snug text-gray-600 underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
								>
									{ctaLabel}
								</a>
							{:else}
								<a
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center text-lg leading-snug text-gray-600 underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
								>
									{ctaLabel}
								</a>
							{/if}
						</div>
					{/if}
				</div>

				{#if data.image && data.layout !== "v2"}
					<figure
						use:parallaxImage={{ yPercent: 30, scrub: 0.4 }}
						class="mx-auto w-full lg:w-[calc(100%-3rem)] overflow-hidden rounded-sm lg:col-span-8 lg:col-start-6"
					>
						<DirectusImage
							uuid={getImageUuid(data.image)}
							alt={data.image_alt || headline || "Feature image"}
							layout="constrained"
							class="block aspect-video w-full object-cover ring-1 ring-black/5 shadow-xl"
							sizes="(max-width: 1024px) calc(100vw - 3rem), 64rem"
							maxWidth={1024}
						/>
					</figure>
				{/if}
			</div>
		</Container>
	</div>
</section>
