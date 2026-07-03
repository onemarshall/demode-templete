/**
 * Global site data fetcher.
 *
 * Fetches site-wide settings (globals singleton) and navigation structures
 * (header + footer) in a single parallel request via `fetchSiteData()`.
 * Called once per page load in the root layout.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { readItem, readSingleton } from '@directus/sdk';
import type { NavigationType, GlobalsType } from '$lib/types/navigation';
import { createDirectusClient, type DirectusClient } from './shared';
import { createScopedLogger } from '$lib/shared/logger';

const log = createScopedLogger(['Directus', 'Globals']);

interface SiteData {
	globals: GlobalsType | null;
	headerNavigation: NavigationType | null;
	footerNavigation: NavigationType | null;
}

/* -------------------------------------------------------------------------- */
/* Re-usable query definitions                                               */
/* -------------------------------------------------------------------------- */

const GLOBAL_FIELDS = [
	'id',
	'title',
	'description',
	'tagline',
	'url',
	'accent_color',
	'favicon',
	'logo',
	'logo_mobile',
	'logo_dark_mode',
	'social_links',
	'analytics_id',
	'google_search_console',
	'company',
	'address',
	'domain',
	'business_type',
	'vat_number',
	'cdn_url',
	'footer_design_by_name',
	'footer_design_by_content',
	'directus_url'
] as const;

const NAV_RELATION_FIELDS = ['id', 'title', 'permalink', 'status'] as const;

const NAV_ITEM_FIELDS = [
	'id',
	'title',
	'type',
	'url',
	'sort',
	'is_visible',
	'show_in_navbar',
	'show_in_morph',
	'show_in_sitemap',
	'morph',
	'show_children',
	'hide_dropdown',
	'icon',
	'label',
	'show_label'
] as const;

const createNavigationItemFields = (depth: number): readonly unknown[] => [
	...NAV_ITEM_FIELDS,
	{ page: NAV_RELATION_FIELDS },
	{ post: NAV_RELATION_FIELDS },
	{ children: depth > 1 ? createNavigationItemFields(depth - 1) : [] }
];

/**
 * One immutable description of the navigation shape.
 * Edit here → affects both "main" and "footer" queries.
 */
const NAV_FIELDS = [
	'id',
	'title',
	'is_active',
	{
		items: createNavigationItemFields(3)
	}
] as const;

const NAV_DEEP = {
	items: { children: { children: { children: {} } } }
} as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type NavSlug = 'main' | 'footer';

const fetchGlobals = (directus: DirectusClient) =>
	directus.request<GlobalsType>(readSingleton('globals', { fields: GLOBAL_FIELDS as never }));

const fetchNavigation = (directus: DirectusClient, slug: NavSlug) =>
	directus.request<NavigationType>(
		readItem('navigation', slug, { fields: NAV_FIELDS as never, deep: NAV_DEEP })
	);

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const fetchSiteData = async (fetch: RequestEvent['fetch']): Promise<SiteData> => {
	const directus = createDirectusClient(fetch);

	try {
		const [globals, headerNavigation, footerNavigation] = await Promise.all([
			fetchGlobals(directus),
			fetchNavigation(directus, 'main'),
			fetchNavigation(directus, 'footer')
		]);

		return { globals, headerNavigation, footerNavigation };
	} catch (err) {
		log.error('Error fetching site data:', err);
		throw new Error('Failed to fetch site data', { cause: err });
	}
};

export const fetchDirectusGlobals = async (
	fetch: RequestEvent['fetch'],
	token?: string
): Promise<GlobalsType | null> => {
	const directus = createDirectusClient(fetch, token);
	try {
		return await fetchGlobals(directus);
	} catch (err) {
		log.warn('Failed to fetch globals:', err);
		return null;
	}
};
