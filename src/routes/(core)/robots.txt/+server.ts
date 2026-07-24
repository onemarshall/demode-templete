import { generateRobotsTxt } from '$lib/services/directus/fetchers/robots-fetcher';
import type { RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/env';

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		const robotsTxt = await generateRobotsTxt(fetch, !dev);
		return new Response(robotsTxt, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error generating robots.txt:', error);
		return new Response(
			`# Error generating robots.txt - access denied by default\nUser-agent: *\nDisallow: /`,
			{
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'no-cache'
				}
			}
		);
	}
};
