/**
 * SEO metadata fetcher.
 *
 * Fetches SEO data (title, meta description, OG image, noindex/nofollow)
 * from Directus for pages and posts. Falls back gracefully to null
 * when SEO data is missing or in static mode.
 */
import { readItems } from "@directus/sdk";
import { CMS_PROVIDER, DIRECTUS_TOKEN } from "$app/env/private";
import { PUBLIC_CMS_PROVIDER } from "$app/env/public";
import { createDirectusClient } from "./shared";
import type { ExtensionSeoMetadata } from "$lib/types/directus-schema";
import { buildPermalinkCandidates } from "./page-fetcher";
import { createScopedLogger } from "$lib/utils/logger";
import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";

const log = createScopedLogger(["Directus", "SEO"]);

/**
 * Fetch SEO metadata for a page by permalink
 */
async function fetchPageSeo(
  fetch: typeof globalThis.fetch,
  permalink: string,
): Promise<ExtensionSeoMetadata | null> {
  // Check if we're in static mode
  const cmsProvider = CMS_PROVIDER ?? PUBLIC_CMS_PROVIDER ?? "static";
  if (cmsProvider === "static") {
    log.info(`Static mode: skipping SEO fetch for page "${permalink}"`);
    return null;
  }

  try {
    const client = createDirectusClient(fetch, DIRECTUS_TOKEN);

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
  const cmsProvider = CMS_PROVIDER ?? PUBLIC_CMS_PROVIDER ?? "static";
  if (cmsProvider === "static") {
    log.info(`Static mode: skipping SEO fetch for post "${slug}"`);
    return null;
  }

  try {
    const client = createDirectusClient(fetch, DIRECTUS_TOKEN);

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
