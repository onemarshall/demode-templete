/**
 * CMS Provider Interface
 * Defines the contract that all CMS providers must implement
 * This allows swapping between Directus, Strapi, Payload CMS, etc.
 */

export interface CMSUser {
	id: string;
	email: string;
	name?: string;
	avatar?: string;
	avatarUrl?: string;
}

export interface CMSFile {
	id: string;
	filename: string;
	url: string;
	size: number;
	type: string;
}

export interface CMSProvider {
	/**
	 * Get user by ID
	 */
	getUser(userId: string): Promise<CMSUser | null>;

	/**
	 * Update user avatar
	 */
	updateUserAvatar(userId: string, avatarUrl: string): Promise<void>;

	/**
	 * Delete user avatar
	 */
	deleteUserAvatar(userId: string): Promise<void>;

	/**
	 * Upload a file
	 */
	uploadFile(file: File, folder?: string): Promise<CMSFile>;

	/**
	 * Delete a file
	 */
	deleteFile(fileId: string): Promise<void>;

	/**
	 * Get file by ID
	 */
	getFile(fileId: string): Promise<CMSFile | null>;

	/**
	 * Check if provider is connected and healthy
	 */
	healthCheck(): Promise<boolean>;
}

export type CMSProviderType = 'directus' | 'strapi' | 'payload' | 'sanity' | 'temple';

export interface CMSConfig {
	provider: CMSProviderType;
	url: string;
	apiToken: string;
	providerSpecificConfig?: Record<string, unknown>;
}
