/**
 * Blog post fetcher.
 *
 * Handles all post-related queries: single post by slug, paginated lists,
 * filtered counts, related posts (tag → category → recent fallback),
 * author lookup, and metadata (available categories, post types).
 *
 * Related posts fire all 3 queries in parallel, then merge by priority.
 */
import type { RequestEvent } from "@sveltejs/kit";
import { type Post, type Schema } from "$lib/types/directus-schema";
import { type QueryFields, type QueryFilter, readItems, readUser } from "@directus/sdk";
import { createDirectusClient, PUBLISHED_FILTER, POST_SORT } from "./shared";
import { createScopedLogger } from "$lib/shared/logger";

// Directus SDK's QueryFields/QueryFilter recursive generics cannot be inferred
// from nested object literals. Centralise the escape hatch here so no call
// site needs its own `as unknown as` cast.
const postFields = (f: readonly unknown[]): QueryFields<Schema, Post> =>
  f as unknown as QueryFields<Schema, Post>;

const postFilter = (f: Record<string, unknown>): QueryFilter<Schema, Post> =>
  f as unknown as QueryFilter<Schema, Post>;

export interface FetchPostsListOptions {
  limit: number;
  page?: number;
  categoryId?: string;
  featuredOnly?: boolean;
  postType?: Post["post_type"];
  tagIds?: string[];
}

const log = createScopedLogger(["Directus", "Posts"]);

const buildPostFilter = (
  options?: Pick<FetchPostsListOptions, "categoryId" | "featuredOnly" | "postType" | "tagIds">,
): QueryFilter<Schema, Post> => {
  const filter: QueryFilter<Schema, Post> = { ...PUBLISHED_FILTER };

  if (options?.categoryId) {
    filter.category = { _eq: options.categoryId };
  }

  if (options?.featuredOnly) {
    filter.featured = { _eq: true };
  }

  if (options?.postType) {
    filter.post_type = { _eq: options.postType };
  }

  if (options?.tagIds?.length) {
    // Directus SDK types don't model junction-table relational filters well,
    // so we assign the filter shape Directus actually accepts.
    (filter as Record<string, unknown>).tags = {
      _some: { tag_id: { _in: options.tagIds } },
    };
  }

  return filter;
};

/* -------------------------------------------------------------------------- */
/*  Re-usable field definitions                                               */
/* -------------------------------------------------------------------------- */

const POST_FIELDS = postFields([
  "id",
  "title",
  "content",
  "status",
  { image: ["id", "filename_download"] },
  "description",
  "author",
  "seo",
  "published_at",
  "featured",
  "post_type",
  {
    category: ["id", "title", "slug"],
  },
  {
    tags: [{ tag_id: ["id", "title", "slug"] }],
  },
]);

const POST_SUMMARY_FIELDS = postFields([
  "id",
  "title",
  { image: ["id", "filename_download"] },
  "slug",
  "description",
  "published_at",
  "featured",
  "post_type",
  {
    category: ["id", "title", "slug"],
  },
  {
    tags: [{ tag_id: ["id", "title", "slug"] }],
  },
  {
    author: ["first_name", "last_name", "avatar"],
  },
  "read_time",
]);

const AUTHOR_FIELDS = ["first_name", "last_name", "avatar", "description", "title"] as const;

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const fetchPostBySlug = async (
  slug: string,
  options: { draft?: boolean } = {},
  fetch: RequestEvent["fetch"],
  token?: string,
) => {
  const directus = createDirectusClient(fetch, token);

  const filter: QueryFilter<Schema, Post> = options?.draft
    ? { slug: { _eq: slug } }
    : { slug: { _eq: slug }, ...PUBLISHED_FILTER };

  const posts = await directus.request<Post[]>(
    readItems("posts", { filter, limit: 1, fields: POST_FIELDS }),
  );

  const post = posts[0];
  if (!post) {
    log.warn(`No post found with slug: ${slug}`);
    return null;
  }

  return post;
};

export const fetchRelatedPosts = async (
  excludeId: string,
  fetch: RequestEvent["fetch"],
  token?: string,
  options?: { tagIds?: string[]; categoryId?: string },
) => {
  const directus = createDirectusClient(fetch, token);
  const limit = 3;
  const baseFilter = { ...PUBLISHED_FILTER, id: { _neq: excludeId } };

  // Fire all applicable queries in parallel, then merge by priority:
  // tags (strongest signal) → category → recent (backfill)
  const [tagMatches, catMatches, recent] = await Promise.all([
    options?.tagIds?.length
      ? directus
          .request<Post[]>(
            readItems("posts", {
              filter: postFilter({
                ...baseFilter,
                tags: { _some: { tag_id: { _in: options.tagIds } } },
              }),
              fields: POST_SUMMARY_FIELDS,
              sort: POST_SORT,
              limit,
            }),
          )
          .catch((err) => {
            log.error("Error fetching tag-related posts:", err);
            return [] as Post[];
          })
      : ([] as Post[]),
    options?.categoryId
      ? directus
          .request<Post[]>(
            readItems("posts", {
              filter: { ...baseFilter, category: { _eq: options.categoryId } },
              fields: POST_SUMMARY_FIELDS,
              sort: POST_SORT,
              limit,
            }),
          )
          .catch((err) => {
            log.error("Error fetching category-related posts:", err);
            return [] as Post[];
          })
      : ([] as Post[]),
    directus
      .request<Post[]>(
        readItems("posts", {
          filter: baseFilter,
          fields: POST_SUMMARY_FIELDS,
          sort: POST_SORT,
          limit: limit * 2,
        }),
      )
      .catch((err) => {
        log.error("Error fetching recent posts:", err);
        return [] as Post[];
      }),
  ]);

  // Merge by priority, deduplicating
  const seen = new Set<string>([excludeId]);
  const results: Post[] = [];

  for (const pool of [tagMatches, catMatches, recent]) {
    for (const p of pool) {
      if (results.length >= limit) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        results.push(p);
      }
    }
    if (results.length >= limit) break;
  }

  return results;
};

export const fetchAuthorById = async (authorId: string, fetch: RequestEvent["fetch"]) => {
  const directus = createDirectusClient(fetch);
  return directus.request(readUser(authorId, { fields: AUTHOR_FIELDS }));
};

export const fetchPostsList = async (
  options: FetchPostsListOptions,
  fetch: RequestEvent["fetch"],
  token?: string,
) => {
  const directus = createDirectusClient(fetch, token);
  const filter = buildPostFilter(options);

  return directus.request<Post[]>(
    readItems("posts", {
      limit: options.limit,
      page: options.page ?? 1,
      sort: POST_SORT,
      fields: POST_SUMMARY_FIELDS,
      filter,
    }),
  );
};

export const fetchPaginatedPosts = async (
  limit: number,
  page: number,
  fetch: RequestEvent["fetch"],
  token?: string,
) =>
  fetchPostsList(
    {
      limit,
      page,
    },
    fetch,
    token,
  );

export const fetchPostsCount = async (
  fetch: RequestEvent["fetch"],
  options?: Pick<FetchPostsListOptions, "categoryId" | "featuredOnly" | "postType" | "tagIds">,
  token?: string,
): Promise<number> => {
  const directus = createDirectusClient(fetch, token);
  const filter = buildPostFilter(options);

  try {
    // Use readItems instead of aggregate — aggregate doesn't reliably
    // apply relational filters (e.g. category, tags).
    const response = await directus.request<Post[]>(
      readItems("posts", {
        filter,
        fields: postFields(["id"]),
        limit: -1,
      }),
    );
    return response.length;
  } catch (error) {
    log.error("Error fetching total post count:", error);
    return 0;
  }
};

export const fetchTotalPostCount = async (
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<number> => fetchPostsCount(fetch, undefined, token);

export const fetchCategoryBySlug = async (
  slug: string,
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<{ id: string; title: string; slug: string } | null> => {
  const directus = createDirectusClient(fetch, token);

  try {
    const results = await directus.request<Post[]>(
      readItems("posts", {
        filter: postFilter({ category: { slug: { _eq: slug } } }),
        limit: 1,
        fields: postFields([{ category: ["id", "title", "slug"] }]),
      }),
    );
    const cat = results[0]?.category;
    if (!cat || typeof cat === "string") return null;
    if (!cat.slug) return null;
    return { id: String(cat.id), title: String(cat.title), slug: String(cat.slug) };
  } catch (error) {
    log.error("Error fetching category by slug:", error);
    return null;
  }
};

export const fetchTagsBySlugs = async (
  slugs: string[],
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<string[]> => {
  if (!slugs.length) return [];
  const directus = createDirectusClient(fetch, token);

  try {
    const results = await directus.request<Post[]>(
      readItems("posts", {
        filter: postFilter({
          ...PUBLISHED_FILTER,
          tags: { tag_id: { slug: { _in: slugs } } },
        }),
        limit: -1,
        fields: postFields([{ tags: [{ tag_id: ["id", "slug"] }] }]),
      }),
    );
    const seen = new Set<string>();
    for (const post of results) {
      for (const entry of post.tags ?? []) {
        const tag = entry.tag_id;
        if (tag && typeof tag !== "string" && tag.slug && slugs.includes(tag.slug)) {
          seen.add(String(tag.id));
        }
      }
    }
    return [...seen];
  } catch (error) {
    log.error("Error fetching tags by slugs:", error);
    return [];
  }
};

export const fetchAvailableCategories = async (
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<{ id: string; title: string; slug: string }[]> => {
  const directus = createDirectusClient(fetch, token);

  try {
    const results = await directus.request<Post[]>(
      readItems("posts", {
        filter: PUBLISHED_FILTER,
        fields: postFields([{ category: ["id", "title", "slug"] }]),
        limit: -1,
      }),
    );
    const seen = new Map<string, { id: string; title: string; slug: string }>();
    for (const post of results) {
      const cat = post.category;
      if (cat && typeof cat !== "string" && cat.slug) {
        seen.set(cat.id, { id: String(cat.id), title: String(cat.title), slug: String(cat.slug) });
      }
    }
    return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    log.error("Error fetching available categories:", error);
    return [];
  }
};

export const fetchAvailablePostTypes = async (
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<string[]> => {
  const directus = createDirectusClient(fetch, token);

  try {
    const results = await directus.request<Post[]>(
      readItems("posts", {
        fields: postFields(["post_type"]),
        filter: postFilter({ ...PUBLISHED_FILTER, post_type: { _nnull: true } }),
        limit: -1,
      }),
    );
    const seen = new Set<string>();
    for (const r of results) {
      if (r.post_type) seen.add(String(r.post_type));
    }
    return [...seen].sort();
  } catch (error) {
    log.error("Error fetching available post types:", error);
    return [];
  }
};
