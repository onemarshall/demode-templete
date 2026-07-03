<script lang="ts">
	import { onMount } from "svelte";
	import {
		Dialog,
		DialogContent,
		DialogTitle,
		DialogDescription,
	} from "$lib/components/ui/dialog";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";

	interface ImageFile {
		id: string;
		title?: string | null;
		filename_download?: string | null;
		width?: number | null;
		height?: number | null;
	}

	interface GalleryItem {
		id: string | number;
		sort?: number | null;
		directus_files_id?: ImageFile | string | null;
	}

	interface PhotoGalleryBlock {
		id: string | number;
		title?: string | null;
		subtitle?: string | null;
		images?: GalleryItem[] | null;
	}

	let { data } = $props<{ data: PhotoGalleryBlock }>();

	const imageOf = (item: GalleryItem): ImageFile | null => {
		const file = item.directus_files_id;
		if (!file) return null;
		if (typeof file === "string") return { id: file };
		return file;
	};

	const items = $derived(
		(data.images ?? [])
			.slice()
			.filter((i: GalleryItem) => imageOf(i) !== null)
			.sort(
				(a: GalleryItem, b: GalleryItem) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);

	let lightboxOpen = $state(false);
	let activeIndex = $state(0);

	const activeItem = $derived(items[activeIndex] ?? null);
	const activeImage = $derived(activeItem ? imageOf(activeItem) : null);

	const openAt = (index: number) => {
		activeIndex = index;
		lightboxOpen = true;
	};

	const prev = () => {
		if (items.length === 0) return;
		activeIndex = (activeIndex - 1 + items.length) % items.length;
	};

	const next = () => {
		if (items.length === 0) return;
		activeIndex = (activeIndex + 1) % items.length;
	};

	const fullUrl = (img: ImageFile | null): string | null => {
		if (!img) return null;
		return getDirectusAssetURL(img.id, {
			width: 1920,
			quality: 85,
			fit: "inside",
			withoutEnlargement: true,
		});
	};

	const activeUrl = $derived(fullUrl(activeImage));

	// Preload adjacent images for instant navigation.
	$effect(() => {
		if (!lightboxOpen || items.length === 0) return;
		const indices = [
			(activeIndex + 1) % items.length,
			(activeIndex - 1 + items.length) % items.length,
		];
		indices.forEach((i) => {
			const img = imageOf(items[i]);
			const url = fullUrl(img);
			if (url) {
				const preload = new Image();
				preload.src = url;
			}
		});
	});

	// Keyboard navigation.
	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!lightboxOpen) return;
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				prev();
			} else if (e.key === "ArrowRight" || e.key === " ") {
				e.preventDefault();
				next();
			} else if (e.key === "Escape") {
				e.preventDefault();
				lightboxOpen = false;
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	// Touch swipe.
	let touchStartX = 0;
	let touchStartY = 0;
	const onTouchStart = (e: TouchEvent) => {
		touchStartX = e.touches[0]?.clientX ?? 0;
		touchStartY = e.touches[0]?.clientY ?? 0;
	};
	const onTouchEnd = (e: TouchEvent) => {
		const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX;
		const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY;
		if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
			if (dx > 0) prev();
			else next();
		}
	};
</script>

<section
	class="pb-10"
	data-directus={setAttr({
		collection: "block_photo_gallery",
		item: data.id,
		fields: "title,subtitle,images",
		mode: "popover",
	})}
>
	<Container>
		{#if data.title || data.subtitle}
			<header class="mb-10 max-w-3xl">
				<Headline headline={data.title} size="md" class="tracking-tight" />
				{#if data.subtitle}
					<p class="mt-3 text-sm leading-relaxed text-gray-500">
						{data.subtitle}
					</p>
				{/if}
			</header>
		{/if}

		{#if items.length === 0}
			<p class="py-16 text-center text-sm text-gray-400">
				No images yet.
			</p>
		{:else}
			<div
				class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-8"
			>
				{#each items as item, i (item.id)}
					{@const img = imageOf(item)}
					{#if img}
						<button
							type="button"
							class="group relative aspect-square overflow-hidden rounded-xs bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							onclick={() => openAt(i)}
							aria-label={`Open image ${i + 1} of ${items.length}`}
						>
							<DirectusImage
								uuid={img.id}
								alt={img.title ?? ""}
								fill
								layout="fullWidth"
								maxWidth={520}
								class="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
								sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
							/>
							<span
								class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/5"
							></span>
						</button>
					{/if}
				{/each}
			</div>
		{/if}
	</Container>
</section>

<Dialog bind:open={lightboxOpen}>
	<DialogContent
		showCloseButton={false}
		class="h-screen max-h-screen w-screen max-w-screen! bg-black/95 border-0 p-0 gap-0 text-white rounded-none overflow-hidden"
	>
		{#if activeItem && activeImage}
			<DialogTitle class="sr-only">
				{activeImage?.title || `Image ${activeIndex + 1} of ${items.length}`}
			</DialogTitle>
			<DialogDescription class="sr-only">
				Gallery image {activeIndex + 1} of {items.length}
			</DialogDescription>

			<div
				class="relative flex h-full w-full items-center justify-center"
				role="group"
				aria-label="Image viewer — swipe to navigate"
				ontouchstart={onTouchStart}
				ontouchend={onTouchEnd}
			>
				<!-- Image -->
				{#if activeUrl}
					{#key activeIndex}
						<img
							src={activeUrl}
							alt={activeImage?.title ?? ""}
							class="max-h-[calc(100vh-6rem)] max-w-[calc(100vw-4rem)] object-contain animate-fade"
							draggable="false"
						/>
					{/key}
				{/if}

				<!-- Prev -->
				{#if items.length > 1}
					<button
						type="button"
						class="absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:left-6"
						onclick={prev}
						aria-label="Previous image"
					>
						<svg
							class="size-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"
						>
							<path
								d="M15 18l-6-6 6-6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					<button
						type="button"
						class="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:right-6"
						onclick={next}
						aria-label="Next image"
					>
						<svg
							class="size-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"
						>
							<path
								d="M9 6l6 6-6 6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				{/if}

				<!-- Counter (top-left) -->
				<div
					class="absolute left-4 top-4 font-serif text-sm tracking-wide text-white/75 md:left-8 md:top-6"
				>
					<span class="tabular-nums"
						>{String(activeIndex + 1).padStart(2, "0")}</span
					>
					<span class="mx-2 text-white/40">/</span>
					<span class="tabular-nums"
						>{String(items.length).padStart(2, "0")}</span
					>
				</div>

				<!-- Close (top-right) -->
				<button
					type="button"
					class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/90 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:right-8 md:top-6"
					onclick={() => (lightboxOpen = false)}
					aria-label="Close gallery"
				>
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						aria-hidden="true"
					>
						<path
							d="M6 6l12 12M18 6L6 18"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>

				<!-- Caption (bottom) -->
			</div>
		{/if}
	</DialogContent>
</Dialog>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	:global(.animate-fade) {
		animation: fade-in 200ms ease-out;
	}
</style>
