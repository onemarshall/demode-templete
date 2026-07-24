/**
 * RSS feed data fetcher.
 *
 * Fetches globals (site title/description/URL) and recent posts in parallel,
 * then maps them to RSS item format. Used by the /rss.xml endpoint.
 */
import { readItems, readSingleton } from "@directus/sdk";
import type { Post } from "$lib/types/directus-schema";
import { createDirectusClient, type DirectusClient, PUBLISHED_FILTER, POST_SORT } from "./shared";
import { getDirectusAssetURL } from "../asset-utils";
import { createScopedLogger } from "$lib/utils/logger";

const log = createScopedLogger(["Directus", "RSS"]);

export interface RSSItem {
  title: string;
  link: string;
  description?: string | null;
  content?: string | null;
  pubDate: string;
  author?: string | null;
  image?: string | null;
}

export interface RSSFeedData {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

interface RSSGlobals {
  title?: string | null;
  description?: string | null;
  url?: string | null;
}

const GLOBAL_FIELDS = ["title", "description", "url"] as const;

const POST_FIELDS = [
  "title",
  "slug",
  "description",
  "content",
  "published_at",
  "author",
  { author: ["first_name", "last_name"] },
  "image",
] as const;

type AuthorName = { first_name?: string | null; last_name?: string | null };

const isAuthorName = (
  author: Post["author"],
): author is Exclude<Post["author"], string | null | undefined> & AuthorName =>
  typeof author === "object" &&
  author !== null &&
  ("first_name" in author || "last_name" in author);

const resolveAuthor = (author: Post["author"]): string | null => {
  if (!author) return null;
  if (typeof author === "string") return author;
  if (!isAuthorName(author)) return null;

  return [author.first_name, author.last_name].filter(Boolean).join(" ") || null;
};

const fetchRSSGlobals = (directus: DirectusClient) =>
  directus.request<RSSGlobals>(readSingleton("globals", { fields: GLOBAL_FIELDS as never }));

const fetchRSSPosts = (directus: DirectusClient, limit: number) =>
  directus.request<Post[]>(
    readItems("posts", {
      filter: PUBLISHED_FILTER,
      fields: POST_FIELDS as never,
      sort: POST_SORT,
      limit,
    }),
  );

const toRSSItem = (
  post: Post & { slug: string; published_at: string },
  siteUrl: string,
): RSSItem => ({
  title: post.title,
  link: `${siteUrl}/news/${post.slug}`,
  description: post.description || null,
  content: post.content || null,
  pubDate: new Date(post.published_at).toUTCString(),
  author: resolveAuthor(post.author),
  image: post.image ? getDirectusAssetURL(post.image) : null,
});

export const fetchRSSFeedData = async (
  fetch: typeof globalThis.fetch,
  limit = 20,
): Promise<RSSFeedData> => {
  const directus = createDirectusClient(fetch);

  try {
    const [globals, posts] = await Promise.all([
      fetchRSSGlobals(directus),
      fetchRSSPosts(directus, limit),
    ]);

    const siteUrl = globals?.url || "";
    const siteTitle = globals?.title || "Blog";
    const siteDescription = globals?.description || "Latest blog posts";

    const items: RSSItem[] = posts
      .filter(
        (post): post is Post & { slug: string; published_at: string } =>
          !!post.slug && !!post.published_at,
      )
      .map((post) => toRSSItem(post, siteUrl));

    return { title: siteTitle, description: siteDescription, link: siteUrl, items };
  } catch (error) {
    log.error("Error fetching RSS feed data:", error);
    throw new Error("Failed to fetch RSS feed data", { cause: error });
  }
};
