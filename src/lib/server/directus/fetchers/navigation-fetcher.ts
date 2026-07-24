/**
 * Navigation fetcher.
 *
 * Fetches navigation items from Directus and builds hierarchical trees.
 * Resolves page/post references to actual permalinks/slugs and enriches
 * flat navigation items into nested parent-child structures.
 */
import type { RequestEvent } from "@sveltejs/kit";
import { z } from "zod";
import { readItems } from "@directus/sdk";
import type { NavigationItem as AppNavigationItem, NavigationTree } from "$lib/content/schema";
import { createDirectusClient, type DirectusClient } from "./shared";

// Simplified schema definitions
const RefSchema = z.union([z.string(), z.object({ id: z.string() })]).nullish();
const EnrichedRefSchema = z
  .union([
    z.string(),
    z.object({
      id: z.string(),
      permalink: z.string().nullish(),
      slug: z.string().nullish(),
      status: z.string().nullish(),
    }),
  ])
  .nullish();

const DirectusNavigationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["page", "post", "url", "group"]).optional(),
  icon: z.string().nullish(),
  url: z.string().nullish(),
  subheader: z.string().nullish(),
  label: z.string().nullish(),
  show_label: z.boolean().nullish(),
  is_visible: z.boolean().nullish(),
  show_in_navbar: z.boolean().nullish(),
  show_in_morph: z.boolean().nullish(),
  morph: z.string().nullish(),
  hide_dropdown: z.boolean().nullish(),
  nav_title: z.string().nullish(),
  show_children: z.boolean().nullish(),
  show_in_sitemap: z.boolean().nullish(),
  sort: z.number().int().nullish(),
  navigation: z.string().nullish(),
  parent: RefSchema,
  page: EnrichedRefSchema,
  post: EnrichedRefSchema,
});

export type DirectusNavigationItem = z.infer<typeof DirectusNavigationItemSchema>;

interface DirectusNavigationFetchResult {
  items: DirectusNavigationItem[];
  error: string | null;
}

const enrichNavigationItems = async (
  items: DirectusNavigationItem[],
  client: DirectusClient,
): Promise<DirectusNavigationItem[]> => {
  // Extract IDs that need enrichment
  const pageIds = new Set<string>();
  const postIds = new Set<string>();

  items.forEach((item) => {
    if (item.type === "page" && item.page && typeof item.page === "string") {
      pageIds.add(item.page);
    } else if (item.type === "post" && item.post && typeof item.post === "string") {
      postIds.add(item.post);
    }
  });

  // Fetch missing data in parallel
  const [pages, posts] = await Promise.all([
    pageIds.size > 0
      ? client.request(
          readItems("pages", {
            filter: { id: { _in: Array.from(pageIds) } },
            fields: ["id", "permalink", "status"],
          }),
        )
      : [],
    postIds.size > 0
      ? client.request(
          readItems("posts", {
            filter: { id: { _in: Array.from(postIds) } },
            fields: ["id", "slug", "status"],
          }),
        )
      : [],
  ]);

  // Create lookup maps
  const pageMap = new Map((pages as Array<{ id: string }>).map((p) => [p.id, p]));
  const postMap = new Map((posts as Array<{ id: string }>).map((p) => [p.id, p]));

  // Enrich items
  return items.map((item) => {
    if (item.type === "page" && item.page && typeof item.page === "string") {
      const page = pageMap.get(item.page);
      if (page) return { ...item, page };
    }
    if (item.type === "post" && item.post && typeof item.post === "string") {
      const post = postMap.get(item.post);
      if (post) return { ...item, post };
    }
    return item;
  });
};

const getParentId = (parent: DirectusNavigationItem["parent"]): string | null => {
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent.id;
};

const getResolvedHref = (item: DirectusNavigationItem): string | undefined => {
  if (item.type === "group") return undefined;
  if (item.url) return item.url;

  if (item.page && typeof item.page !== "string" && item.page.permalink) {
    return item.page.permalink;
  }

  if (item.post && typeof item.post !== "string" && item.post.slug) {
    return `/posts/${item.post.slug}`;
  }

  return undefined;
};

const toNavigationItem = (
  item: DirectusNavigationItem,
  children: AppNavigationItem[],
): AppNavigationItem => ({
  id: item.id,
  title: item.title,
  type: item.type ?? "url",
  url: getResolvedHref(item),
  sort: item.sort ?? undefined,
  is_visible: item.is_visible ?? undefined,
  show_in_navbar: item.show_in_navbar ?? undefined,
  show_in_morph: item.show_in_morph ?? undefined,
  show_in_sitemap: item.show_in_sitemap ?? undefined,
  morph: item.morph ?? undefined,
  show_children: item.show_children ?? undefined,
  hide_dropdown: item.hide_dropdown ?? undefined,
  nav_title: item.nav_title ?? undefined,
  icon: item.icon ?? undefined,
  label: item.label ?? undefined,
  show_label: item.show_label ?? undefined,
  page:
    item.page && typeof item.page !== "string"
      ? {
          id: item.page.id,
          title: item.title,
          permalink: item.page.permalink ?? undefined,
          status: item.page.status ?? "",
        }
      : undefined,
  post:
    item.post && typeof item.post !== "string"
      ? {
          id: item.post.id,
          title: item.title,
          permalink: item.post.slug ?? undefined,
          status: item.post.status ?? "",
        }
      : undefined,
  children: children.length > 0 ? children : undefined,
});

const buildNavigationTree = (
  items: DirectusNavigationItem[],
  navigationId: string,
): NavigationTree => {
  const childrenByParent = new Map<string, DirectusNavigationItem[]>();
  const roots: DirectusNavigationItem[] = [];

  // Group items by parent
  items.forEach((item) => {
    const parentId = getParentId(item.parent);
    if (!parentId) {
      if (item.navigation === navigationId) roots.push(item);
    } else {
      const children = childrenByParent.get(parentId) ?? [];
      children.push(item);
      childrenByParent.set(parentId, children);
    }
  });

  const sortByOrder = (a: DirectusNavigationItem, b: DirectusNavigationItem) =>
    (a.sort ?? 0) - (b.sort ?? 0);

  const mapNode = (item: DirectusNavigationItem): AppNavigationItem => {
    const children = (childrenByParent.get(item.id) ?? []).sort(sortByOrder).map(mapNode);
    return toNavigationItem(item, children);
  };

  return roots.sort(sortByOrder).map(mapNode);
};

export const fetchDirectusNavigationItems = async (
  fetch: RequestEvent["fetch"],
  token?: string,
): Promise<DirectusNavigationFetchResult> => {
  try {
    const client = createDirectusClient(fetch, token);

    const data = await client.request(
      readItems("navigation_items", {
        sort: ["sort"],
        filter: { is_visible: { _eq: true } },
        fields: [
          "*",
          "parent.id",
          "page.id",
          "page.permalink",
          "page.status",
          "post.id",
          "post.slug",
          "post.status",
        ],
      } as unknown as never),
    );

    const parsed = z.array(DirectusNavigationItemSchema).safeParse(data);
    if (!parsed.success) {
      return { items: [], error: "Invalid navigation schema" };
    }

    const enriched = await enrichNavigationItems(parsed.data, client);
    return { items: enriched, error: null };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
};

export const fetchDirectusNavigationTree = async (
  fetch: RequestEvent["fetch"],
  navigationId = "main",
  token?: string,
): Promise<{ tree: NavigationTree; error: string | null }> => {
  const result = await fetchDirectusNavigationItems(fetch, token);

  if (result.error) {
    return { tree: [], error: result.error };
  }

  return { tree: buildNavigationTree(result.items, navigationId), error: null };
};
