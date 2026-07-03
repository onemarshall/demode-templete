/**
 * Redirect fetcher.
 *
 * Loads URL redirects from Directus (source → destination, 301/302).
 * Called from hooks.server.ts with a 5-minute TTL cache.
 * Skips fetch entirely in static CMS mode.
 */
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { readItems } from '@directus/sdk';
import { normalizePath } from '$lib/shared/utils/path';
import { createScopedLogger } from '$lib/shared/logger';
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
	const cmsProvider = privateEnv.CMS_PROVIDER ?? publicEnv.PUBLIC_CMS_PROVIDER ?? 'static';
	if (cmsProvider === 'static') {
		log.info('Static mode: skipping redirects fetch');
		return [];
	}

	try {
		const token = publicEnv.PUBLIC_DIRECTUS_TOKEN;
		const directus = createDirectusClient(fetchFn, token);

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
