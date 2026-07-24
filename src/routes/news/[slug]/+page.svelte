<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { NewsPostSidebar } from "$lib/components/news";
	import BaseText from "$lib/components/ui/Text.svelte";
	import setAttr from "$lib/services/directus/visualEditing";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let post = $derived(data.post);
	const author = $derived(data.author);
	const authorName = $derived(
		[author?.first_name, author?.last_name].filter(Boolean).join(" "),
	);

	type PostTagRelation = {
		tag_id: {
			id: string;
			title: string;
			slug?: string | null;
		};
	};

	const isPostTagRelation = (relation: unknown): relation is PostTagRelation => {
		if (relation === null || typeof relation !== "object") return false;
		const tag = (relation as { tag_id?: unknown }).tag_id;
		if (tag === null || typeof tag !== "object") return false;
		const candidate = tag as { id?: unknown; title?: unknown };
		return typeof candidate.id === "string" && typeof candidate.title === "string";
	};

	const normalizePostTags = (tags: unknown): PostTagRelation[] =>
		Array.isArray(tags) ? tags.filter(isPostTagRelation) : [];

	const postTags = $derived(normalizePostTags(post?.tags));
	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const gradients = [
		"from-primary/80 to-primary-900",
		"from-sec/60 to-primary/90",
		"from-primary-700 to-accent/70",
		"from-gray-700 to-primary/80",
	];
	const fallbackGradient = (id: string | number) => {
		const hash = String(id)
			.split("")
			.reduce((a, c) => a + c.charCodeAt(0), 0);
		return gradients[hash % gradients.length];
	};

	const avatarUrl = (avatar: unknown) => {
		if (!avatar) return null;
		const id =
			typeof avatar === "object" && avatar !== null && "id" in avatar
				? (avatar as { id: string }).id
				: String(avatar);
		return getDirectusAssetURL(id, { width: 80, height: 80, fit: "cover" });
	};
</script>

<!-- ═══ HERO ═══ -->
<header class="relative overflow-hidden">
	<div
		class="aspect-21/9 min-h-[360px] max-h-[560px] w-full"
		data-directus={setAttr({
			collection: "posts",
			item: post.id,
			fields: ["image", "meta_header_image"],
			mode: "modal",
		})}
	>
		{#if post?.image}
			<DirectusImage
				uuid={post.image as string}
				layout="fullWidth"
				alt={post.title || "post header image"}
				class="size-full object-cover"
				fill
				fetchpriority="high"
				sizes="100vw"
				maxWidth={1600}
			/>
		{:else}
			<div
				class="size-full bg-gradient-to-br {fallbackGradient(post.id)}"
			></div>
		{/if}
	</div>
	<!-- Overlay gradient -->
	<div
		class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
	></div>

	<!-- Hero content -->
	<div
		class="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-[clamp(1rem,3vw,2.5rem)] pb-[clamp(2rem,5vw,4rem)]"
	>
		<!-- Meta -->
		<div
			class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs"
			data-directus={setAttr({
				collection: "posts",
				item: post.id,
				fields: ["featured", "post_type", "category", "tags"],
				mode: "popover",
			})}
		>
			{#if post.post_type}
				<span class="font-bold uppercase tracking-widest text-white/80">
					{post.post_type}
				</span>
			{/if}
			{#if post.category && typeof post.category === "object"}
				<a
					href={resolve(
						`/news?category=${encodeURIComponent(post.category.slug ?? "")}`,
					)}
					class="text-white/50 transition-colors hover:text-white/80"
				>
					{post.category.title}
				</a>
			{/if}
			{#if post.featured}
				<span
					class="rounded-sm bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm"
				>
					Featured
				</span>
			{/if}
		</div>

		<!-- Title -->
		<h1
			class="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-6xl text-balance"
			data-directus={setAttr({
				collection: "posts",
				item: post.id,
				fields: ["title", "slug"],
				mode: "popover",
			})}
		>
			{post.title}
		</h1>

		<!-- Author + date row -->
		<div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
			{#if author}
				{@const avatar = avatarUrl(author.avatar)}
				<div class="flex items-center gap-2.5">
					{#if avatar}
						<img
							src={avatar}
							alt={authorName}
							class="size-8 rounded-full object-cover ring-2 ring-white/20"
						/>
					{/if}
					{#if authorName}
						<span class="font-medium text-white/90"
							>{authorName}</span
						>
					{/if}
				</div>
			{/if}
			{#if formatDate(post.published_at)}
				<span class="text-white/50"
					>{formatDate(post.published_at)}</span
				>
			{/if}
			{#if post.read_time}
				<span class="text-white/50">{post.read_time} min read</span>
			{/if}
		</div>
	</div>
</header>

<!-- ═══ BODY ═══ -->
<div
	class="mx-auto max-w-7xl px-[clamp(1rem,3vw,2.5rem)] py-[clamp(2rem,5vw,4rem)]"
>
	<div class="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
		<!-- Main content -->
		<main>
			<!-- Tags below hero -->
			{#if postTags.length}
				<div class="mb-8 flex flex-wrap gap-2">
					{#each postTags as relation (relation.tag_id.id)}
						<a
							href={resolve(
								`/news?tag=${encodeURIComponent(relation.tag_id.slug ?? relation.tag_id.title)}`,
							)}
							class="rounded-sm border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-primary hover:text-primary"
						>
							{relation.tag_id.title}
						</a>
					{/each}
				</div>
			{/if}

			<!-- Description -->
			{#if post.description}
				<p
					class="mb-8 border-l-2 border-primary/30 pl-5 text-lg leading-relaxed text-gray-600 italic"
					data-directus={setAttr({
						collection: "posts",
						item: post.id,
						fields: "description",
						mode: "popover",
					})}
				>
					{post.description}
				</p>
			{/if}

			<!-- Rich text content -->
			<article
				class="prose prose-lg max-w-none prose-headings:font-secondary prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-sm prose-blockquote:border-primary/30 prose-blockquote:text-gray-500"
			>
				<BaseText
					content={post.content || ""}
					data-directus={setAttr({
						collection: "posts",
						item: post.id,
						fields: ["content", "meta_header_content"],
						mode: "drawer",
					})}
				/>
			</article>

			<!-- Share + back -->
			<div
				class="mt-12 flex items-center justify-between border-t border-gray-200 pt-8"
			>
				<a
					href={resolve("/news")}
					class="text-sm text-gray-500 transition-colors hover:text-primary"
				>
					&larr; Back to all articles
				</a>
				<!-- <ShareDialog {postUrl} postTitle={post.title} /> -->
			</div>
		</main>

		<!-- ═══ SIDEBAR ═══ -->
		<NewsPostSidebar
			{author}
			{authorName}
			{post}
			{postTags}
			relatedPosts={data.relatedPosts}
		/>
	</div>
</div>
