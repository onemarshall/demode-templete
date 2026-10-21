/**
 * Configuration Management Exports
 *
 * Centralized environment and configuration utilities.
 */

// Import schema first to ensure proper type initialization
import { publicEnvSchema } from './env-schema';

// Environment configuration - re-export specific items to avoid ambiguity
export {
	publicEnv,
	getPublicEnv,
	getServerEnv,
	getServerEnvSync,
	refreshPublicEnv,
	isDevelopment,
	isProduction,
	isStaging,
	isServer,
	isBrowser,
	isAuthDebugMode
} from './env';
export type { PublicEnv, ServerEnv, FullEnv } from './env';
export { getSafeEnvLog, isSecurityFeatureEnabled } from './env-schema';
export { clearEnvCache, reloadEnv, getDebugEnvInfo } from './env';

// Re-export schema for external usage (like vite config)
export { publicEnvSchema };
