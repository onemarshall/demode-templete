/**
 * Directus Sitemap Data Fetcher
 *
 * This module provides functions to fetch sitemap-relevant data from Directus CMS.
 * It's optimized for generating XML sitemaps and includes SEO metadata handling.
 *
 * Key Features:
 * - Fetches published pages and posts for sitemap generation
 * - Handles SEO metadata (priority, change frequency, no-index)
 * - Optimized queries with only necessary fields
 * - Type-safe interfaces for sitemap items
 * - Default homepage entry generation
 *
 * Sitemap Standards Support:
 * - XML sitemap protocol compliance
 * - SEO priority and change frequency handling
 * - Last-modified date tracking
 * - Publication status filtering
 *
 * Data Structure:
 * - Pages: Uses permalink for URL structure
 * - Posts: Uses slug for URL structure
 * - SEO: Includes sitemap-specific metadata
 * - Dates: Uses published_at for lastmod
 *
 * Usage:
 * ```typescript
 * import { fetchSitemapPages, fetchSitemapPosts, getDefaultHomepageEntry } from '$lib/features/directus/fetchers/sitemap-fetcher'
 *
 * // Fetch all published pages for sitemap
 * const pages = await fetchSitemapPages(fetch)
 *
 * // Fetch all published posts for sitemap
 * const posts = await fetchSitemapPosts(fetch)
 *
 * // Get default homepage entry
 * const homepage = getDefaultHomepageEntry()
 * ```
 *
 * SEO Configuration:
 * The sitemap data respects Directus SEO field configuration:
 * - seo.sitemap.priority: Priority value (0.0-1.0)
 * - seo.sitemap.change_frequency: Change frequency (always, hourly, daily, etc.)
 * - seo.no_index: Excludes from sitemap if true
 *
 * Performance:
 * - Minimal field selection for faster queries
 * - Efficient filtering by publication status
 * - Batch processing of multiple content types
 */

import { readItems } from "@directus/sdk";
import type { Page, Post } from "$lib/types/directus-schema";
import { createDirectusClient } from "./shared";

interface SitemapItem {
  id: string;
  permalink?: string;
  slug?: string | null;
  published_at?: string | null;
  date_updated?: string | null;
  status?: string;
  seo?: {
    sitemap?: {
      priority?: string;
      change_frequency?: string;
    };
    no_index?: boolean;
  };
}

interface PageItem extends SitemapItem {
  permalink: string;
}

interface PostItem extends SitemapItem {
  slug: string;
}

const mapSeo = (seo: Page["seo"] | Post["seo"]): SitemapItem["seo"] => {
  if (!seo) return undefined;
  return {
    sitemap: seo.sitemap
      ? {
          priority: seo.sitemap.priority?.toString(),
          change_frequency: seo.sitemap.change_frequency,
        }
      : undefined,
    no_index: seo.no_index,
  };
};

export const fetchSitemapPages = async (fetch: typeof globalThis.fetch): Promise<PageItem[]> => {
  const directus = createDirectusClient(fetch);

  const pages = await directus.request<Page[]>(
    readItems("pages", {
      filter: { status: { _eq: "published" }, permalink: { _nnull: true } },
      fields: ["id", "permalink", "published_at", "status", "seo"],
      sort: ["-published_at"],
    }),
  );

  return pages.map((page) => ({
    id: page.id,
    permalink: page.permalink,
    published_at: page.published_at,
    date_updated: page.published_at || new Date().toISOString(),
    status: page.status,
    seo: mapSeo(page.seo),
  }));
};

export const fetchSitemapPosts = async (fetch: typeof globalThis.fetch): Promise<PostItem[]> => {
  const directus = createDirectusClient(fetch);

  const posts = await directus.request<Post[]>(
    readItems("posts", {
      filter: { status: { _eq: "published" }, slug: { _nnull: true } },
      fields: ["id", "slug", "published_at", "status", "seo"],
      sort: ["-published_at"],
    }),
  );

  return posts
    .filter((post): post is Post & { slug: string } => !!post.slug)
    .map((post) => ({
      id: post.id,
      slug: post.slug,
      published_at: post.published_at,
      date_updated: post.published_at || new Date().toISOString(),
      status: post.status,
      seo: mapSeo(post.seo),
    }));
};

export const getDefaultHomepageEntry = (): PageItem => {
  const now = new Date().toISOString();
  return {
    id: "homepage",
    permalink: "/",
    published_at: now,
    date_updated: now,
    status: "published",
    seo: { sitemap: { priority: "1.0", change_frequency: "daily" } },
  };
};
