/**
 * Robots.txt generator.
 *
 * Fetches the site URL from globals and generates a robots.txt
 * with sitemap reference and default crawl rules.
 */
import { fetchSiteData } from './global-fetcher';
import { createScopedLogger } from '$lib/shared/logger';

const log = createScopedLogger(['Directus', 'Robots']);

interface Globals {
	url?: string;
}

interface SiteData {
	globals: Globals;
}

export const fetchSiteUrl = async (fetch: typeof globalThis.fetch): Promise<string> => {
	try {
		const siteData = (await fetchSiteData(fetch)) as SiteData;
		if (!siteData?.globals?.url) {
			log.warn('No site URL found in globals, using empty string');
			return '';
		}
		return siteData.globals.url;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		log.error('Error fetching site URL for robots.txt:', message);
		return '';
	}
};

export const generateRobotsTxt = async (
	fetch: typeof globalThis.fetch,
	allow = true
): Promise<string> => {
	try {
		const siteUrl = await fetchSiteUrl(fetch);
		const sitemapUrl = siteUrl ? new URL('/sitemap.xml', siteUrl).toString() : '';

		if (!allow) {
			return `# Disallow all search engines (development mode)\nUser-agent: *\nDisallow: /`;
		}

		let content = `# Allow all search engines\nUser-agent: *\nAllow: /`;
		if (sitemapUrl) {
			content += `\n\n# Sitemap\nSitemap: ${sitemapUrl}`;
		}
		return content;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		log.error('Error generating robots.txt content:', message);
		return `# Error generating robots.txt - access denied by default\n# ${message}\nUser-agent: *\nDisallow: /`;
	}
};
