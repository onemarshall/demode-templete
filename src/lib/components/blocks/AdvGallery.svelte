<script lang="ts">
	import { cn } from "$lib/utils";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { setAttr } from "$lib/services/directus/visualEditing";
	import { staggerFade } from "scripts/actions";
	import Container from "$lib/components/ui/Container.svelte";
	import { flipScroll } from "scripts/actions";
	type GalleryImage = {
		id: number;
		directus_files_id: string;
	};

	interface AdvGalleryBlock {
		id: number;
		layout_styles?: string | null;
		text?: string | null;
		images?: GalleryImage[] | null;
	}

	let { data } = $props<{ data: AdvGalleryBlock }>();

	const layout = $derived(data.layout_styles ?? "layout-a");
	const images = $derived(data.images ?? []);

	const gridClass = $derived(
		cn(
			"grid gap-2 gallery gallery--stack",
			layout === "layout-a" && "grid-cols-2 md:grid-cols-3",
			layout === "layout-b" && "grid-cols-2 md:grid-cols-4",
			layout === "layout-c" &&
				"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
		),
	);
</script>

<section
	class="adv-gallery py-12 lg:py-16"
	data-directus={setAttr({
		collection: "block_adv_gallery",
		item: data.id,
		fields: "layout_styles,text,images",
		mode: "popover",
	})}
>
	<Container>
		{#if data.text}
			<p class="mb-8 text-lg text-muted-foreground">{data.text}</p>
		{/if}

		{#if images.length}
			<div
				use:flipScroll={{ itemsSelector: ".gallery__item" }}
				class={gridClass}
				use:staggerFade={{ stagger: 0.15, y: 30 }}
			>
				{#each images as image (image.id)}
					<div
						class={cn(
							"gallery__item group relative overflow-hidden rounded-lg",
							layout === "layout-b" &&
								"first:col-span-2 first:row-span-2",
						)}
					>
						<DirectusImage
							uuid={image.directus_files_id}
							alt=""
							fill
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
							loading="lazy"
						/>
					</div>
				{/each}
			</div>
		{/if}
	</Container>
</section>

<style>
	.adv-gallery :global(.group) {
		aspect-ratio: 4 / 3;
	}

	/* End-state: collapse grid to single column for the stacked layout */
	.adv-gallery :global(.gallery--switch) {
		grid-template-columns: 1fr !important;
		max-width: 60%;
		margin-inline: auto;
		gap: 0 !important;
	}

	/* End-state layout when gallery--switch is applied */
	.adv-gallery :global(.gallery--switch .gallery__item) {
		grid-area: 1 / 1 / 2 / 2;
		position: relative;
	}

	/* Staggered offset + z-index for card-deck fan effect */
	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(1)) {
		z-index: 6;
	}

	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(2)) {
		translate: 1.5rem 0.5rem;
		z-index: 5;
	}

	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(3)) {
		translate: 3rem 1rem;
		z-index: 4;
	}

	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(4)) {
		translate: 4.5rem 1.5rem;
		z-index: 3;
	}

	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(5)) {
		translate: 6rem 2rem;
		z-index: 2;
	}

	.adv-gallery :global(.gallery--switch .gallery__item:nth-child(6)) {
		translate: 7.5rem 2.5rem;
		z-index: 1;
	}
</style>
