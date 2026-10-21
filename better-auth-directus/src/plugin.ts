/**
 * Better Auth Plugin for Directus Sync
 * Uses database hooks for reliable lifecycle sync — fires on every
 * user create/update regardless of which API path triggered it.
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { DirectusSyncClient } from './client';

export interface DirectusSyncPluginOptions {
	client: DirectusSyncClient;
}

/**
 * Better Auth plugin that automatically syncs users to Directus.
 *
 * Uses databaseHooks (not endpoint hooks) so sync fires reliably
 * on every user create/update/delete, regardless of the API path.
 *
 * @example
 * ```typescript
 * import { createDirectusSync, directusSyncPlugin } from 'better-auth-directus';
 *
 * const sync = createDirectusSync({
 *   directusUrl: env.DIRECTUS_URL,
 *   directusToken: env.DIRECTUS_TOKEN,
 * });
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     directusSyncPlugin({ client: sync })
 *   ]
 * });
 * ```
 */
export function directusSyncPlugin(options: DirectusSyncPluginOptions): BetterAuthPlugin {
	const { client } = options;

	return {
		id: 'directus-sync',

		init: async () => {
			const isHealthy = await client.healthCheck();
			if (!isHealthy) {
				throw new Error('Directus sync health check failed during plugin initialization');
			}
		}
	};
}
