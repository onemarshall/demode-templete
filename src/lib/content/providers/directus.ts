import { DIRECTUS_TOKEN } from "$app/env/private";
import {
  SiteDataSchema,
  PageBuilderModelSchema,
  PostDetailSchema,
  type PostSummary,
} from "$lib/content/schema";
import { buildFallbackSiteData } from "./shared";
import {
  fetchDirectusNavigationTree,
  fetchDirectusGlobals,
  fetchPageData,
} from "$lib/features/directus/fetchers";
import {
  fetchPostBySlug,
  fetchPostsList,
  fetchPostsCount,
  fetchRelatedPosts,
  fetchTotalPostCount,
  fetchCategoryBySlug,
  fetchTagsBySlugs,
  fetchAvailableCategories,
  fetchAvailablePostTypes,
} from "$lib/features/directus/fetchers/post-fetcher";
import type { Post } from "$lib/types/directus-schema";
import type { ContentProvider, PageLoadOptions, PostFilters } from "../provider";

const is404 = (err: unknown): boolean =>
  !!err &&
  typeof err === "object" &&
  "status" in err &&
  (err as { status: unknown }).status === 404;

const logDirectusError = (label: string, err: unknown): void => {
  console.error(`Error in Directus ${label}:`, err);
};

const withDirectusFallback = async <T>(
  label: string,
  fallback: T,
  load: () => Promise<T>,
): Promise<T> => {
  try {
    return await load();
  } catch (err) {
    logDirectusError(label, err);
    return fallback;
  }
};

export const createDirectusContentProvider = (): ContentProvider => {
  // Helper to resolve category and tag IDs from slugs
  const resolveFilterIds = async (filters: PostFilters) => {
    const categoryId = filters.categorySlug
      ? (
          await fetchCategoryBySlug(
            filters.categorySlug,
            globalThis.fetch,
            DIRECTUS_TOKEN,
          )
        )?.id
      : undefined;
    const tagIds = filters.tagSlugs?.length
      ? await fetchTagsBySlugs(filters.tagSlugs, globalThis.fetch, DIRECTUS_TOKEN)
      : undefined;
    return { categoryId, tagIds };
  };

  return {
    type: "directus",
    getSiteData: async () => {
      const [
        { tree: headerTree, error: headerNavigationError },
        { tree: footerTree, error: footerNavigationError },
        { tree: copyrightTree, error: copyrightNavigationError },
        directusGlobals,
      ] = await Promise.all([
        fetchDirectusNavigationTree(globalThis.fetch, "main", DIRECTUS_TOKEN),
        fetchDirectusNavigationTree(globalThis.fetch, "footer", DIRECTUS_TOKEN),
        fetchDirectusNavigationTree(globalThis.fetch, "copyright", DIRECTUS_TOKEN),
        fetchDirectusGlobals(globalThis.fetch, DIRECTUS_TOKEN),
      ]);

      if (headerNavigationError || footerNavigationError) {
        const reason = headerNavigationError ?? footerNavigationError;
        console.warn(`[directus] Using fallback site data: ${reason}`);
        return buildFallbackSiteData();
      }

      const fallback = buildFallbackSiteData();

      return SiteDataSchema.parse({
        ...fallback,
        globals: {
          ...fallback.globals,
          ...directusGlobals,
        },
        headerNavigation: headerTree,
        footerNavigation: footerTree,
        copyrightNavigation: copyrightNavigationError ? [] : copyrightTree,
      });
    },
    getPageByPath: async (path: string, options?: PageLoadOptions) => {
      try {
        const pageData = await fetchPageData(
          path,
          options?.postPages,
          globalThis.fetch,
          DIRECTUS_TOKEN,
        );
        if (!pageData) return null;
        return PageBuilderModelSchema.parse({
          path,
          title: pageData.title || path,
          blocks: pageData.blocks || [],
        });
      } catch (err) {
        if (is404(err)) return null;
        logDirectusError(`getPageByPath for ${path}`, err);
        return null;
      }
    },
    getPostBySlug: async (slug: string, options) =>
      withDirectusFallback(`getPostBySlug for ${slug}`, null, async () => {
        const post = await fetchPostBySlug(
          slug,
          options,
          globalThis.fetch,
          DIRECTUS_TOKEN,
        );
        if (!post) return null;
        return PostDetailSchema.parse(post);
      }),
    getRelatedPosts: async (postId: string) =>
      withDirectusFallback(`getRelatedPosts for ${postId}`, [] as PostSummary[], async () => {
        return (await fetchRelatedPosts(
          postId,
          globalThis.fetch,
          DIRECTUS_TOKEN,
        )) as PostSummary[];
      }),
    getPaginatedPosts: async (page: number, limit: number, filters?: PostFilters) =>
      withDirectusFallback("getPaginatedPosts", [] as PostSummary[], async () => {
        const { categoryId, tagIds } = filters ? await resolveFilterIds(filters) : {};

        return (await fetchPostsList(
          {
            limit,
            page,
            categoryId,
            featuredOnly: filters?.featuredOnly,
            postType: filters?.postType as Post["post_type"] | undefined,
            tagIds,
          },
          globalThis.fetch,
          DIRECTUS_TOKEN,
        )) as PostSummary[];
      }),
    getTotalPostCount: async (filters?: PostFilters) =>
      withDirectusFallback("getTotalPostCount", 0, async () => {
        if (
          !filters ||
          Object.values(filters).every(
            (v) => v === undefined || v === null || (Array.isArray(v) && v.length === 0),
          )
        ) {
          return fetchTotalPostCount(globalThis.fetch, DIRECTUS_TOKEN);
        }
        const { categoryId, tagIds } = await resolveFilterIds(filters);
        return fetchPostsCount(
          globalThis.fetch,
          {
            categoryId,
            featuredOnly: filters.featuredOnly,
            postType: filters.postType as Post["post_type"] | undefined,
            tagIds,
          },
          DIRECTUS_TOKEN,
        );
      }),
    getAvailableCategories: async () =>
      withDirectusFallback("getAvailableCategories", [], async () =>
        fetchAvailableCategories(globalThis.fetch, DIRECTUS_TOKEN),
      ),
    getAvailablePostTypes: async () =>
      withDirectusFallback("getAvailablePostTypes", [], async () =>
        fetchAvailablePostTypes(globalThis.fetch, DIRECTUS_TOKEN),
      ),
  };
};
