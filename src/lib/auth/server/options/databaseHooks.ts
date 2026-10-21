import type { BetterAuthOptions } from 'better-auth';
import { betterAuthDatabaseHooks as databaseHooks } from '../database/hooks';

/**
 * Better Auth database hooks configuration.
 * Thin wrapper to keep config surface under /options while delegating implementation to /database/hooks.
 */
export function getDatabaseHooks(): BetterAuthOptions['databaseHooks'] {
	return databaseHooks;
}

export { databaseHooks };
