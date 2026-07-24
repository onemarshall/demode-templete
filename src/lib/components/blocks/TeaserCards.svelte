<script lang="ts">
	import { setAttr } from "$lib/features/directus/visualEditing";
	import type { DirectusLinkValue } from "$lib/utils/directus-links";
	import TeaserCardItem from "./TeaserCardItem.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface TeaserCardItemData {
		id: string | number;
		title?: string | null;
		label?: string | null;
		link?: string | DirectusLinkValue | null;
		image?: string | null | { id: string };
		sort?: number | null;
	}

	interface TeaserCardsBlock {
		id: string | number;
		label?: string | null;
		header?: string | null;
		description?: string | null;
		duotone?: boolean | null;
		duotone_color?: string | null;
		items?: TeaserCardItemData[] | null;
	}

	let { data } = $props<{
		data: TeaserCardsBlock;
	}>();

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: TeaserCardItemData, b: TeaserCardItemData) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);
</script>

<section
	class="py-12 lg:py-16"
	data-directus={setAttr({
		collection: "block_teaser_cards",
		item: data.id,
		fields: "label,header,description,duotone,duotone_color,items",
		mode: "popover",
	})}
>
	<Container>
		{#if data.header || data.label || data.description}
			<div class="mb-10 max-w-3xl">
				{#if data.label}
					<p
						class="mb-2 text-sm uppercase tracking-[0.2em] text-muted-foreground"
					>
						{data.label}
					</p>
				{/if}
				<Headline headline={data.header} size="lg" />
				{#if data.description}
					<p class="mt-4 text-base text-muted-foreground">
						{data.description}
					</p>
				{/if}
			</div>
		{/if}

		{#if items.length}
			<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				{#each items as item (item.id)}
					<TeaserCardItem
						data={item}
						duotone={data.duotone ?? false}
						duotoneColor={data.duotone_color ?? null}
					/>
				{/each}
			</div>
		{/if}
	</Container>
</section>
