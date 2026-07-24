/**
 * Redirect fetcher.
 *
 * Loads URL redirects from Directus (source → destination, 301/302).
 * Called from hooks.server.ts with a 5-minute TTL cache.
 * Skips fetch entirely in static CMS mode.
 */
import { CMS_PROVIDER, DIRECTUS_TOKEN } from '$app/env/private';
import { PUBLIC_CMS_PROVIDER } from '$app/env/public';
import { readItems } from '@directus/sdk';
import { normalizePath } from '$lib/utils/path';
import { createScopedLogger } from '$lib/utils/logger';
import { createDirectusClient } from './shared';

const log = createScopedLogger(['Directus', 'Redirects']);

export interface SvelteRedirect {
	source: string;
	destination: string;
	permanent: boolean;
}

const toResponseCode = (raw: string | null | undefined): 301 | 302 => {
	const code = raw ? parseInt(raw, 10) : 301;
	return code === 302 ? 302 : 301;
};

export const fetchRedirects = async (
	fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<SvelteRedirect[]> => {
	// Check if we're in static mode
	const cmsProvider = CMS_PROVIDER ?? PUBLIC_CMS_PROVIDER ?? 'static';
	if (cmsProvider === 'static') {
		log.info('Static mode: skipping redirects fetch');
		return [];
	}

	try {
		const directus = createDirectusClient(fetchFn, DIRECTUS_TOKEN);

		const redirects = await directus.request(
			readItems('redirects', {
				filter: { url_from: { _nnull: true }, url_to: { _nnull: true } },
				limit: -1,
			}),
		);

		const processed: SvelteRedirect[] = redirects
			.filter((r) => r.url_from && r.url_to)
			.map((r) => ({
				source: normalizePath(r.url_from as string),
				destination: r.url_to as string,
				permanent: toResponseCode(r.response_code) === 301,
			}));

		log.info(`${processed.length} redirects loaded`);

		return processed;
	} catch (error) {
		log.error('Error loading redirects', error);
		return [];
	}
};
