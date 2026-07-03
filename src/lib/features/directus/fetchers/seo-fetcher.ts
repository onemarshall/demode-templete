/**
 * SEO metadata fetcher.
 *
 * Fetches SEO data (title, meta description, OG image, noindex/nofollow)
 * from Directus for pages and posts. Falls back gracefully to null
 * when SEO data is missing or in static mode.
 */
import { readItems } from "@directus/sdk";
import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { createDirectusClient } from "./shared";
import type { ExtensionSeoMetadata } from "$lib/types/directus-schema";
import { buildPermalinkCandidates } from "./page-fetcher";
import { createScopedLogger } from "$lib/shared/logger";
import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";

const log = createScopedLogger(["Directus", "SEO"]);

/**
 * Fetch SEO metadata for a page by permalink
 */
async function fetchPageSeo(
  fetch: typeof globalThis.fetch,
  permalink: string,
): Promise<ExtensionSeoMetadata | null> {
  // Check if we're in static mode
  const cmsProvider = privateEnv.CMS_PROVIDER ?? publicEnv.PUBLIC_CMS_PROVIDER ?? "static";
  if (cmsProvider === "static") {
    log.info(`Static mode: skipping SEO fetch for page "${permalink}"`);
    return null;
  }

  try {
    const client = createDirectusClient(fetch, privateEnv.DIRECTUS_TOKEN);

    const result = (await client.request(
      readItems("pages", {
        filter: {
          permalink: { _in: buildPermalinkCandidates(permalink) },
          status: { _eq: "published" },
        },
        fields: ["seo"],
        limit: 1,
      }),
    )) as Array<{ seo?: ExtensionSeoMetadata | null }>;

    if (result.length === 0) {
      return null;
    }

    return result[0]?.seo || null;
  } catch (error) {
    log.warn(`Failed to fetch SEO for page "${permalink}":`, error);
    return null;
  }
}

/**
 * Fetch SEO metadata for a post by slug
 */
async function fetchPostSeo(
  fetch: typeof globalThis.fetch,
  slug: string,
): Promise<ExtensionSeoMetadata | null> {
  // Check if we're in static mode
  const cmsProvider = privateEnv.CMS_PROVIDER ?? publicEnv.PUBLIC_CMS_PROVIDER ?? "static";
  if (cmsProvider === "static") {
    log.info(`Static mode: skipping SEO fetch for post "${slug}"`);
    return null;
  }

  try {
    const client = createDirectusClient(fetch, privateEnv.DIRECTUS_TOKEN);

    const result = (await client.request(
      readItems("posts", {
        filter: {
          slug: { _eq: slug },
          status: { _eq: "published" },
        },
        fields: ["seo", "title", "description"],
        limit: 1,
      }),
    )) as Array<{ seo?: ExtensionSeoMetadata | null; title?: string; description?: string }>;

    if (result.length === 0) {
      return null;
    }

    const post = result[0];
    return post?.seo || null;
  } catch (error) {
    log.warn(`Failed to fetch SEO for post "${slug}":`, error);
    return null;
  }
}

/**
 * Get SEO data
 */
export async function getSeoData(
  fetch: typeof globalThis.fetch,
  type: "page" | "post",
  slug: string,
): Promise<{
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}> {
  const seoData =
    type === "page" ? await fetchPageSeo(fetch, slug) : await fetchPostSeo(fetch, slug);

  return {
    title: seoData?.title,
    description: seoData?.meta_description,
    ogImage: seoData?.og_image ? getDirectusAssetURL(seoData.og_image) : undefined,
    noIndex: seoData?.no_index,
    noFollow: seoData?.no_follow,
  };
}
