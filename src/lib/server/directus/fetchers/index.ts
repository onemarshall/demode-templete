/**
 * Directus Data Fetchers - Central Export Module
 *
 * This module serves as the central export point for all Directus data fetching
 * functionality. It provides a clean, organized API for accessing different types
 * of content from Directus CMS.
 *
 * Available Fetchers:
 *
 * Global Data:
 * - fetchSiteData: Fetches global site settings and configuration
 * - fetchDirectusGlobals: Fetches global content blocks and references
 *
 * Page Content:
 * - fetchPageData: Fetches complete page data with nested blocks
 * - fetchDirectusNavigationItems: Fetches navigation structure
 * - fetchDirectusNavigationTree: Fetches hierarchical navigation
 *
 * Blog/Posts:
 * - fetchPostBySlug: Fetches a single post by slug
 * - fetchRelatedPosts: Fetches related posts to a given post
 * - fetchAuthorById: Fetches author information by ID
 * - fetchPostsList: Fetches paginated list of posts
 * - fetchPostsCount: Gets total count of posts matching criteria
 * - fetchPaginatedPosts: Fetches posts with pagination metadata
 * - fetchTotalPostCount: Gets total post count for all posts
 *
 * Sitemap:
 * - fetchSitemapPages: Fetches pages for sitemap generation
 * - fetchSitemapPosts: Fetches posts for sitemap generation
 *
 * Client Management:
 * - createDirectusClient: Creates configured Directus client
 * - DirectusClient: TypeScript type for Directus client instances
 *
 * Usage Examples:
 * ```typescript
 * import { fetchPageData, fetchPostBySlug } from '$lib/services/directus/fetchers'
 *
 * // Fetch page with all blocks
 * const page = await fetchPageData('/about', postPages, fetch)
 *
 * // Fetch blog post
 * const post = await fetchPostBySlug('my-post-slug', fetch)
 * ```
 *
 * Architecture:
 * - Modular design with separate fetchers for different content types
 * - Consistent error handling and logging across all fetchers
 * - Type-safe interfaces using generated Directus schema
 * - Optimized queries with field selection and filtering
 */

export { fetchSiteData, fetchDirectusGlobals } from "./global-fetcher";
export { fetchPageData } from "./page-fetcher";
export {
  fetchPostBySlug,
  fetchRelatedPosts,
  fetchAuthorById,
  fetchPostsList,
  fetchPostsCount,
  fetchPaginatedPosts,
  fetchTotalPostCount,
} from "./post-fetcher";
export { fetchDirectusNavigationItems, fetchDirectusNavigationTree } from "./navigation-fetcher";
export { createDirectusClient, type DirectusClient } from "./shared";
