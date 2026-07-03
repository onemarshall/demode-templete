<script lang="ts">
	import { cn } from "$lib/utils";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/shared/utils/directus-links";
	import CardItem from "./CardItem.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface CardBlockItem {
		id: string | number;
		title?: string | null;
		description?: string | null;
		content?: string | null;
		link?: string | DirectusLinkValue | null;
		image?: string | null | { id: string };
		tagline?: string | null;
		sort?: number | null;
	}

	interface NormalizedCardBlockItem extends Omit<CardBlockItem, "link"> {
		link?: string | null;
	}

	interface CardsBlock {
		id: string | number;
		header?: string | null;
		subheader?: string | null;
		styles?: string | null;
		items?: CardBlockItem[] | null;
	}

	let { data } = $props<{
		data: CardsBlock;
	}>();

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: CardBlockItem, b: CardBlockItem) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			)
			.map(
				(item: CardBlockItem): NormalizedCardBlockItem => ({
					...item,
					link: resolveDirectusLink(item.link).href,
				}),
			),
	);
	const gridClass = $derived(
		data.styles === "v2"
			? "grid gap-6 md:grid-cols-2"
			: "grid gap-6 lg:grid-cols-2 xl:grid-cols-3",
	);
</script>

<section
	class={cn(
		"cards-block py-12 lg:py-16",
		data.styles === "v2" && "bg-muted/20",
	)}
	data-directus={setAttr({
		collection: "block_card",
		item: data.id,
		fields: "header,subheader,styles,items",
		mode: "popover",
	})}
>
	<Container>
		{#if data.header || data.subheader}
			<div class="mx-auto mb-10 max-w-3xl text-center">
				{#if data.subheader}
					<p
						class="mb-2 text-sm uppercase tracking-[0.2em] text-muted-foreground"
					>
						{data.subheader}
					</p>
				{/if}
				<Headline
					headline={data.header}
					size="md"
					class="tracking-tight"
				/>
			</div>
		{/if}

		{#if items.length}
			<div class={gridClass}>
				{#each items as item (item.id)}
					<CardItem data={item} />
				{/each}
			</div>
		{/if}
	</Container>
</section>
