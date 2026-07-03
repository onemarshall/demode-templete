<script lang="ts">
  import { resolve } from "$app/paths";
  import PageBuilder from "$lib/components/layout/PageBuilder.svelte";
  import {
    NewsFilterSidebar,
    NewsHeroPost,
    NewsPostCard,
  } from "$lib/components/news";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const heroPost = $derived(data.posts[0]);
  const gridPosts = $derived(data.posts.slice(1));

  const currentBaseUrl = () => {
    const base = new URL("/news", "http://localhost");
    if (data.filters.category)
      base.searchParams.set("category", data.filters.category);
    if (data.filters.featured) base.searchParams.set("featured", "true");
    if (data.filters.post_type)
      base.searchParams.set("post_type", data.filters.post_type);
    for (const t of data.filters.tags) base.searchParams.append("tag", t);
    return base;
  };

  const filterUrl = (key: string, value: string | null) => {
    const next = new URL(currentBaseUrl());
    next.searchParams.delete("page");
    if (value) {
      next.searchParams.set(key, value);
    } else {
      next.searchParams.delete(key);
    }
    return resolve(`/news${next.search}`);
  };

  const pageUrl = (targetPage: number) => {
    const next = new URL(currentBaseUrl());
    if (targetPage <= 1) {
      next.searchParams.delete("page");
    } else {
      next.searchParams.set("page", String(targetPage));
    }
    return resolve(`/news${next.search}`);
  };

  const removeTagUrl = (slug: string) => {
    const next = new URL(currentBaseUrl());
    next.searchParams.delete("page");
    const remaining = data.filters.tags.filter((t) => t !== slug);
    next.searchParams.delete("tag");
    for (const t of remaining) next.searchParams.append("tag", t);
    return resolve(`/news${next.search}`);
  };

  const hasFilters = $derived(
    Boolean(data.filters.category) ||
      Boolean(data.filters.featured) ||
      Boolean(data.filters.post_type) ||
      data.filters.tags.length > 0,
  );

  let filterOpen = $state(false);
</script>

{#if data.pageBlocks.length > 0}
  <PageBuilder sections={data.pageBlocks as any} />
{/if}

<section
  class="mx-auto max-w-9xl px-[clamp(1rem,3vw,2.5rem)] py-[clamp(2rem,6vw,5rem)]"
>
  <!-- Mobile filter toggle -->
  <button
    class="mb-6 flex items-center gap-2 border-b border-gray-300 pb-2 text-sm font-medium uppercase tracking-[0.15em] text-gray-600 lg:hidden"
    onclick={() => (filterOpen = !filterOpen)}
  >
    <svg
      class="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M3 4h18M3 12h12M3 20h6" />
    </svg>
    {filterOpen ? "Hide filters" : "Filter & sort"}
  </button>

  <div class="flex flex-col gap-[clamp(2rem,4vw,4rem)] lg:flex-row">
    <!-- ═══ LEFT: Filter sidebar ═══ -->
    <NewsFilterSidebar
      {filterOpen}
      categories={data.categories}
      postTypes={data.postTypes}
      filters={data.filters}
      {hasFilters}
      {filterUrl}
      {removeTagUrl}
    />

    <!-- ═══ RIGHT: Post listing ═══ -->
    <div class="min-w-0 flex-1">
      <!-- Results count -->
      <div
        class="mb-8 flex items-baseline justify-between border-b border-gray-200 pb-4"
      >
        <p class="text-sm text-gray-500">
          {data.pagination.totalCount}
          {data.pagination.totalCount === 1 ? "article" : "articles"}
          {#if hasFilters}<span class="text-gray-400">&mdash; filtered</span
            >{/if}
        </p>
        <p class="text-xs text-gray-400">
          Page {data.pagination.page} of {data.pagination.totalPages}
        </p>
      </div>

      {#if data.posts.length === 0}
        <div class="py-20 text-center">
          <p class="font-secondary text-lg text-gray-400">
            {hasFilters
              ? "No articles match the current filters."
              : "No articles found."}
          </p>
          {#if hasFilters}
            <a
              href={resolve("/news")}
              class="mt-4 inline-block text-sm text-primary underline"
              data-sveltekit-noscroll
            >
              Clear filters
            </a>
          {/if}
        </div>
      {:else}
        <!-- ═══ HERO: First post ═══ -->
        {#if heroPost}
          <NewsHeroPost post={heroPost} />
        {/if}

        <!-- ═══ GRID: Remaining posts ═══ -->
        {#if gridPosts.length > 0}
          <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {#each gridPosts as post, i (post.id)}
              <NewsPostCard {post} index={i} />
            {/each}
          </div>
        {/if}
      {/if}

      <!-- Pagination -->
      {#if data.posts.length > 0 && data.pagination.totalPages > 1}
        <nav
          class="mt-12 flex items-center justify-center gap-2 border-t border-gray-200 pt-8"
          aria-label="Pagination"
        >
          {#if data.pagination.page > 1}
            <a
              class="rounded-sm border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:text-primary"
              href={pageUrl(data.pagination.page - 1)}
              data-sveltekit-noscroll
            >
              &larr; Previous
            </a>
          {/if}

          {#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p}
            {#if p === data.pagination.page}
              <span
                class="rounded-sm bg-primary px-3.5 py-2 text-sm font-semibold text-white"
              >
                {p}
              </span>
            {:else if Math.abs(p - data.pagination.page) <= 2 || p === 1 || p === data.pagination.totalPages}
              <a
                href={pageUrl(p)}
                class="rounded-sm border border-gray-200 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:text-primary"
                data-sveltekit-noscroll
              >
                {p}
              </a>
            {:else if Math.abs(p - data.pagination.page) === 3}
              <span class="px-1 text-gray-300">&hellip;</span>
            {/if}
          {/each}

          {#if data.pagination.page < data.pagination.totalPages}
            <a
              class="rounded-sm border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:text-primary"
              href={pageUrl(data.pagination.page + 1)}
              data-sveltekit-noscroll
            >
              Next &rarr;
            </a>
          {/if}
        </nav>
      {/if}
    </div>
  </div>
</section>
