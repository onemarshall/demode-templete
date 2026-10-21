/**
 * Better Auth Directus Sync SDK
 * Bidirectional user sync between Better Auth and Directus CMS
 */

// Client
export { DirectusSyncClient, createDirectusSync } from './client';

// Plugin
export { directusSyncPlugin } from './plugin';
export type { DirectusSyncPluginOptions } from './plugin';

// Services (for advanced usage)
export { DirectusUserService } from './user-sync';
export { DirectusFileManager } from './file-manager';
export { DirectusBoundary, fetchWithTimeout } from './boundary';

// Types
export type {
	DirectusSyncConfig,
	SyncLogger,
	BetterAuthUserInput,
	DirectusSyncUser,
	DirectusSyncFile,
	BoundaryConfig,
	RateLimitConfig,
	DirectusWebhookPayload,
	DirectusFailureKind,
	DirectusRunOptions
} from './types';

// Schema
export type { DirectusSyncSchema, DirectusSyncSchemaUser, DirectusSyncSchemaFile } from './schema';
