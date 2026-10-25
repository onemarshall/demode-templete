// src/lib/modules/auth/server/database/index.ts

// Database connection
export { getDB, getDBClient, withTransaction, closeDB } from '#lib/platform/database/db.js';

// Hooks
export { betterAuthDatabaseHooks, databaseHooks, manualHooks, avatarHooks } from './hooks';

// Integration helpers
export { userHooks, userAvatarHooks, batchOperations } from './integration';

// Types
export type {
	User,
	BetterAuthUser,
	AuthProvider,
	UserRole,
	UserStatus,
	SessionContext,
	AuthSuccessContext,
	EmailContext,
	AuthErrorCode
} from '../../shared/types/database.js';

export { AuthError } from '../../shared/types/database.js';
