import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	PageBuilderModelSchema,
	PostDetailSchema,
	PostSummarySchema,
	type PostSummary
} from '$lib/content/schema';
import type { ContentProvider, PostFilters } from '../provider';
import { buildFallbackSiteData, normalizePath } from './shared';

const WordPressEnvSchema = z.object({
	PUBLIC_WORDPRESS_URL: z.url()
});

const WordPressRenderedSchema = z.object({
	rendered: z.string()
});

const WordPressPageSchema = z.object({
	id: z.number(),
	slug: z.string(),
	title: WordPressRenderedSchema,
	content: WordPressRenderedSchema
});

const WordPressPostSchema = z.object({
	id: z.number(),
	slug: z.string(),
	title: WordPressRenderedSchema,
	excerpt: WordPressRenderedSchema.optional(),
	content: WordPressRenderedSchema.optional(),
	date: z.string().optional()
});

const toSlug = (path: string): string => {
	const normalized = normalizePath(path);
	return normalized === '/' ? 'home' : normalized.slice(1);
};

const resolveWordPressBaseUrl = (): string | null => {
	const parsed = WordPressEnvSchema.safeParse({
		PUBLIC_WORDPRESS_URL: publicEnv.PUBLIC_WORDPRESS_URL
	});
	if (parsed.success) return parsed.data.PUBLIC_WORDPRESS_URL;

	const fallback = privateEnv.WORDPRESS_URL;
	if (fallback) {
		const fallbackParsed = z.url().safeParse(fallback);
		if (fallbackParsed.success) return fallbackParsed.data;
	}

	return null;
};

const mapPostSummary = (post: z.infer<typeof WordPressPostSchema>): PostSummary =>
	PostSummarySchema.parse({
		id: String(post.id),
		slug: post.slug,
		title: post.title.rendered,
		description: post.excerpt?.rendered ?? '',
		published_at: post.date
	});

export const createWordPressContentProvider = (): ContentProvider => ({
	type: 'wordpress',
	getSiteData: async () => buildFallbackSiteData(),
	getPageByPath: async (path: string) => {
		const baseUrl = resolveWordPressBaseUrl();
		if (!baseUrl) return null;

		const endpoint = new URL('/wp-json/wp/v2/pages', baseUrl);
		endpoint.searchParams.set('slug', toSlug(path));
		endpoint.searchParams.set('per_page', '1');

		try {
			const response = await fetch(endpoint);
			if (!response.ok) return null;

			const parsed = z.array(WordPressPageSchema).safeParse(await response.json());
			if (!parsed.success || parsed.data.length === 0) return null;

			const page = parsed.data[0];
			return PageBuilderModelSchema.parse({
				path: normalizePath(path),
				title: page.title.rendered,
				blocks: [
					{
						id: `wp-page-${page.id}`,
						collection: 'block_richtext',
						item: {
							id: `wp-page-richtext-${page.id}`,
							content: page.content.rendered,
							alignment: 'left'
						}
					}
				]
			});
		} catch (err) {
			console.error('[wordpress] getPageByPath failed:', err);
			return null;
		}
	},
	getPostBySlug: async (slug: string) => {
		const baseUrl = resolveWordPressBaseUrl();
		if (!baseUrl) return null;

		const endpoint = new URL('/wp-json/wp/v2/posts', baseUrl);
		endpoint.searchParams.set('slug', slug);
		endpoint.searchParams.set('per_page', '1');

		try {
			const response = await fetch(endpoint);
			if (!response.ok) return null;

			const parsed = z.array(WordPressPostSchema).safeParse(await response.json());
			if (!parsed.success || parsed.data.length === 0) return null;

			const post = parsed.data[0];
			return PostDetailSchema.parse({
				...mapPostSummary(post),
				content: post.content?.rendered ?? ''
			});
		} catch (err) {
			console.error('[wordpress] getPostBySlug failed:', err);
			return null;
		}
	},
	getRelatedPosts: async () => [],
	getPaginatedPosts: async (page: number, limit: number, _filters?: PostFilters) => {
		const baseUrl = resolveWordPressBaseUrl();
		if (!baseUrl) return [];

		const endpoint = new URL('/wp-json/wp/v2/posts', baseUrl);
		endpoint.searchParams.set('page', String(Math.max(1, page)));
		endpoint.searchParams.set('per_page', String(Math.min(Math.max(1, limit), 100)));

		try {
			const response = await fetch(endpoint);
			if (!response.ok) return [];

			const parsed = z.array(WordPressPostSchema).safeParse(await response.json());
			return parsed.success ? parsed.data.map(mapPostSummary) : [];
		} catch (err) {
			console.error('[wordpress] getPaginatedPosts failed:', err);
			return [];
		}
	},
	getTotalPostCount: async (_filters?: PostFilters) => {
		const baseUrl = resolveWordPressBaseUrl();
		if (!baseUrl) return 0;

		const endpoint = new URL('/wp-json/wp/v2/posts', baseUrl);
		endpoint.searchParams.set('per_page', '1');

		try {
			const response = await fetch(endpoint);
			if (!response.ok) return 0;
			const total = Number(response.headers.get('X-WP-Total') ?? '0');
			return Number.isFinite(total) ? total : 0;
		} catch (err) {
			console.error('[wordpress] getTotalPostCount failed:', err);
			return 0;
		}
	},
	getAvailableCategories: async () => [],
	getAvailablePostTypes: async () => []
});
