import { page } from '$app/state';

/**
 * Parse the current page URL to determine content type and slug
 */
export function parsePageInfo(): {
  contentType: 'page' | 'post' | 'unknown';
  slug: string;
  isDynamic: boolean;
} {
  const pathname = page.url.pathname;
  
  // Remove leading and trailing slashes
  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  
  // Check if it's a blog post (usually /posts/slug or /blog/slug)
  if (cleanPath.startsWith('posts/') || cleanPath.startsWith('blog/')) {
    const slug = cleanPath.replace(/^(posts|blog)\//, '');
    return {
      contentType: 'post',
      slug,
      isDynamic: true
    };
  }
  
  // Check if it's a dynamic page (has parameters)
  if (cleanPath.includes('[') || cleanPath.includes(':')) {
    return {
      contentType: 'page',
      slug: cleanPath,
      isDynamic: true
    };
  }
  
  // Static page - use the full path as slug
  if (cleanPath) {
    return {
      contentType: 'page',
      slug: cleanPath,
      isDynamic: false
    };
  }
  
  // Homepage
  return {
    contentType: 'page',
    slug: '',
    isDynamic: false
  };
}

/**
 * Get a human-readable title from a slug
 */
export function getTitleFromSlug(slug: string): string {
  if (!slug) return 'Home';
  
  // Replace dashes with spaces and capitalize each word
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Check if the current page should use CMS data
 */
export function shouldUseCmsData(): boolean {
  const { contentType, slug } = parsePageInfo();
  
  // Don't use CMS data for system pages
  const systemPages = ['api', 'admin', 'login', 'register', 'profile'];
  if (systemPages.some(sysPage => slug.startsWith(sysPage))) {
    return false;
  }
  
  // Use CMS data for pages and posts with slugs
  return contentType !== 'unknown' && slug.length > 0;
}
