/**
 * Module Plugin Template
 *
 * Copy this file to create new module plugins.
 * Replace MODULE_NAME with your module name.
 *
 * Pattern:
 *   1. Check if enabled via env flag
 *   2. Validate required config
 *   3. Build and return plugin (or null if disabled)
 */

import type { BetterAuthPlugin } from 'better-auth';
// import { moduleName } from 'better-auth/plugins';
import { logger } from '$lib/auth/shared/logger';

interface ModuleEnv {
	PUBLIC_MODULE_NAME_ENABLED?: boolean;
	// Add other required env vars
}

/**
 * Build MODULE_NAME plugin if enabled
 */
export function ModuleNamePlugin(env: ModuleEnv): BetterAuthPlugin | null {
	// 1. Check if enabled
	if (!env.PUBLIC_MODULE_NAME_ENABLED) {
		return null;
	}

	// 2. Validate config (optional)
	// if (!env.REQUIRED_VAR) {
	//   logger.warn('MODULE_NAME missing required config');
	//   return null;
	// }

	logger.debug('MODULE_NAME plugin enabled');

	// 3. Build and return plugin
	try {
		// return moduleName({
		//   // config options
		// });

		// Placeholder - replace with actual plugin
		return {
			id: 'module-name',
			init: async () => {
				logger.info('MODULE_NAME plugin initialized');
			}
		};
	} catch (error) {
		logger.error('Failed to  MODULE_NAME plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
