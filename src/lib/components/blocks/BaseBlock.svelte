<script lang="ts">
	import AdvGallery from "$lib/components/blocks/AdvGallery.svelte";
	import Hero from "$lib/components/blocks/Hero.svelte";
	import Intro from "$lib/components/blocks/Intro.svelte";
	import RichText from "$lib/components/blocks/RichText.svelte";
	import Pricing from "$lib/components/blocks/Pricing.svelte";
	import Posts from "$lib/components/blocks/Posts.svelte";
	import Form from "$lib/components/blocks/Form.svelte";
	import Template from "$lib/components/blocks/Template.svelte";
	import ImageDivider from "$lib/components/blocks/ImageDivider.svelte";
	import Banner from "$lib/components/blocks/Banner.svelte";
	import TypoImageText from "$lib/components/blocks/typography/TypoTemplete.svelte";
	import Cards from "$lib/components/blocks/Cards.svelte";
	import TeaserCards from "$lib/components/blocks/TeaserCards.svelte";
	import FellowsList from "$lib/components/blocks/FellowsList.svelte";
	import Books from "$lib/components/blocks/Books.svelte";
	import FeatureSplit from "$lib/components/blocks/features/FeatureSplit.svelte";
	import FeatureHoverSplit from "$lib/components/blocks/features/FeatureHoverSplit.svelte";
	import FeatureSticky from "$lib/components/blocks/features/FeatureSticky.svelte";
	import FeatureBigImage from "$lib/components/blocks/features/FeatureBigImage.svelte";
	import FeatureVideo from "$lib/components/blocks/features/FeatureVideo.svelte";
	import Stats from "$lib/components/blocks/Stats.svelte";
	import Sponsors from "$lib/components/blocks/Sponsors.svelte";
	import Videos from "$lib/components/blocks/Videos.svelte";
	import PhotoGallery from "$lib/components/blocks/PhotoGallery.svelte";

	interface BaseBlockProps {
		block: {
			collection: string;
			item: unknown;
			id: string;
		};
	}

	type ComponentType = {
		block_adv_gallery: typeof AdvGallery;
		block_hero: typeof Hero;
		block_typography_intro: typeof Intro;
		block_richtext: typeof RichText;
		block_pricing: typeof Pricing;
		block_posts: typeof Posts;
		block_form: typeof Form;
		block_template: typeof Template;
		block_image_divider: typeof ImageDivider;
		block_banner_cta: typeof Banner;
		block_global_banner_ref: typeof Banner;
		block_global_fellows_list_ref: typeof FellowsList;
		block_global_books_ref: typeof Books;
		block_global_video_ref: typeof FeatureVideo;
		block_typography_image_text: typeof TypoImageText;
		block_card: typeof Cards;
		block_teaser_cards: typeof TeaserCards;
		block_fellows_list: typeof FellowsList;
		block_feature_split: typeof FeatureSplit;
		block_feature_hover_split: typeof FeatureHoverSplit;
		block_feature_sticky: typeof FeatureSticky;
		block_feature_big_image: typeof FeatureBigImage;
		block_stats: typeof Stats;
		block_sponsors: typeof Sponsors;
		block_videos: typeof Videos;
		block_photo_gallery: typeof PhotoGallery;
	};

	let { block }: BaseBlockProps = $props();

	const components: ComponentType = {
		block_adv_gallery: AdvGallery,
		block_hero: Hero,
		block_typography_intro: Intro,
		block_richtext: RichText,
		block_pricing: Pricing,
		block_posts: Posts,
		block_form: Form,
		block_template: Template,
		block_image_divider: ImageDivider,
		block_banner_cta: Banner,
		block_global_banner_ref: Banner,
		block_global_fellows_list_ref: FellowsList,
		block_global_books_ref: Books,
		block_global_video_ref: FeatureVideo,
		block_typography_image_text: TypoImageText,
		block_card: Cards,
		block_teaser_cards: TeaserCards,
		block_fellows_list: FellowsList,
		block_feature_split: FeatureSplit,
		block_feature_hover_split: FeatureHoverSplit,
		block_feature_sticky: FeatureSticky,
		block_feature_big_image: FeatureBigImage,
		block_stats: Stats,
		block_sponsors: Sponsors,
		block_videos: Videos,
		block_photo_gallery: PhotoGallery,
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Component = $derived(
		components[block.collection as keyof ComponentType] as any,
	);

	// Global ref blocks nest the actual data inside a reference field — unwrap it
	const unwrapItem = (collection: string, item: unknown): unknown => {
		if (!item || typeof item !== "object") return item;
		const refMap: Record<string, string> = {
			block_global_banner_ref: "banner_reference",
			block_global_video_ref: "block_feature_video",
			block_global_fellows_list_ref: "fellows_list_reference",
			block_global_books_ref: "books_reference",
		};
		const key = refMap[collection];
		if (key && key in (item as Record<string, unknown>)) {
			return (item as Record<string, unknown>)[key];
		}
		return item;
	};

	const componentProps = $derived({
		data: unwrapItem(block.collection, block.item),
	});
</script>

{#if block.collection in components && Component}
	<Component {...componentProps} />
{:else}
	<div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
		<p class="font-bold">
			Warning: No component found for block type "{block.collection}"
		</p>
		<pre class="text-xs mt-2">{JSON.stringify(block, null, 2)}</pre>
	</div>
{/if}
