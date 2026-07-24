<script lang="ts">
  import { resolve } from "$app/paths";
  import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";
  import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
  import setAttr from "$lib/services/directus/visualEditing";
  import { formatDate } from "$lib/utils/date";

  interface Author {
    avatar?: unknown;
    title?: string | null;
    description?: string | null;
  }

  interface PostMeta {
    id: string | number;
    category?: { slug?: string | null; title?: string | null } | string | null;
    published_at?: string | null;
    read_time?: number | null;
  }

  interface PostTag {
    tag_id: { id: string; title: string; slug?: string | null };
  }

  interface RelatedPost {
    id: string | number;
    slug?: string | null;
    title?: string | null;
    image?: unknown;
    published_at?: string | null;
  }

  let {
    author,
    authorName,
    post,
    postTags,
    relatedPosts,
  }: {
    author: Author | null | undefined;
    authorName: string;
    post: PostMeta;
    postTags: PostTag[];
    relatedPosts: RelatedPost[];
  } = $props();

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

  const relatedImageUrl = (image: unknown) => {
    if (!image) return null;
    const id =
      typeof image === "object" && image !== null && "id" in image
        ? (image as { id: string }).id
        : String(image);
    return getDirectusAssetURL(id, { width: 300, height: 200, fit: "cover" });
  };

  const visibleRelatedPosts = $derived(
    relatedPosts.filter(
      (relatedPost): relatedPost is RelatedPost & { slug: string } =>
        typeof relatedPost.slug === "string" && relatedPost.slug.length > 0,
    ),
  );
</script>

<aside class="space-y-8 lg:pt-0">
  <div class="sticky top-28 space-y-8">
    <!-- Author card -->
    {#if author}
      <div
        class="rounded-sm border border-gray-200 p-6"
        data-directus={setAttr({
          collection: "posts",
          item: post.id,
          fields: ["author"],
          mode: "popover",
        })}
      >
        <p
          class="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
        >
          Author
        </p>
        <div class="flex items-center gap-3">
          {#if author.avatar}
            <DirectusImage
              uuid={author.avatar as string}
              alt={authorName || "author avatar"}
              class="size-12 rounded-full object-cover"
              layout="fixed"
              width={48}
              height={48}
            />
          {/if}
          <div>
            {#if authorName}
              <p class="font-secondary font-semibold text-gray-900">
                {authorName}
              </p>
            {/if}
            {#if author.title}
              <p class="text-xs text-gray-500">{author.title}</p>
            {/if}
          </div>
        </div>
        {#if author.description}
          <p class="mt-4 text-sm leading-relaxed text-gray-500">
            {author.description}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Category + meta -->
    <div class="rounded-sm border border-gray-200 p-6">
      {#if post.category && typeof post.category === "object"}
        <div class="mb-5">
          <p
            class="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
          >
            Category
          </p>
          <a
            href={resolve(
              `/news?category=${encodeURIComponent(post.category.slug ?? "")}`,
            )}
            class="font-secondary text-sm font-semibold text-gray-900 transition-colors hover:text-primary"
          >
            {post.category.title}
          </a>
        </div>
      {/if}

      {#if post.published_at}
        <div class="mb-5">
          <p
            class="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
          >
            Published
          </p>
          <p class="text-sm text-gray-700">
            {formatDate(post.published_at, { month: "long" })}
          </p>
        </div>
      {/if}

      {#if post.read_time}
        <div>
          <p
            class="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
          >
            Read time
          </p>
          <p class="text-sm text-gray-700">{post.read_time} minutes</p>
        </div>
      {/if}
    </div>

    <!-- Tags -->
    {#if postTags.length}
      <div class="rounded-sm border border-gray-200 p-6">
        <p
          class="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
        >
          Topics
        </p>
        <div class="flex flex-wrap gap-2">
          {#each postTags as relation (relation.tag_id.id)}
            <a
              href={resolve(
                `/news?tag=${encodeURIComponent(relation.tag_id.slug ?? relation.tag_id.title)}`,
              )}
              class="rounded-sm border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary hover:text-primary"
            >
              {relation.tag_id.title}
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Related posts -->
    {#if visibleRelatedPosts.length > 0}
      <div>
        <p
          class="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
        >
          Related articles
        </p>
        <div class="space-y-4">
          {#each visibleRelatedPosts as relatedPost (relatedPost.id)}
            <a
              href={resolve(`/news/${relatedPost.slug}`)}
              class="group flex gap-4"
            >
              <div class="relative size-20 shrink-0 overflow-hidden rounded-sm">
                {#if relatedImageUrl(relatedPost.image)}
                  <img
                    src={relatedImageUrl(relatedPost.image)}
                    alt={relatedPost.title || "related post"}
                    class="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                {:else}
                  <div
                    class="size-full bg-gradient-to-br {fallbackGradient(
                      relatedPost.id,
                    )}"
                  ></div>
                {/if}
              </div>
              <div class="min-w-0 flex-1">
                <h3
                  class="font-secondary text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary"
                >
                  {relatedPost.title}
                </h3>
                {#if relatedPost.published_at}
                  <p class="mt-1 text-xs text-gray-400">
                    {formatDate(relatedPost.published_at, { month: "long" })}
                  </p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</aside>
