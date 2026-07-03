import { z } from "zod";
import type { PageServerLoad } from "./$types";
import { getContentProvider } from "$lib/content";
import type { PostFilters } from "$lib/content/provider";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  category: z.string().optional(),
  featured: z.string().optional(),
  post_type: z.string().optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
});

const DEFAULT_POSTS_PER_PAGE = 12;

export const load: PageServerLoad = async ({ url }) => {
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    category: url.searchParams.get("category") ?? undefined,
    featured: url.searchParams.get("featured") ?? undefined,
    post_type: url.searchParams.get("post_type") ?? undefined,
    tag: url.searchParams.getAll("tag"),
  });

  const query = parsed.success ? parsed.data : { page: 1, category: undefined, featured: undefined, post_type: undefined, tag: [] };

  const filters: PostFilters = {
    categorySlug: query.category,
    featuredOnly: query.featured === "true" ? true : undefined,
    postType: query.post_type,
    tagSlugs: query.tag.length ? query.tag : undefined,
  };

  const provider = getContentProvider();
  const perPage = DEFAULT_POSTS_PER_PAGE;

  const [posts, totalCount, categories, postTypes, pageRecord] = await Promise.all([
    provider.getPaginatedPosts(query.page, perPage, filters),
    provider.getTotalPostCount(filters),
    provider.getAvailableCategories(),
    provider.getAvailablePostTypes(),
    provider.getPageByPath("/news").catch(() => null),
  ]);

  return {
    pageBlocks: pageRecord?.blocks ?? [],
    posts,
    filters: {
      category: query.category,
      featured: query.featured === "true",
      post_type: query.post_type,
      tags: query.tag,
    },
    categories,
    postTypes,
    seo: {
      title: "Blog",
      description: "Latest posts and articles",
      noIndex: false,
      noFollow: false,
    },
    pagination: {
      page: query.page,
      perPage,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    },
  };
};
