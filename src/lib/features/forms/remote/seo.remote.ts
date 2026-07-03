import * as z from 'zod'
import { query } from '$app/server'
import { getSeoData } from '$lib/features/directus/fetchers/seo-fetcher'
import { getRequestEvent } from '$app/server'

const seoQuerySchema = z.object({
	type: z.enum(['page', 'post']),
	slug: z.string(),
	fallbackTitle: z.string().optional(),
	fallbackDescription: z.string().optional(),
})

export const fetchSeoData = query(
	seoQuerySchema,
	async ({ type, slug, fallbackTitle, fallbackDescription }) => {
		const { fetch } = getRequestEvent()
		const seoData = await getSeoData(fetch, type, slug)
		
		return {
			title: seoData.title || fallbackTitle,
			description: seoData.description || fallbackDescription,
			ogImage: seoData.ogImage,
			noIndex: seoData.noIndex,
			noFollow: seoData.noFollow,
		}
	}
)
