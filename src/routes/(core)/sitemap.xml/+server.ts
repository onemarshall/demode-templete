import {
  fetchSitemapPages,
  fetchSitemapPosts,
  getDefaultHomepageEntry,
} from "$lib/features/directus/fetchers/sitemap-fetcher";
import type { RequestHandler } from "@sveltejs/kit";

const formatSitemapDate = (dateString?: string | null): string => {
  if (!dateString) return new Date().toISOString().split("T")[0];
  return new Date(dateString).toISOString().split("T")[0];
};

export const GET: RequestHandler = async ({ url, fetch }) => {
  try {
    const [pages, posts] = await Promise.all([fetchSitemapPages(fetch), fetchSitemapPosts(fetch)]);

    const allUrls = [
      ...pages,
      ...posts.map((post) => ({ ...post, permalink: `/news/${post.slug}` })),
    ];

    if (!allUrls.some((p) => p.permalink === "/")) {
      allUrls.unshift(getDefaultHomepageEntry());
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .filter((item) => item.permalink && !item.seo?.no_index)
  .map((item) => {
    const lastmod = formatSitemapDate(item.date_updated || item.published_at);
    const isHome = item.permalink === "/";
    const sitemapSettings = item.seo?.sitemap ?? {};

    let priority = "0.8";
    if (sitemapSettings.priority) priority = sitemapSettings.priority;
    else if (isHome) priority = "1.0";
    else if (item.permalink?.startsWith("/news/")) priority = "0.7";

    let changefreq = "weekly";
    if (sitemapSettings.change_frequency && sitemapSettings.change_frequency !== "never") {
      changefreq = sitemapSettings.change_frequency;
    } else if (isHome) changefreq = "daily";

    return `  <url>
    <loc>${new URL(item.permalink!, url.origin).href}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

    return new Response(sitemap, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};
