/**
 * Server-only Directus client.
 *
 * Wraps the base client from `client.ts` with the private DIRECTUS_TOKEN
 * from server environment variables, enabling access to draft/unpublished content.
 * Only importable from server-side code (.server.ts files, hooks, endpoints).
 */
import { env as privateEnv } from '$env/dynamic/private'
import {
	createBaseDirectusClient,
	type DirectusClient,
	withDirectusToken,
} from '$lib/features/directus/client'

type FetchFunction = Parameters<typeof createBaseDirectusClient>[0]

// Server-only version - can access private environment variables
export const createDirectusClientServer = (fetch: FetchFunction): DirectusClient => {
	const authToken = privateEnv.DIRECTUS_TOKEN

	return withDirectusToken(createBaseDirectusClient(fetch), authToken)
}

export type DirectusClientServer = DirectusClient
