import type { Component } from "svelte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = Component<any>;
type BlockLoader = () => Promise<{ default: BlockComponent }>;

const blockLoaders: Record<string, BlockLoader> = {
	block_adv_gallery: () => import("$lib/components/blocks/AdvGallery.svelte"),
	block_hero: () => import("$lib/components/blocks/Hero.svelte"),
	block_typography_intro: () => import("$lib/components/blocks/Intro.svelte"),
	block_richtext: () => import("$lib/components/blocks/RichText.svelte"),
	block_pricing: () => import("$lib/components/blocks/Pricing.svelte"),
	block_posts: () => import("$lib/components/blocks/Posts.svelte"),
	block_form: () => import("$lib/components/blocks/Form.svelte"),
	block_template: () => import("$lib/components/blocks/Template.svelte"),
	block_image_divider: () => import("$lib/components/blocks/ImageDivider.svelte"),
	block_banner_cta: () => import("$lib/components/blocks/Banner.svelte"),
	block_global_banner_ref: () => import("$lib/components/blocks/Banner.svelte"),
	block_global_fellows_list_ref: () => import("$lib/components/blocks/FellowsList.svelte"),
	block_global_books_ref: () => import("$lib/components/blocks/Books.svelte"),
	block_global_video_ref: () => import("$lib/components/blocks/features/FeatureVideo.svelte"),
	block_typography_image_text: () =>
		import("$lib/components/blocks/typography/TypoTemplete.svelte"),
	block_card: () => import("$lib/components/blocks/Cards.svelte"),
	block_teaser_cards: () => import("$lib/components/blocks/TeaserCards.svelte"),
	block_fellows_list: () => import("$lib/components/blocks/FellowsList.svelte"),
	block_feature_split: () => import("$lib/components/blocks/features/FeatureSplit.svelte"),
	block_feature_hover_split: () =>
		import("$lib/components/blocks/features/FeatureHoverSplit.svelte"),
	block_feature_sticky: () => import("$lib/components/blocks/features/FeatureSticky.svelte"),
	block_feature_big_image: () =>
		import("$lib/components/blocks/features/FeatureBigImage.svelte"),
	block_stats: () => import("$lib/components/blocks/Stats.svelte"),
	block_sponsors: () => import("$lib/components/blocks/Sponsors.svelte"),
	block_videos: () => import("$lib/components/blocks/Videos.svelte"),
	block_photo_gallery: () => import("$lib/components/blocks/PhotoGallery.svelte"),
};

const pending = new Map<string, Promise<BlockComponent | null>>();
const resolved = new Map<string, BlockComponent | null>();

export const loadBlock = (collection: string): Promise<BlockComponent | null> => {
	let promise = pending.get(collection);
	if (!promise) {
		const loader = blockLoaders[collection];
		promise = (
			loader ? loader().then((m) => m.default) : Promise.resolve(null)
		).then((component) => {
			resolved.set(collection, component);
			return component;
		});
		pending.set(collection, promise);
	}
	return promise;
};

/**
 * Warm the block-component cache for every collection on a page.
 * Call from a universal `load` so chunks are fetched before render
 * (on the server for SSR, in the browser on client navigations).
 */
export const preloadBlocks = async (collections: Iterable<string>): Promise<void> => {
	await Promise.all(
		[...new Set(collections)].map((collection) => loadBlock(collection).catch(() => null)),
	);
};

/**
 * Synchronously read the cache.
 * `undefined` = not loaded yet, `null` = loaded but unknown collection.
 */
export const getBlockComponent = (
	collection: string,
): BlockComponent | null | undefined => {
	if (!resolved.has(collection)) return undefined;
	return resolved.get(collection) ?? null;
};
