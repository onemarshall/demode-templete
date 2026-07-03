/**
 * Server-only Directus client.
 *
 * Wraps the base client from `client.ts` with the private DIRECTUS_TOKEN
 * from server environment variables, enabling access to draft/unpublished content.
 * Only importable from server-side code (.server.ts files, hooks, endpoints).
 */
import { DIRECTUS_TOKEN } from '$app/env/private'
import {
	createBaseDirectusClient,
	type DirectusClient,
	withDirectusToken,
} from '$lib/features/directus/client'

type FetchFunction = Parameters<typeof createBaseDirectusClient>[0]

// Server-only version - can access private environment variables
export const createDirectusClientServer = (fetch: FetchFunction): DirectusClient => {
	return withDirectusToken(createBaseDirectusClient(fetch), DIRECTUS_TOKEN)
}

export type DirectusClientServer = DirectusClient
