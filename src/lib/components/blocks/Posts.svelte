<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import setAttr from "$lib/features/directus/visualEditing";
	import type { BlockPost, Post } from "$lib/types/directus-schema";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import Tagline from "$lib/components/ui/Tagline.svelte";
	import { scale } from "svelte/transition";
	import Container from "$lib/components/ui/Container.svelte";
	import { fade } from "scripts/actions";
	import { formatDate } from "$lib/shared/utils/date";
	type BlockPostsPagination = {
		currentPage: number;
		perPage: number;
		totalCount: number;
		totalPages: number;
		paramName: string;
	};

	const getSelectedTagTitles = (tags: BlockPost["tags"]): string[] => {
		if (!tags || !Array.isArray(tags)) return [];

		return tags
			.map((tag) => {
				if (typeof tag === "string") return null;
				const tagId = tag?.tag_id;
				if (!tagId || typeof tagId === "string") return null;
				return tagId.title;
			})
			.filter((title): title is string => Boolean(title));
	};

	interface PostsProps {
		data: Pick<
			BlockPost,
			| "tagline"
			| "headline"
			| "limit"
			| "id"
			| "category"
			| "featured_only"
			| "post_type"
			| "tags"
			| "layout"
		> & {
			tagline: string;
			posts: Post[];
			pagination?: BlockPostsPagination;
		};
	}

	let { data }: PostsProps = $props();
	let {
		tagline,
		headline,
		posts,
		id,
		category,
		featured_only,
		post_type,
		tags,
		pagination,
		layout,
	} = $derived(data);
	let selectedTagTitles = $derived(getSelectedTagTitles(tags));
	let hasActiveFilters = $derived(
		Boolean(
			category || featured_only || post_type || selectedTagTitles.length,
		),
	);
	let variant = $derived(layout ?? "grid");
	let featuredPost = $derived(
		variant === "featured-list" ? posts[0] : undefined,
	);
	let listPosts = $derived(
		variant === "featured-list" ? posts.slice(1, 5) : [],
	);

	const buildPageHref = (targetPage: number): string => {
		if (!pagination) return page.url.pathname;

		const nextUrl = new URL(page.url.toString());
		if (targetPage <= 1) {
			nextUrl.searchParams.delete(pagination.paramName);
		} else {
			nextUrl.searchParams.set(pagination.paramName, String(targetPage));
		}

		return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
	};
</script>

<div>
	<Container>
		{#if headline}
			<div use:fade={{ x: -20, duration: 0.9 }}>
				<Headline
					{headline}
					data-directus={setAttr({
						collection: "block_posts",
						item: id,
						fields: "headline",
						mode: "popover",
					})}
				/>
			</div>
		{/if}
		<div use:fade={{ x: -20, duration: 0.9 }}>
			<Tagline
				{tagline}
				data-directus={setAttr({
					collection: "block_posts",
					item: id,
					fields: "tagline",
					mode: "popover",
				})}
			/>
		</div>
		{#if variant !== "featured-list" && category && typeof category === "object"}
			<div
				class="mt-4"
				data-directus={setAttr({
					collection: "block_posts",
					item: id,
					fields: "category",
					mode: "popover",
				})}
			>
				<span
					class="inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide"
				>
					{category.title}
				</span>
			</div>
		{/if}

		{#if variant !== "featured-list" && (featured_only || post_type || selectedTagTitles.length > 0)}
			<div
				class="mt-4 flex flex-wrap gap-2"
				data-directus={setAttr({
					collection: "block_posts",
					item: id,
					fields: ["featured_only", "post_type", "tags"],
					mode: "popover",
				})}
			>
				{#if featured_only}
					<span
						class="inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide"
					>
						Featured
					</span>
				{/if}
				{#if post_type}
					<span
						class="inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide"
					>
						{post_type}
					</span>
				{/if}
				{#each selectedTagTitles as title (`tag-${title}`)}
					<span
						class="inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide"
					>
						#{title}
					</span>
				{/each}
			</div>
		{/if}

		{#if variant === "featured-list"}
			<!-- ═══ Compact landing variant: 1 featured + card list ═══ -->
			<div
				use:fade={{ x: -20, duration: 0.9 }}
				class="mt-10 grid gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[2fr_3fr]"
				data-directus={setAttr({
					collection: "block_posts",
					item: id,
					fields: [
						"collection",
						"limit",
						"category",
						"featured_only",
						"post_type",
						"tags",
						"layout",
					],
					mode: "popover",
				})}
			>
				{#if posts.length === 0}
					<p class="text-sm opacity-80">
						{hasActiveFilters
							? "No posts found for the current filters."
							: "No posts found."}
					</p>
				{:else if featuredPost}
					<!-- Featured post — narrower left column -->
					<a
						href={resolve(`/news/${featuredPost.slug}`)}
						class="group block"
					>
						<div
							class="relative aspect-4/3 overflow-hidden rounded-sm"
						>
							{#if featuredPost.image}
								<DirectusImage
									uuid={typeof featuredPost.image ===
										"object" && featuredPost.image !== null
										? featuredPost.image.id
										: featuredPost.image}
									alt={featuredPost.title}
									layout="fullWidth"
									fill
									sizes="(max-width: 1024px) 100vw, 40vw"
									maxWidth={800}
									class="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
								/>
							{/if}
						</div>
						<div class="mt-4">
							{#if featuredPost.category && typeof featuredPost.category === "object" && featuredPost.category.title}
								<span
									class="text-primary text-[11px] font-bold uppercase tracking-[0.15em]"
								>
									{featuredPost.category.title}
								</span>
							{/if}
							<h3
								class="font-serif group-hover:text-primary mt-2 text-xl leading-snug text-balance text-gray-900 transition-colors sm:text-2xl font-semibold group-hover:underline underline-offset-4"
							>
								{featuredPost.title}
							</h3>
							{#if featuredPost.description}
								<p
									class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500"
								>
									{featuredPost.description}
								</p>
							{/if}
							<div
								class="mt-3 flex flex-wrap items-center gap-x-3 text-xs text-gray-400"
							>
								{#if formatDate(featuredPost.published_at)}
									<span
										>{formatDate(
											featuredPost.published_at,
										)}</span
									>
								{/if}
								{#if featuredPost.read_time}
									<span aria-hidden="true">·</span>
									<span
										>{featuredPost.read_time} min read</span
									>
								{/if}
							</div>
						</div>
					</a>

					<!-- Side list — stacked items with bigger images -->
					<ul class="flex flex-col divide-y divide-gray-200">
						{#each listPosts as post (post.id)}
							<li
								class="relative py-4 first:pt-0"
								use:fade={{ x: -20, duration: 0.9 }}
							>
								<a
									href={resolve(`/news/${post.slug}`)}
									class="group relative z-10 md:flex w-full cursor-pointer items-start gap-4"
								>
									<div
										class="relative aspect-video w-full shrink-0 overflow-hidden rounded-sm sm:w-80"
									>
										{#if post.image}
											<DirectusImage
												uuid={typeof post.image ===
													"object" &&
												post.image !== null
													? post.image.id
													: post.image}
												alt={post.title}
												layout="constrained"
												maxWidth={800}
												sizes="(min-width: 768px) 320px, 100vw"
												class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
											/>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										{#if post.category && typeof post.category === "object" && post.category.title}
											<span
												class="text-primary text-[10px] font-bold uppercase tracking-[0.15em]"
											>
												{post.category.title}
											</span>
										{/if}
										<h4
											class="font-serif group-hover:text-primary group-hover:underline underline-offset-4 mt-1 line-clamp-2 text-base leading-snug text-balance text-gray-900 transition-colors sm:text-lg font-semibold"
										>
											{post.title}
										</h4>
										{#if post.description}
											<p
												class="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500"
											>
												{post.description}
											</p>
										{/if}
										<div
											class="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400"
										>
											{#if formatDate(post.published_at)}
												<span
													>{formatDate(
														post.published_at,
													)}</span
												>
											{/if}
											{#if post.read_time}
												<span aria-hidden="true">·</span
												>
												<span>{post.read_time} min</span
												>
											{/if}
										</div>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{:else}
			<!-- ═══ Default grid variant ═══ -->
			<div
				class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3"
				data-directus={setAttr({
					collection: "block_posts",
					item: id,
					fields: [
						"collection",
						"limit",
						"category",
						"featured_only",
						"post_type",
						"tags",
						"layout",
					],
					mode: "popover",
				})}
			>
				{#if posts.length === 0}
					<p class="text-sm opacity-80">
						{hasActiveFilters
							? "No posts found for the current filters."
							: "No posts found."}
					</p>
				{/if}
				{#each posts as post (post.id)}
					<a
						in:scale={{ duration: 100 }}
						href={resolve(`/news/${post.slug}`)}
						class="group block overflow-hidden rounded-sm"
					>
						<div
							class="relative h-64 w-full overflow-hidden rounded-sm"
						>
							{#if post.image}
								<DirectusImage
									uuid={typeof post.image === "object" &&
									post.image !== null
										? post.image.id
										: post.image}
									alt={post.title}
									layout="fullWidth"
									fill
									sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
									maxWidth={960}
									class="h-auto w-full rounded-sm object-cover transition-transform duration-300 group-hover:scale-110"
								/>
							{/if}
						</div>

						<div class="p-4">
							<h3
								class="font-heading group-hover:text-accent text-xl transition-colors duration-300"
							>
								{post.title}
							</h3>
							<p class="text-foreground mt-2 text-sm">
								{post.description}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}

		{#if variant !== "featured-list" && pagination && pagination.totalPages > 1}
			<nav
				class="mt-10 flex items-center gap-3"
				aria-label="Posts block pagination"
			>
				{#if pagination.currentPage > 1}
					<a
						class="rounded border px-3 py-2"
						href={buildPageHref(pagination.currentPage - 1)}>Prev</a
					>
				{/if}
				<span class="text-sm">
					Page {pagination.currentPage} of {pagination.totalPages}
				</span>
				{#if pagination.currentPage < pagination.totalPages}
					<a
						class="rounded border px-3 py-2"
						href={buildPageHref(pagination.currentPage + 1)}>Next</a
					>
				{/if}
			</nav>
		{/if}
	</Container>
</div>
