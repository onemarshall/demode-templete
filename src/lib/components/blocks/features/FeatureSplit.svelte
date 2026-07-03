<!--
  BLOCK CATALOG — block_feature_split
  ════════════════════════════════════════════════════════════════════════════════

  VISUAL
  Full-width stacked rows. Each row splits 50/50: large image one side, text
  panel the other. Image is fixed height (30em), flush edge-to-edge. Items
  share rounded corners at the outer boundary only, making a stacked sequence
  read as a single unified block rather than separate cards.
  An optional centred headline + subheadline sits above the rows.

  BEST FOR
  Presenting 2–5 distinct features, services, or topics that each need an image
  and a paragraph of explanation. Works especially well when each item has a
  meaningfully different image — the alternating layout (via reverse_layout)
  creates visual rhythm down the page. Light/dark theme can be set per item to
  add contrast between rows.

  AVOID WHEN
  — The image is decorative or generic (use block_feature_big_image instead,
    where the photo IS the statement).
  — You have more than a headline + short paragraph per item; text gets cramped
    in a 50% column at this size.
  — You only have one item; a single row reads as orphaned. Use block_feature_big_image
    or block_richtext with an image instead.

  TONE / FEEL
  Structured and editorial. Deliberate pacing — each row asks the reader to
  stop, look, read. Not high-energy. Suits academic, research, or institutional
  content where each topic deserves equal weight.

  REQUIRED CONTENT
  At least 2 items, each with: title, description, image.
  link_label + link are optional but recommended — they give each row a clear
  next action. reverse_layout should alternate (true/false) across items for
  visual rhythm.

  PAIRS WELL WITH
  — block_hero or block_banner_cta above (sets the section up)
  — block_posts or block_teaser_cards below (moves from features into content)
  — Avoid pairing two block_feature_split sections back-to-back without a
    visual break between them.

  FIELDS
  headline, subheadline (section header, optional)
  items[]: title, description, image, link, link_label, theme, reverse_layout, sort
  ════════════════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
	import { setAttr } from "$lib/features/directus/visualEditing";
	import FeatureSplitItem from "./FeatureSplitItem.svelte";
	import Tagline from "$lib/components/ui/Tagline.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface FeatureSplitItemLink {
		type?: "page" | "post" | "url" | null;
		url?: string | null;
		page?: { permalink?: string | null } | null;
		post?: { slug?: string | null } | null;
	}

	interface FeatureSplitItemData {
		id: string | number;
		title?: string | null;
		description?: string | null;
		link_label?: string | null;
		theme?: "light" | "dark" | null;
		image?: string | null | { id: string };
		link?: FeatureSplitItemLink | string | null;
		reverse_layout?: boolean | null;
		sort?: number | null;
	}

	interface FeatureSplitBlock {
		id: string | number;
		headline?: string | null;
		subheadline?: string | null;
		items?: FeatureSplitItemData[] | null;
	}

	let { data } = $props<{
		data: FeatureSplitBlock;
	}>();

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: FeatureSplitItemData, b: FeatureSplitItemData) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);
</script>

<section
	data-directus={setAttr({
		collection: "block_feature_split",
		item: data.id,
		fields: "headline,subheadline,items",
		mode: "popover",
	})}
>
	{#if data.headline || data.subheadline}
		<div
			class="mx-auto w-[calc(100%-3rem)] max-w-lg py-10 text-center lg:max-w-3xl lg:py-14"
		>
			<Headline headline={data.headline} size="md" class="tracking-tight" />
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
		</div>
	{/if}

	{#if items.length}
		{#each items as item, index (item.id)}
			<FeatureSplitItem
				data={{
					...item,
					is_first: index === 0,
					is_last: index === items.length - 1,
				}}
			/>
		{/each}
	{/if}
</section>
