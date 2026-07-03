<script lang="ts">
	import { onMount } from "svelte";
	import { Dialog, DialogContent, DialogTitle, DialogDescription } from "$lib/components/ui/dialog";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface VideoItem {
		id: string | number;
		sort?: number | null;
		vimeo_id?: string | null;
		title?: string | null;
		description?: string | null;
		category?: string | null;
		featured?: boolean | null;
	}

	interface VideosBlock {
		id: string | number;
		title?: string | null;
		subtitle?: string | null;
		all_filter_label?: string | null;
		featured_heading?: string | null;
		featured_badge_label?: string | null;
		videos?: VideoItem[] | null;
	}

	interface OEmbedMeta {
		thumbnail: string | null;
		title: string | null;
		duration: number | null;
	}

	let { data } = $props<{ data: VideosBlock }>();

	const allFilterLabel = $derived(data.all_filter_label?.trim() || "All");
	const featuredHeading = $derived(data.featured_heading?.trim() || "Featured Video");
	const featuredBadgeLabel = $derived(data.featured_badge_label?.trim() || "Featured");

	const sortedVideos = $derived(
		(data.videos ?? [])
			.slice()
			.filter((v: VideoItem) => Boolean(v.vimeo_id))
			.sort((a: VideoItem, b: VideoItem) => (a.sort ?? 0) - (b.sort ?? 0)),
	);

	const featuredVideo = $derived(
		sortedVideos.find((v: VideoItem) => v.featured) ?? null,
	);

	const categories = $derived.by(() => {
		const values = sortedVideos
			.map((v: VideoItem) => v.category?.trim())
			.filter((v: string | undefined): v is string => Boolean(v));
		const unique = Array.from(new Set(values)) as string[];
		return unique.sort((a, b) => a.localeCompare(b));
	});

	let activeCategory = $state<string | null>(null);
	let searchTerm = $state("");
	let playerOpen = $state(false);
	let selectedVideo = $state<VideoItem | null>(null);

	const oembedCache = $state<Record<string, OEmbedMeta>>({});

	const fetchOEmbed = async (vimeoId: string): Promise<OEmbedMeta> => {
		const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}`;
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`oEmbed ${res.status}`);
			const json = (await res.json()) as {
				thumbnail_url?: string;
				title?: string;
				duration?: number;
			};
			return {
				thumbnail: json.thumbnail_url ?? null,
				title: json.title ?? null,
				duration: typeof json.duration === "number" ? json.duration : null,
			};
		} catch {
			return { thumbnail: null, title: null, duration: null };
		}
	};

	onMount(() => {
		sortedVideos.forEach(async (v: VideoItem) => {
			const id = v.vimeo_id;
			if (!id || oembedCache[id]) return;
			const meta = await fetchOEmbed(id);
			oembedCache[id] = meta;
		});
	});

	const formatDuration = (seconds: number | null): string | null => {
		if (!seconds || seconds <= 0) return null;
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const hasFilters = $derived(activeCategory !== null || searchTerm.trim() !== "");

	const showHero = $derived(Boolean(featuredVideo) && !hasFilters);

	const filteredVideos = $derived.by(() => {
		const query = searchTerm.trim().toLowerCase();
		return sortedVideos.filter((v: VideoItem) => {
			if (showHero && v.id === featuredVideo?.id) return false;
			if (activeCategory !== null && v.category !== activeCategory) return false;
			if (!query) return true;
			const meta = v.vimeo_id ? oembedCache[v.vimeo_id] : undefined;
			const haystack = [v.title, v.description, meta?.title].filter(Boolean).join(" ").toLowerCase();
			return haystack.includes(query);
		});
	});

	const clearAll = () => {
		activeCategory = null;
		searchTerm = "";
	};

	const openVideo = (v: VideoItem) => {
		selectedVideo = v;
		playerOpen = true;
	};

	const displayTitle = (v: VideoItem): string => {
		const fallback = v.vimeo_id ? oembedCache[v.vimeo_id]?.title : null;
		return (v.title?.trim() || fallback || "Untitled video") as string;
	};
</script>

<section
	class="py-[clamp(3rem,6vw,5rem)]"
	data-directus={setAttr({
		collection: "block_videos",
		item: data.id,
		fields: "title,subtitle,all_filter_label,featured_heading,featured_badge_label,videos",
		mode: "popover",
	})}
>
	<Container>
		{#if data.title || data.subtitle}
			<div class="mb-10">
				<Headline headline={data.title} size="lg" />
				{#if data.subtitle}
					<p class="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
						{data.subtitle}
					</p>
				{/if}
			</div>
		{/if}

		<div class="flex flex-col gap-[clamp(2rem,4vw,4rem)] lg:flex-row lg:items-start">
			<!-- ═══ LEFT: Filter sidebar ═══ -->
			<aside class="self-start lg:w-64">
				<div class="top-28 space-y-8">
					<!-- Search -->
					<div>
						<h3 class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
							Search
						</h3>
						<input
							type="search"
							bind:value={searchTerm}
							placeholder="Search videos..."
							class="w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none"
						/>
					</div>

					<!-- Categories -->
					{#if categories.length > 0}
						<nav>
							<h3 class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
								Category
							</h3>
							<ul class="space-y-1">
								<li>
									<button
										type="button"
										onclick={() => (activeCategory = null)}
										class="block w-full py-1.5 text-left text-sm transition-colors {activeCategory ===
										null
											? 'font-semibold text-primary'
											: 'text-gray-600 hover:text-gray-900'}"
									>
										{allFilterLabel}
									</button>
								</li>
								{#each categories as cat (cat)}
									<li>
										<button
											type="button"
											onclick={() => (activeCategory = cat)}
											class="block w-full py-1.5 text-left text-sm transition-colors {activeCategory ===
											cat
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{cat}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					{#if hasFilters}
						<button
							type="button"
							onclick={clearAll}
							class="inline-block border-b border-gray-400 pb-0.5 text-xs uppercase tracking-[0.1em] text-gray-500 transition-colors hover:border-gray-800 hover:text-gray-800"
						>
							Clear all filters
						</button>
					{/if}
				</div>
			</aside>

			<!-- ═══ RIGHT: Video grid ═══ -->
			<div class="min-w-0 flex-1">
				<!-- ═══ FEATURED HERO ═══ -->
				{#if showHero && featuredVideo}
					{@const heroMeta = featuredVideo.vimeo_id ? oembedCache[featuredVideo.vimeo_id] : undefined}
					{@const heroThumb = heroMeta?.thumbnail}
					{@const heroDuration = formatDuration(heroMeta?.duration ?? null)}
					<button
						type="button"
						class="group mb-10 flex w-full cursor-pointer flex-col overflow-hidden rounded-sm border border-gray-200 bg-white text-left transition-colors duration-300 hover:border-primary/40 md:flex-row"
						onclick={() => openVideo(featuredVideo)}
						data-directus={setAttr({
							collection: "block_videos_items",
							item: featuredVideo.id,
							fields: "vimeo_id,title,description,category,featured",
							mode: "popover",
						})}
					>
						<div class="relative aspect-video w-full shrink-0 overflow-hidden bg-gray-900 md:aspect-auto md:w-1/2">
							{#if heroThumb}
								<img
									src={heroThumb}
									alt={displayTitle(featuredVideo)}
									class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
									loading="eager"
								/>
							{:else}
								<div class="size-full bg-gradient-to-br from-gray-700 to-gray-900"></div>
							{/if}
							<div class="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-300 group-hover:bg-black/30">
								<span class="flex size-20 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition-transform duration-300 group-hover:scale-110">
									<svg class="ml-1 size-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
										<path d="M8 5v14l11-7z" />
									</svg>
								</span>
							</div>
							<span class="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
								{featuredBadgeLabel}
							</span>
							{#if heroDuration}
								<span class="absolute bottom-3 right-3 rounded-sm bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
									{heroDuration}
								</span>
							{/if}
						</div>

						<div class="flex flex-1 flex-col justify-center p-6 sm:p-10">
							<p class="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
								{featuredHeading}
							</p>
							<h3 class="font-serif text-2xl font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary sm:text-4xl">
								{displayTitle(featuredVideo)}
							</h3>
							{#if featuredVideo.category}
								<p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
									{featuredVideo.category}
								</p>
							{/if}
							{#if featuredVideo.description}
								<p class="mt-4 line-clamp-4 text-sm leading-relaxed text-gray-500">
									{featuredVideo.description}
								</p>
							{/if}
							<span class="mt-6 inline-flex items-center gap-2 text-xs font-medium text-primary">
								Watch now
								<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
									<path d="M7 17L17 7M17 7H7M17 7v10" />
								</svg>
							</span>
						</div>
					</button>
				{/if}

				<div class="mb-8 flex items-baseline justify-between border-b border-gray-200 pb-4">
					<p class="text-sm text-gray-500">
						{filteredVideos.length}
						{filteredVideos.length === 1 ? "video" : "videos"}
						{#if hasFilters}<span class="text-gray-400"> &mdash; filtered</span>{/if}
					</p>
				</div>

				{#if filteredVideos.length === 0}
					<div class="py-20 text-center">
						<p class="font-secondary text-lg text-gray-400">
							No videos match the current filters.
						</p>
						{#if hasFilters}
							<button
								type="button"
								onclick={clearAll}
								class="mt-4 inline-block text-sm text-primary underline"
							>
								Clear filters
							</button>
						{/if}
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
						{#each filteredVideos as video (video.id)}
							{@const meta = video.vimeo_id ? oembedCache[video.vimeo_id] : undefined}
							{@const thumb = meta?.thumbnail}
							{@const duration = formatDuration(meta?.duration ?? null)}
							<button
								type="button"
								class="group flex cursor-pointer flex-col text-left"
								onclick={() => openVideo(video)}
								data-directus={setAttr({
									collection: "block_videos_items",
									item: video.id,
									fields: "vimeo_id,title,description,category,featured",
									mode: "popover",
								})}
							>
								<div
									class="relative aspect-video w-full overflow-hidden rounded-sm bg-gray-900"
								>
									{#if thumb}
										<img
											src={thumb}
											alt={displayTitle(video)}
											class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
											loading="lazy"
										/>
									{:else}
										<div
											class="size-full bg-gradient-to-br from-gray-700 to-gray-900"
										></div>
									{/if}
									<!-- Play overlay -->
									<div
										class="absolute inset-0 flex items-center justify-center bg-black/10 opacity-100 transition-opacity duration-300 group-hover:bg-black/30"
									>
										<span
											class="flex size-14 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md transition-transform duration-300 group-hover:scale-110"
										>
											<svg
												class="ml-0.5 size-5"
												viewBox="0 0 24 24"
												fill="currentColor"
												aria-hidden="true"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</span>
									</div>
									{#if duration}
										<span
											class="absolute bottom-2 right-2 rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
										>
											{duration}
										</span>
									{/if}
									{#if video.featured}
										<span
											class="absolute left-2 top-2 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white"
										>
											Featured
										</span>
									{/if}
								</div>

								<div class="mt-4 min-w-0">
									{#if video.category}
										<p
											class="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
										>
											{video.category}
										</p>
									{/if}
									<h3
										class="font-serif text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary"
									>
										{displayTitle(video)}
									</h3>
									{#if video.description}
										<p
											class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500"
										>
											{video.description}
										</p>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Container>
</section>

<Dialog bind:open={playerOpen}>
	<DialogContent
		class="max-w-5xl! bg-black border-0 p-0 overflow-hidden"
	>
		{#if selectedVideo?.vimeo_id}
			<DialogTitle class="sr-only">
				{displayTitle(selectedVideo)}
			</DialogTitle>
			<DialogDescription class="sr-only">
				{selectedVideo.description ?? "Vimeo video player"}
			</DialogDescription>
			<div class="aspect-video w-full">
				<iframe
					src={`https://player.vimeo.com/video/${selectedVideo.vimeo_id}?autoplay=1&title=0&byline=0&portrait=0`}
					title={displayTitle(selectedVideo)}
					class="size-full"
					frameborder="0"
					allow="autoplay; fullscreen; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		{/if}
	</DialogContent>
</Dialog>
