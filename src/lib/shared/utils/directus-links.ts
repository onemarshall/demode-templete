export type DirectusLinkType = 'page' | 'post' | 'url' | 'submit' | null | undefined

export interface DirectusPageLink {
	permalink?: string | null
}

export interface DirectusPostLink {
	slug?: string | null
}

export interface DirectusLinkValue {
	type?: DirectusLinkType
	url?: string | null
	page?: DirectusPageLink | null
	post?: DirectusPostLink | null
}

export interface ResolvedDirectusLink {
	href: string | null
	isExternal: boolean
	kind: Exclude<DirectusLinkType, null | undefined> | 'string' | 'unknown'
}

export function resolveDirectusLink(link: string | DirectusLinkValue | null | undefined): ResolvedDirectusLink {
	if (!link) {
		return {
			href: null,
			isExternal: false,
			kind: 'unknown',
		}
	}

	if (typeof link === 'string') {
		return {
			href: link,
			isExternal: !link.startsWith('/'),
			kind: 'string',
		}
	}

	if (link.type === 'page' && link.page?.permalink) {
		return {
			href: link.page.permalink,
			isExternal: false,
			kind: 'page',
		}
	}

	if (link.type === 'post' && link.post?.slug) {
		return {
			href: `/blog/${link.post.slug}`,
			isExternal: false,
			kind: 'post',
		}
	}

	if (link.type === 'url' && link.url) {
		return {
			href: link.url,
			isExternal: !link.url.startsWith('/'),
			kind: 'url',
		}
	}

	if (link.type === 'submit') {
		return {
			href: null,
			isExternal: false,
			kind: 'submit',
		}
	}

	if (link.url) {
		return {
			href: link.url,
			isExternal: !link.url.startsWith('/'),
			kind: 'url',
		}
	}

	return {
		href: null,
		isExternal: false,
		kind: 'unknown',
	}
}
