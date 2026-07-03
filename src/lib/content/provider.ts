import type { PageModel, PostDetail, PostSummary, SiteData } from "./schema";

export type ContentProviderType = "static" | "directus" | "wordpress";

export interface PageLoadOptions {
  postPages?: Record<string, number>;
}

export interface PostFilters {
  categorySlug?: string;
  featuredOnly?: boolean;
  postType?: string;
  tagSlugs?: string[];
}

export interface ContentProvider {
  type: ContentProviderType;
  getSiteData(): Promise<SiteData>;
  getPageByPath(path: string, options?: PageLoadOptions): Promise<PageModel | null>;
  getPostBySlug(slug: string, options?: { draft?: boolean }): Promise<PostDetail | null>;
  getRelatedPosts(postId: string): Promise<PostSummary[]>;
  getPaginatedPosts(page: number, limit: number, filters?: PostFilters): Promise<PostSummary[]>;
  getTotalPostCount(filters?: PostFilters): Promise<number>;
  getAvailableCategories(): Promise<{ id: string; title: string; slug: string }[]>;
  getAvailablePostTypes(): Promise<string[]>;
}
