<script lang="ts">
  import { resolve } from "$app/paths";

  interface Category {
    id: string | number;
    slug: string;
    title: string;
  }

  interface Filters {
    category?: string | null;
    post_type?: string | null;
    featured?: boolean | null;
    tags: string[];
  }

  let {
    filterOpen,
    categories,
    postTypes,
    filters,
    hasFilters,
    filterUrl,
    removeTagUrl,
  }: {
    filterOpen: boolean;
    categories: Category[];
    postTypes: string[];
    filters: Filters;
    hasFilters: boolean;
    filterUrl: (key: string, value: string | null) => string;
    removeTagUrl: (slug: string) => string;
  } = $props();
</script>

<aside class="shrink-0 lg:w-64 {filterOpen ? '' : 'hidden lg:block'}">
  <div class="sticky top-28 space-y-8">
    <div>
      <h2
        class="font-secondary text-sm font-medium uppercase tracking-[0.2em] text-gray-400"
      >
        Filters
      </h2>
      <div class="mt-3 h-px bg-gray-200"></div>
    </div>

    <!-- Categories -->
    {#if categories.length > 0}
      <nav>
        <h3
          class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
        >
          Category
        </h3>
        <ul class="space-y-1">
          <li>
            <a
              href={filterUrl("category", null)}
              class="block py-1.5 text-sm transition-colors {!filters.category
                ? 'font-semibold text-primary'
                : 'text-gray-600 hover:text-gray-900'}"
              data-sveltekit-noscroll
            >
              All categories
            </a>
          </li>
          {#each categories as cat (cat.id)}
            <li>
              <a
                href={filterUrl("category", cat.slug)}
                class="block py-1.5 text-sm transition-colors {filters.category ===
                cat.slug
                  ? 'font-semibold text-primary'
                  : 'text-gray-600 hover:text-gray-900'}"
                data-sveltekit-noscroll
              >
                {cat.title}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    {/if}

    <!-- Post types -->
    {#if postTypes.length > 0}
      <nav>
        <h3
          class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
        >
          Type
        </h3>
        <ul class="space-y-1">
          <li>
            <a
              href={filterUrl("post_type", null)}
              class="block py-1.5 text-sm transition-colors {!filters.post_type
                ? 'font-semibold text-primary'
                : 'text-gray-600 hover:text-gray-900'}"
              data-sveltekit-noscroll
            >
              All types
            </a>
          </li>
          {#each postTypes as type (type)}
            <li>
              <a
                href={filterUrl("post_type", type)}
                class="block py-1.5 text-sm capitalize transition-colors {filters.post_type ===
                type
                  ? 'font-semibold text-primary'
                  : 'text-gray-600 hover:text-gray-900'}"
                data-sveltekit-noscroll
              >
                {type}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    {/if}

    <!-- Featured toggle -->
    <div>
      <h3
        class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
      >
        Featured
      </h3>
      <a
        href={filterUrl("featured", filters.featured ? null : "true")}
        class="inline-flex items-center gap-2 py-1.5 text-sm transition-colors {filters.featured
          ? 'font-semibold text-primary'
          : 'text-gray-600 hover:text-gray-900'}"
        data-sveltekit-noscroll
      >
        <span
          class="flex size-4 items-center justify-center rounded border {filters.featured
            ? 'border-primary bg-primary text-white'
            : 'border-gray-300'}"
        >
          {#if filters.featured}
            <svg
              class="size-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"><path d="M5 13l4 4L19 7" /></svg
            >
          {/if}
        </span>
        Featured only
      </a>
    </div>

    <!-- Active tags -->
    {#if filters.tags.length > 0}
      <div>
        <h3
          class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
        >
          Active tags
        </h3>
        <div class="flex flex-wrap gap-2">
          {#each filters.tags as tag (tag)}
            <a
              href={removeTagUrl(tag)}
              class="group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              data-sveltekit-noscroll
            >
              #{tag}
              <span
                class="text-primary/40 transition-colors group-hover:text-primary"
                aria-hidden="true">&times;</span
              >
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Clear all -->
    {#if hasFilters}
      <a
        href={resolve("/news")}
        class="inline-block border-b border-gray-400 pb-0.5 text-xs uppercase tracking-0.1em text-gray-500 transition-colors hover:border-gray-800 hover:text-gray-800"
        data-sveltekit-noscroll
      >
        Clear all filters
      </a>
    {/if}
  </div>
</aside>
