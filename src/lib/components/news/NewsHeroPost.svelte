<script lang="ts">
  import { resolve } from "$app/paths";
  import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";

  interface HeroPost {
    id: string | number;
    slug: string;
    title: string;
    image?: unknown;
    post_type?: string | null;
    featured?: boolean | null;
    category?: { title?: string | null } | null;
    description?: string | null;
    published_at?: string | null;
    read_time?: number | null;
    author?: {
      first_name?: string | null;
      last_name?: string | null;
      avatar?: unknown;
    } | null;
  }

  let { post }: { post: HeroPost } = $props();

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

  const imageUrl = (image: unknown, w = 1200, h = 514) => {
    if (!image) return null;
    const id =
      typeof image === "object" && image !== null && "id" in image
        ? (image as { id: string }).id
        : String(image);
    return getDirectusAssetURL(id, { width: w, height: h, fit: "cover" });
  };
</script>

<a href={resolve(`/news/${post.slug}`)} class="group mb-10 block">
  <article class="relative overflow-hidden rounded-sm">
    <div class="aspect-21/9 w-full">
      {#if imageUrl(post.image)}
        <img
          src={imageUrl(post.image)}
          alt={post.title}
          class="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          loading="eager"
        />
      {:else}
        <div
          class="size-full bg-linear-to-br {fallbackGradient(post.id)}"
        ></div>
      {/if}
      <div
        class="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent"
      ></div>
    </div>

    <div class="absolute inset-x-0 bottom-0 p-[clamp(1.5rem,3vw,3rem)]">
      <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {#if post.post_type}
          <span class="font-bold uppercase tracking-0.1em text-white/80">
            {post.post_type}
          </span>
        {/if}
        {#if post.category && typeof post.category === "object" && post.category.title}
          <span class="text-white/50">{post.category.title}</span>
        {/if}
        {#if post.featured}
          <span
            class="rounded-sm bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm"
          >
            Featured
          </span>
        {/if}
      </div>
      <h2
        class="font-serif text-2xl font-bold leading-tight text-white transition-colors group-hover:text-white/90 sm:text-3xl lg:text-6xl text-balance max-w-4xl"
      >
        {post.title}
      </h2>
      {#if post.description}
        <p
          class="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/70"
        >
          {post.description}
        </p>
      {/if}
      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {#if post.author && typeof post.author === "object"}
          {@const name = [post.author.first_name, post.author.last_name]
            .filter(Boolean)
            .join(" ")}
          {@const avatar = avatarUrl(post.author.avatar)}
          {#if name}
            <div class="flex items-center gap-2">
              {#if avatar}
                <img
                  src={avatar}
                  alt={name}
                  class="size-5 rounded-full object-cover ring-1 ring-white/30"
                />
              {/if}
              <span class="text-xs font-medium text-white/80">{name}</span>
            </div>
          {/if}
        {/if}
        {#if formatDate(post.published_at)}
          <span class="text-xs text-white/50"
            >{formatDate(post.published_at)}</span
          >
        {/if}
        {#if post.read_time}
          <span class="text-xs text-white/50">{post.read_time} min read</span>
        {/if}
      </div>
    </div>
  </article>
</a>
