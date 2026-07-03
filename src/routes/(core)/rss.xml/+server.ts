import { fetchRSSFeedData } from '$lib/features/directus/fetchers/rss-fetcher';
import type { RequestHandler } from '@sveltejs/kit';

const escapeXml = (str: string): string =>
	str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const GET: RequestHandler = async ({ fetch, url }) => {
	try {
		const feedData = await fetchRSSFeedData(fetch, 20);

		const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(feedData.title)}</title>
    <description>${escapeXml(feedData.description)}</description>
    <link>${feedData.link}</link>
    <atom:link href="${url.origin}${url.pathname}" rel="self" type="application/rss+xml" />
    <language>en-gb</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${feedData.items
			.map(
				(item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <pubDate>${item.pubDate}</pubDate>
      ${item.author ? `<author>${escapeXml(item.author)}</author>` : ''}
      ${item.description ? `<description>${escapeXml(item.description)}</description>` : ''}
      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg" />` : ''}
      ${item.content ? `<content:encoded><![CDATA[${item.content}]]></content:encoded>` : ''}
    </item>`
			)
			.join('')}
  </channel>
</rss>`;

		return new Response(feed.trim(), {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error generating RSS feed:', error);
		return new Response('Error generating RSS feed', {
			status: 500,
			headers: { 'Content-Type': 'text/plain' }
		});
	}
};
