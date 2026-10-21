/**
 * Directus CMS Provider — Thin wrapper around better-auth-directus SDK
 * Implements the app's CMSProvider interface by delegating to the SDK
 */

import {
	createDirectusSync,
	type DirectusSyncClient,
	type DirectusSyncUser
} from 'better-auth-directus';
import type { CMSProvider, CMSUser, CMSFile, CMSConfig } from '#lib/auth/server/cms/types.js';
import { createProviderLogger } from '#lib/auth/shared/logger.js';

interface DirectusCMSConfig {
	defaultRoleId?: string;
	rateLimit?: {
		intervalCap: number;
		interval: number;
	};
	boundary?: {
		requestTimeoutMs?: number;
		openCircuitAfterFailures?: number;
		cooldownMsTransient?: number;
		cooldownMsAuth?: number;
		cooldownMsForbidden?: number;
		logIntervalMs?: number;
	};
}

export class DirectusCMSProvider implements CMSProvider {
	private sync: DirectusSyncClient;

	constructor(config: CMSConfig) {
		if (config.provider !== 'directus') {
			throw new Error('DirectusCMSProvider requires provider type "directus"');
		}

		const providerConfig = config.providerSpecificConfig as DirectusCMSConfig | undefined;
		const logger = createProviderLogger('CMS', 'directus');

		this.sync = createDirectusSync({
			directusUrl: config.url,
			directusToken: config.apiToken,
			defaultRoleId: providerConfig?.defaultRoleId,
			logger,
			boundary: providerConfig?.boundary,
			rateLimit: providerConfig?.rateLimit
		});

		logger.debug('Provider initialized via SDK');
	}

	/**
	 * Expose the SDK client for direct access (Better Auth plugin, advanced usage)
	 */
	get syncClient(): DirectusSyncClient {
		return this.sync;
	}

	/**
	 * Expose user sync operations for direct Directus user management
	 */
	get userSyncService() {
		return {
			syncUser: (user: { id: string; email: string; name?: string | null; image?: string | null }) =>
				this.sync.syncUser(user),
			findUser: (criteria: { email?: string; id?: string }) => this.sync.findUser(criteria),
			uploadAvatar: (userId: string, file: File) => this.sync.uploadAvatar(userId, file),
			removeAvatar: (userId: string) => this.sync.removeAvatar(userId),
			getDetailedUser: (userId: string) => this.sync.getUser(userId)
		};
	}

	/**
	 * Expose file operations for direct Directus file management
	 */
	get fileService() {
		return {
			uploadFile: (file: File, folder?: string) => this.sync.uploadFile(file, folder),
			deleteFile: (fileId: string) => this.sync.deleteFile(fileId),
			getFile: (fileId: string) => this.sync.getFile(fileId)
		};
	}

	/**
	 * Sync a Better Auth user to Directus (used by databaseHooks in hooks.ts)
	 */
	async syncUser(user: { id: string; email: string; name?: string | null; image?: string | null }): Promise<void> {
		await this.sync.syncUser(user);
	}

	/**
	 * Get asset URL for a Directus file
	 */
	getAssetUrl(assetId: string | { id: string }): string {
		return this.sync.getAssetUrl(assetId);
	}

	async getUser(userId: string): Promise<CMSUser | null> {
		const user = await this.sync.getUser(userId);
		if (!user) return null;
		return this.mapToCMSUser(user);
	}

	async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
		const response = await fetch(avatarUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch avatar (${response.status})`);
		}
		const blob = await response.blob();
		const file = new File([blob], 'avatar.jpg', { type: blob.type });
		await this.sync.uploadAvatar(userId, file);
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		await this.sync.removeAvatar(userId);
	}

	async uploadFile(file: File, folder?: string): Promise<CMSFile> {
		return this.sync.uploadFile(file, folder);
	}

	async deleteFile(fileId: string): Promise<void> {
		await this.sync.deleteFile(fileId);
	}

	async getFile(fileId: string): Promise<CMSFile | null> {
		return this.sync.getFile(fileId);
	}

	async healthCheck(): Promise<boolean> {
		return this.sync.healthCheck();
	}

	private mapToCMSUser(user: DirectusSyncUser): CMSUser {
		const name =
			[user.first_name, user.last_name].filter(Boolean).join(' ').trim() || undefined;

		return {
			id: user.id,
			email: user.email,
			name,
			avatar: user.avatar || undefined,
			avatarUrl: user.avatar ? this.sync.getAssetUrl(user.avatar) : undefined
		};
	}
}

// Re-export SDK types for convenience
export type { DirectusSyncClient, DirectusSyncUser, DirectusSyncFile } from 'better-auth-directus';
export { directusSyncPlugin } from 'better-auth-directus';

// Type alias for backwards compatibility
export type DirectusCMSProviderType = DirectusCMSProvider;
