// src/lib/auth/server/database/index.ts

// Database connection
export { getDB, getDBClient, withTransaction, closeDB } from './db';

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
} from './types';

export { AuthError } from './types';
