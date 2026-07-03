<script lang="ts">
  import { resolve } from "$app/paths";
  import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";

  interface PostCard {
    id: string | number;
    slug: string;
    title: string;
    image?: unknown;
    post_type?: string | null;
    featured?: boolean | null;
    category?: { slug?: string | null; title?: string | null } | null;
    description?: string | null;
    published_at?: string | null;
    read_time?: number | null;
    author?: {
      first_name?: string | null;
      last_name?: string | null;
      avatar?: unknown;
    } | null;
    tags?: Array<{ title?: string | null; slug?: string | null }> | null;
  }

  let { post, index }: { post: PostCard; index: number } = $props();

  const gradients = [
    "from-primary/80 to-primary-900",
    "from-sec/60 to-primary/90",
    "from-primary-700 to-accent/70",
    "from-gray-700 to-primary/80",
    "from-primary/70 to-sec/50",
    "from-accent/60 to-primary-800",
  ];
  const fallbackGradient = (id: string | number) => {
    const hash = String(id)
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const avatarUrl = (avatar: unknown) => {
    if (!avatar) return null;
    const id =
      typeof avatar === "object" && avatar !== null && "id" in avatar
        ? (avatar as { id: string }).id
        : String(avatar);
    return getDirectusAssetURL(id, { width: 40, height: 40, fit: "cover" });
  };

  const imageUrl = (image: unknown, w = 600, h = 400) => {
    if (!image) return null;
    const id =
      typeof image === "object" && image !== null && "id" in image
        ? (image as { id: string }).id
        : String(image);
    return getDirectusAssetURL(id, { width: w, height: h, fit: "cover" });
  };
</script>

<article
  class="group flex flex-col overflow-hidden rounded-sm bg-white transition-colors duration-300"
>
  <!-- Card image -->
  <a
    href={resolve(`/news/${post.slug}`)}
    class="relative block aspect-3/2 overflow-hidden"
  >
    {#if imageUrl(post.image)}
      <img
        src={imageUrl(post.image)}
        alt={post.title}
        class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading={index < 6 ? "eager" : "lazy"}
      />
    {:else}
      <div
        class="size-full bg-linear-to-br rounded-sm {fallbackGradient(post.id)}"
      ></div>
    {/if}
    <div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
      {#if post.post_type}
        <h3
          class="rounded-full bg-black/60 px-4 py-1 text-sm font-bold uppercase tracking-0.1em text-white backdrop-blur-sm text-balance"
        >
          {post.post_type}
        </h3>
      {/if}
      {#if post.featured}
        <span
          class="rounded-sm bg-accent/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
        >
          Featured
        </span>
      {/if}
    </div>
  </a>

  <!-- Card body -->
  <div class="flex flex-1 flex-col pt-5 pb-5 pr-5">
    {#if post.category && typeof post.category === "object" && post.category.slug}
      <a
        href={resolve(
          `/news?category=${encodeURIComponent(post.category.slug)}`,
        )}
        class="mb-2 text-[11px] font-bold uppercase tracking-0.1em text-primary"
      >
        {post.category.title}
      </a>
    {/if}

    <a href={resolve(`/news/${post.slug}`)} class="group/title block">
      <h2
        class="group-hover:underline underline-offset-4 font-serif text-2xl font-semibold leading-snug text-gray-900 transition-colors group-hover/title:text-primary text-balance"
      >
        {post.title}
      </h2>
    </a>

    {#if post.description}
      <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
        {post.description}
      </p>
    {/if}

    <div class="flex-1"></div>

    <div
      class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-4"
    >
      {#if post.author && typeof post.author === "object"}
        {@const name = [post.author.first_name, post.author.last_name]
          .filter(Boolean)
          .join(" ")}
        {@const avatar = avatarUrl(post.author.avatar)}
        {#if name}
          <div class="flex items-center gap-1.5">
            {#if avatar}
              <img
                src={avatar}
                alt={name}
                class="size-5 rounded-full object-cover"
              />
            {/if}
            <span class="text-xs font-medium text-gray-700">{name}</span>
          </div>
        {/if}
      {/if}
      {#if formatDate(post.published_at)}
        <span class="text-xs text-gray-400"
          >{formatDate(post.published_at)}</span
        >
      {/if}
      {#if post.read_time}
        <span class="text-xs text-gray-400">{post.read_time} min</span>
      {/if}
    </div>

    {#if post.tags?.length}
      <div class="mt-3 flex flex-wrap gap-1.5">
        {#each post.tags as tag, i (`${post.id}-${i}`)}
          {#if tag?.title && tag?.slug}
            <a
              href={resolve(`/news?tag=${encodeURIComponent(tag.slug)}`)}
              class="rounded-sm border border-gray-200 px-2 py-0.5 text-sm text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              {tag.title}
            </a>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</article>
