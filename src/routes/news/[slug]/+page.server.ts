import { fetchAuthorById, fetchPostBySlug, fetchRelatedPosts } from '$lib/features/directus/fetchers'
import { env as privateEnv } from '$env/dynamic/private'
import { getDirectusAssetURL } from '$lib/features/directus/asset-utils'
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async (event: Parameters<PageServerLoad>[0]) => {
	const draft =
		event.url.searchParams.get('draft') === 'true' &&
		event.url.searchParams.get('token') === privateEnv.DRAFT_MODE_SECRET
	const slug = event.params.slug
	const post = await fetchPostBySlug(slug, { draft }, event.fetch)

	if (!post) {
		throw error(404, {
			message: 'Post Not found',
		})
	}

	// Extract tag IDs and category ID for related post matching
	const extractId = (ref: unknown): string | null => {
		if (typeof ref === 'string') return ref
		if (ref && typeof ref === 'object' && 'id' in ref) return (ref as { id: string }).id
		return null
	}

	const tagIds = Array.isArray(post.tags)
		? post.tags
				.map((t) => {
					const tagRef = t && typeof t === 'object' && 'tag_id' in t ? t.tag_id : null
					return extractId(tagRef)
				})
				.filter((id): id is string => Boolean(id))
		: []
	const categoryId = extractId(post.category) ?? undefined

	const [relatedPosts, author] = await Promise.all([
		fetchRelatedPosts(post.id, event.fetch, undefined, { tagIds, categoryId }),
		post.author ? fetchAuthorById(post.author as string, event.fetch) : Promise.resolve(null),
	])

	return {
		post,
		author,
		relatedPosts,
		seo: {
			title: post?.seo?.title ?? post.title ?? '',
			description: post?.seo?.meta_description ?? '',
			ogImage: post?.seo?.og_image
				? getDirectusAssetURL(post.seo.og_image)
				: undefined,
			ogTemplateImage: post.image
				? getDirectusAssetURL(post.image, { width: 800, format: 'jpg', quality: 80 })
				: undefined,
			noIndex: post?.seo?.no_index ?? false,
			noFollow: post?.seo?.no_follow ?? false,
		},
	}
}
