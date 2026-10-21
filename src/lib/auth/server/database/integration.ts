// src/lib/auth/server/database/integration.ts
import { manualHooks, avatarHooks } from './hooks';
import { logger } from '#lib/auth/shared/logger.js';
import type { User } from './types';

/**
 * User lifecycle hooks for manual triggering.
 * Use when Better Auth automatic hooks do not cover your use case.
 */
export const userHooks = {
	/**
	 * Trigger after creating a user outside Better Auth flow.
	 */
	async created(user: User): Promise<void> {
		logger.debug('[Integration] User created hook triggered', { userId: user.id });
		await manualHooks.user.afterCreate(user);
	},

	/**
	 * Trigger after updating a user outside Better Auth flow.
	 */
	async updated(user: User): Promise<void> {
		logger.debug('[Integration] User updated hook triggered', { userId: user.id });
		await manualHooks.user.afterUpdate(user);
	},

	/**
	 * Trigger after deleting a user outside Better Auth flow.
	 */
	async deleted(userId: string): Promise<void> {
		logger.debug('[Integration] User deleted hook triggered', { userId });
		await manualHooks.user.afterDelete(userId);
	}
};

/**
 * Avatar hooks for manual triggering.
 */
export const userAvatarHooks = {
	/**
	 * Trigger after updating a user's avatar.
	 */
	async updated(userId: string, avatarUrl: string): Promise<void> {
		logger.debug('[Integration] Avatar updated hook triggered', { userId });
		await avatarHooks.update(userId, avatarUrl);
	},

	/**
	 * Trigger after deleting a user's avatar.
	 */
	async deleted(userId: string): Promise<void> {
		logger.debug('[Integration] Avatar deleted hook triggered', { userId });
		await avatarHooks.delete(userId);
	}
};

/**
 * Batch operations with hook support.
 */
export const batchOperations = {
	/**
	 * Sync multiple users to CMS with error handling.
	 * Returns count of successful and failed syncs.
	 */
	async syncUsers(users: User[]): Promise<{ successful: number; failed: number }> {
		const results = await Promise.allSettled(
			users.map((user) => manualHooks.user.afterCreate(user))
		);

		const successful = results.filter((r) => r.status === 'fulfilled').length;
		const failed = results.filter((r) => r.status === 'rejected').length;

		logger.info('[Integration] Batch sync completed', { successful, failed, total: users.length });

		return { successful, failed };
	}
};
