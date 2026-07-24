/**
 * Shared fetcher utilities.
 *
 * Re-exports the Directus client and provides common constants
 * (published filter, post sort order) used across all fetchers.
 */
export { createDirectusClient, type DirectusClient } from '$lib/services/directus/client';

export const PUBLISHED_FILTER = { status: { _eq: 'published' } } as const;
export const POST_SORT = ['-published_at'] as '-published_at'[];
