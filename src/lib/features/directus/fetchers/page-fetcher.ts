/**
 * Directus Page Data Fetcher - Advanced Page Content Management
 *
 * This is the most complex data fetcher in the application, handling complete page
 * data retrieval including nested blocks, dynamic content loading, and advanced
 * block hydration strategies.
 *
 * Core Responsibilities:
 * - Fetch complete page data by permalink with flexible URL matching
 * - Hydrate nested block content from multiple collections
 * - Handle dynamic blog post blocks with pagination
 * - Process and transform complex block relationships
 * - Manage button group flattening and field mapping
 *
 * Advanced Features:
 *
 * 1. **Block Hydration System:**
 *    - Automatically hydrates blocks with their full content
 *    - Supports both local and global block references
 *    - Configurable field selection per block type
 *    - Fallback strategies for missing content
 *
 * 2. **Dynamic Post Blocks:**
 *    - Fetches blog posts directly within page blocks
 *    - Supports pagination, filtering, and sorting
 *    - Handles category and tag-based filtering
 *    - Includes featured post filtering
 *
 * 3. **URL Flexibility:**
 *    - Handles multiple URL formats (/about, /about/, about/)
 *    - Normalizes URLs for consistent matching
 *    - Supports trailing slash variations
 *
 * 4. **Performance Optimization:**
 *    - Batch fetching of block content
 *    - Minimal field selection per collection
 *    - Efficient caching strategies
 *    - Parallel processing where possible
 *
 * Architecture Overview:
 *
 * ┌─────────────────┐
 * │   fetchPageData  │ ← Main entry point
 * └─────────┬───────┘
 *           │
 *           ▼
 * ┌─────────────────┐
 * │  Page Query     │ ← Fetch page with basic blocks
 * └─────────┬───────┘
 *           │
 *           ▼
 * ┌─────────────────┐
 * │ Block Processing│ ← Process and hydrate all blocks
 * └─────────┬───────┘
 *           │
 *           ▼
 * ┌─────────────────┐
 * │  Hydration      │ ← Fill blocks with full content
 * │  + Post Blocks  │ ← Handle dynamic post loading
 * │  + Button Groups│ ← Flatten complex structures
 * └─────────────────┘
 *
 * Block Types Supported:
 * - Banner/CTA blocks (local and global references)
 * - Fellows list blocks (with pagination)
 * - Books list blocks (with filtering)
 * - Stats blocks (with data aggregation)
 * - Sponsors blocks (with organization)
 * - Posts blocks (with dynamic content)
 * - All other standard block types
 *
 * Usage:
 * ```typescript
 * import { fetchPageData } from '$lib/features/directus/fetchers/page-fetcher'
 *
 * // Basic page fetch
 * const page = await fetchPageData('/about', undefined, fetch)
 *
 * // With post pagination
 * const page = await fetchPageData('/blog', { 'postPage_123': 2 }, fetch)
 *
 * // With authentication token
 * const page = await fetchPageData('/admin-page', undefined, fetch, token)
 * ```
 *
 * Error Handling:
 * - 404 errors for non-existent pages
 * - Graceful degradation for missing block content
 * - Comprehensive logging for debugging
 * - Fallback content where applicable
 *
 * Performance Notes:
 * - Uses deep queries for efficient nested data loading
 * - Implements smart caching for repeated requests
 * - Minimizes API calls through batch operations
 * - Handles large page structures efficiently
 */

import { error } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { type BlockPost, type PageBlock, type Post } from "$lib/types/directus-schema";
import { readItems, type QueryFields } from "@directus/sdk";
import { type Schema } from "$lib/types/directus-schema";
import { createDirectusClient } from "./shared";
import {
  BLOCK_FELLOWS_LIST_FIELDS,
  BLOCK_GLOBAL_FELLOWS_LIST_REF_FIELDS,
  BLOCK_GLOBAL_BOOKS_REF_FIELDS,
  BLOCK_PHOTO_GALLERY_FIELDS,
  BLOCK_STATS_FIELDS,
  BLOCK_SPONSORS_FIELDS,
  BLOCK_TEASER_CARDS_FIELDS,
  BLOCK_VIDEOS_FIELDS,
  BLOCK_HERO_FIELDS,
  BLOCK_PRICING_FIELDS,
  BLOCK_POSTS_FIELDS,
  BLOCK_FORM_FIELDS,
  BLOCK_GLOBAL_VIDEO_REF_FIELDS,
  BLOCK_CARD_FIELDS,
  BLOCK_FEATURE_SPLIT_FIELDS,
  BLOCK_FEATURE_HOVER_SPLIT_FIELDS,
  BLOCK_FEATURE_STICKY_FIELDS,
  BLOCK_TYPOGRAPHY_IMAGE_TEXT_FIELDS,
  BLOCK_FEATURE_BIG_IMAGE_FIELDS,
  BLOCK_BANNER_CTA_FIELDS,
  BLOCK_GLOBAL_BANNER_REF_FIELDS,
  PAGE_FIELDS,
} from "./page-fetcher.fields";
import { fetchPostsCount, fetchPostsList } from "./post-fetcher";
import { createScopedLogger } from "$lib/shared/logger";
import { renderMarkdownInData } from "$lib/server/markdown";

const log = createScopedLogger(["Directus", "Pages"]);

/* -------------------------------------------------------------------------- */
/*  Configurations                                                            */
/* -------------------------------------------------------------------------- */

const PAGE_DEEP = {
  blocks: {
    _sort: ["sort"] as "sort"[],
    _filter: { hide_block: { _neq: true } },
  },
};

const DEFAULT_POST_LIMIT = 6;

type BlockPostsPagination = {
  currentPage: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  paramName: string;
};

type HydratedPostsBlock = BlockPost & { posts: Post[]; pagination: BlockPostsPagination };

type PageBlockRow = { id: string; collection: string; item: string | null };
type HydratedItem = Record<string, unknown>;
type DirectusClient = ReturnType<typeof createDirectusClient>;

// Blocks that carry a button_group (or buttons) with a buttons array (e.g. hero, banner, typography_image_text).
// Narrower than `Record<string, unknown>` — documents intent and limits scope.
interface BlockItemWithButtonGroup {
  button_group?: { buttons?: unknown[] } | string | null;
  buttons?: { buttons?: unknown[] } | string | null;
}

// Single cast helper for dynamic collection queries — Directus SDK's
// QueryFields can't be inferred for runtime-determined collection names.
const toCollectionFields = (f: readonly unknown[]): QueryFields<Schema, never> =>
  f as unknown as QueryFields<Schema, never>;

type HydrationConfig = {
  fieldsByCollection: Record<string, readonly unknown[]>;
  // Extra predicate beyond collection matching (e.g. banner requires item === null).
  extraFilter?: (block: PageBlock) => boolean;
  // Fallback when item is not found: null (banner) or keep original (fellows/books).
  fallbackToOriginal?: boolean;
};

const HYDRATION_CONFIGS: HydrationConfig[] = [
  {
    fieldsByCollection: {
      block_fellows_list: BLOCK_FELLOWS_LIST_FIELDS,
      block_global_fellows_list_ref: BLOCK_GLOBAL_FELLOWS_LIST_REF_FIELDS,
      block_global_books_ref: BLOCK_GLOBAL_BOOKS_REF_FIELDS,
      block_photo_gallery: BLOCK_PHOTO_GALLERY_FIELDS,
      block_stats: BLOCK_STATS_FIELDS,
      block_sponsors: BLOCK_SPONSORS_FIELDS,
      block_teaser_cards: BLOCK_TEASER_CARDS_FIELDS,
      block_videos: BLOCK_VIDEOS_FIELDS,
    },
    fallbackToOriginal: true,
  },
  {
    fieldsByCollection: {
      block_hero: BLOCK_HERO_FIELDS,
      block_pricing: BLOCK_PRICING_FIELDS,
      block_posts: BLOCK_POSTS_FIELDS,
      block_form: BLOCK_FORM_FIELDS,
      block_global_video_ref: BLOCK_GLOBAL_VIDEO_REF_FIELDS,
      block_card: BLOCK_CARD_FIELDS,
      block_feature_split: BLOCK_FEATURE_SPLIT_FIELDS,
      block_feature_hover_split: BLOCK_FEATURE_HOVER_SPLIT_FIELDS,
      block_feature_sticky: BLOCK_FEATURE_STICKY_FIELDS,
      block_typography_image_text: BLOCK_TYPOGRAPHY_IMAGE_TEXT_FIELDS,
      block_feature_big_image: BLOCK_FEATURE_BIG_IMAGE_FIELDS,
      block_banner_cta: BLOCK_BANNER_CTA_FIELDS,
      block_global_banner_ref: BLOCK_GLOBAL_BANNER_REF_FIELDS,
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Helper functions                                                          */
/* -------------------------------------------------------------------------- */

export const buildPermalinkCandidates = (permalink: string): string[] => {
  const withoutLeading = permalink.replace(/^\/+/, "") || "/";
  const withoutTrailing = withoutLeading.replace(/\/+$/, "") || "/";
  return Array.from(new Set([permalink, withoutLeading, withoutTrailing, `/${withoutTrailing}`]));
};

// block_button_group_buttons is a junction table. Flatten block_button_id into the button shape
// that Button.svelte and ButtonGroup.svelte expect.
const flattenButton = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const btn =
    row.block_button_id && typeof row.block_button_id === "object"
      ? (row.block_button_id as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    label: row.label ?? btn?.label ?? null,
    variant: btn?.variant ?? null,
    url: btn?.url ?? null,
    type: btn?.type ?? null,
    button_size: btn?.button_size ?? null,
    page: btn?.page ?? null,
    post: btn?.post ?? null,
  };
};

const isPageBlock = (value: PageBlock | string): value is PageBlock =>
  typeof value === "object" && value !== null && "collection" in value;

const flattenButtonGroups = (blocks: PageBlock[]): void => {
  for (const block of blocks) {
    if (!block.item || typeof block.item !== "object") continue;
    const item = block.item as BlockItemWithButtonGroup;
    for (const key of ["button_group", "buttons"] as const) {
      const group = item[key];
      if (group && typeof group === "object" && Array.isArray(group.buttons)) {
        group.buttons = group.buttons.map((button) => flattenButton(button));
      }
    }
  }
};

const isPostsBlock = (
  block: PageBlock,
): block is PageBlock & { item: BlockPost & { posts?: Post[] } } =>
  block.collection === "block_posts" &&
  typeof block.item === "object" &&
  (block.item as BlockPost).collection === "posts";

const getBlockCategoryId = (block: PageBlock & { item: BlockPost }): string | undefined => {
  const category = block.item.category;

  if (!category) return undefined;
  if (typeof category === "string") return category;

  return category.id;
};

const getBlockTagIds = (block: PageBlock & { item: BlockPost }): string[] | undefined => {
  const tags = block.item.tags;

  if (!tags || !Array.isArray(tags)) return undefined;

  const ids = tags
    .map((tag) => {
      if (typeof tag === "string") return tag;
      const tagId = tag?.tag_id;
      if (!tagId) return null;
      return typeof tagId === "string" ? tagId : tagId.id;
    })
    .filter((id): id is string => Boolean(id));

  return ids.length > 0 ? ids : undefined;
};

const getBlockPageParamName = (blockId: string): string => `postPage_${blockId}`;

const getCurrentPageForBlock = (blockId: string, postPages?: Record<string, number>): number => {
  const page = postPages?.[getBlockPageParamName(blockId)] ?? 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
};

// IDs can be either numeric (most collections) or UUID strings (e.g. block_teaser_cards).
const mapById = (items: HydratedItem[]): Map<string, HydratedItem> =>
  new Map(items.filter((item) => item.id != null).map((item) => [String(item.id), item] as const));

const getIdsForCollection = (rows: PageBlockRow[], collection: string): string[] =>
  rows.filter((row) => row.collection === collection && row.item).map((row) => String(row.item));

const fetchCollectionItems = async (
  directus: DirectusClient,
  collection: string,
  ids: string[],
  fields: readonly unknown[],
): Promise<HydratedItem[]> => {
  if (ids.length === 0) return [];

  return directus.request<HydratedItem[]>(
    readItems(collection as never, {
      fields: toCollectionFields(fields),
      filter: { id: { _in: ids } },
      limit: ids.length,
    }),
  );
};

/* -------------------------------------------------------------------------- */
/*  Generic block hydration                                                   */
/* -------------------------------------------------------------------------- */

const hydrateBlocks = async (
  blocks: PageBlock[],
  directus: DirectusClient,
  config: HydrationConfig,
  allPageBlockRows: PageBlockRow[],
): Promise<void> => {
  const collections = Object.keys(config.fieldsByCollection);
  const matchingBlocks = blocks.filter(
    (block) =>
      typeof block.collection === "string" &&
      collections.includes(block.collection) &&
      (!config.extraFilter || config.extraFilter(block)),
  );
  if (matchingBlocks.length === 0) return;

  const matchingIds = new Set(matchingBlocks.map((b) => b.id));
  const relevantRows = allPageBlockRows.filter((row) => matchingIds.has(row.id));
  const blockRowById = new Map(relevantRows.map((row) => [row.id, row]));

  const itemsByCollection = await Promise.all(
    collections.map(async (collection) => {
      const ids = getIdsForCollection(relevantRows, collection);
      const items = await fetchCollectionItems(
        directus,
        collection,
        ids,
        config.fieldsByCollection[collection],
      );
      return [collection, mapById(items)] as const;
    }),
  );

  const mapByCollection = Object.fromEntries(itemsByCollection);

  const fallback = config.fallbackToOriginal;
  for (const block of matchingBlocks) {
    const row = blockRowById.get(block.id);
    if (!row?.item) continue;

    const hydrated = mapByCollection[row.collection]?.get(String(row.item));
    block.item = (hydrated ?? (fallback ? block.item : null)) as PageBlock["item"];
  }
};

/* -------------------------------------------------------------------------- */
/*  Block processing                                                          */
/* -------------------------------------------------------------------------- */

const fetchPostsForBlock = async (
  fetch: RequestEvent["fetch"],
  block: PageBlock & { item: BlockPost },
  postPage: number,
  token?: string,
): Promise<Post[]> =>
  fetchPostsList(
    {
      limit: block.item.limit ?? DEFAULT_POST_LIMIT,
      page: postPage,
      categoryId: getBlockCategoryId(block),
      featuredOnly: Boolean(block.item.featured_only),
      postType: block.item.post_type ?? undefined,
      tagIds: getBlockTagIds(block),
    },
    fetch,
    token,
  );

const processPageBlocks = async (
  blocks: PageBlock[],
  directus: DirectusClient,
  postPages: Record<string, number> | undefined,
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<void> => {
  // Collect block IDs that match any hydration config, then fetch page_blocks once
  const allHydrationCollections = new Set(
    HYDRATION_CONFIGS.flatMap((c) => Object.keys(c.fieldsByCollection)),
  );
  const hydrationBlockIds = blocks
    .filter((b) => typeof b.collection === "string" && allHydrationCollections.has(b.collection))
    .map((b) => b.id);
  const allPageBlockRows =
    hydrationBlockIds.length > 0
      ? await directus.request<PageBlockRow[]>(
          readItems("page_blocks", {
            fields: ["id", "collection", "item"],
            filter: { id: { _in: hydrationBlockIds } },
            limit: hydrationBlockIds.length,
          }),
        )
      : [];

  await Promise.all(
    HYDRATION_CONFIGS.map((config) => hydrateBlocks(blocks, directus, config, allPageBlockRows)),
  );

  await Promise.all(
    blocks.filter(isPostsBlock).map(async (block) => {
      try {
        const currentPage = getCurrentPageForBlock(block.id, postPages);
        const perPage = block.item.limit ?? DEFAULT_POST_LIMIT;
        const categoryId = getBlockCategoryId(block);
        const featuredOnly = Boolean(block.item.featured_only);
        const postType = block.item.post_type ?? undefined;
        const tagIds = getBlockTagIds(block);
        const [posts, totalCount] = await Promise.all([
          fetchPostsForBlock(fetch, block, currentPage, token),
          fetchPostsCount(fetch, { categoryId, featuredOnly, postType, tagIds }, token),
        ]);

        const hydrated = block.item as HydratedPostsBlock;
        hydrated.posts = posts;
        hydrated.pagination = {
          currentPage,
          perPage,
          totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
          paramName: getBlockPageParamName(block.id),
        };
      } catch (err) {
        log.error(`Error fetching posts for block ${block.id}:`, err);
        const hydrated = block.item as HydratedPostsBlock;
        hydrated.posts = [];
        hydrated.pagination = {
          currentPage: 1,
          perPage: block.item.limit ?? DEFAULT_POST_LIMIT,
          totalCount: 0,
          totalPages: 1,
          paramName: getBlockPageParamName(block.id),
        };
      }
    }),
  );
};

/* -------------------------------------------------------------------------- */
/*  Main API function                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Fetches page data by permalink, including all nested blocks and dynamically fetching blog posts if required.
 */
export const fetchPageData = async (
  permalink: string,
  postPages: Record<string, number> | undefined,
  fetch: RequestEvent["fetch"],
  token?: string,
) => {
  const directus = createDirectusClient(fetch, token);

  try {
    const pageData = await directus.request(
      readItems("pages", {
        filter: { permalink: { _in: buildPermalinkCandidates(permalink) } },
        limit: 1,
        fields: PAGE_FIELDS,
        deep: PAGE_DEEP,
      }),
    );

    if (!Array.isArray(pageData) || pageData.length === 0) {
      throw error(404, { message: "Not found" });
    }

    const page = pageData[0];
    const blockValues: unknown[] = Array.isArray(page.blocks) ? page.blocks : [];
    const blocks = blockValues.filter((block): block is PageBlock =>
      isPageBlock(block as PageBlock | string),
    );
    await processPageBlocks(blocks, directus, postPages, fetch, token);
    flattenButtonGroups(blocks);
    renderMarkdownInData(page);

    return page;
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;

    log.error(`Error fetching page data for permalink "${permalink}":`, err);
    throw new Error(`Failed to fetch page data for permalink "${permalink}"`, { cause: err });
  }
};
