/**
 * CMS Service Layer
 * Uses the new modular provider system to handle CMS operations
 * Supports: Directus, Strapi, Payload CMS, Sanity, Temple
 */

import { getCMSProvider } from './index';
import type { CMSUser, CMSFile } from './types';
import { logger, securityLogger } from '#lib/auth/shared/logger.js';

/**
 * Get user from CMS
 */
export async function getUser(userId: string): Promise<CMSUser | null> {
	try {
		let provider: ReturnType<typeof getCMSProvider> | null = null;
		try {
			provider = getCMSProvider();
		} catch {
			provider = null;
		}

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return null;
		}

		const user = await provider.getUser(userId);

		if (user) {
			logger.info('User retrieved from CMS', { userId });
		}

		return user;
	} catch (error) {
		securityLogger.error('Failed to get user from CMS', {
			error: error instanceof Error ? error.message : String(error),
			userId
		});
		return null;
	}
}

/**
 * Update user avatar in CMS
 */
export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
	try {
		let provider: ReturnType<typeof getCMSProvider> | null = null;
		try {
			provider = getCMSProvider();
		} catch {
			provider = null;
		}

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return;
		}

		await provider.updateUserAvatar(userId, avatarUrl);

		logger.success('User avatar updated in CMS', {
			userId,
			avatarUrl,
			provider: process.env.CMS_PROVIDER
		});
	} catch (error) {
		securityLogger.error('Failed to update user avatar in CMS', {
			error: error instanceof Error ? error.message : String(error),
			userId
		});
		return;
	}
}

/**
 * Delete user avatar from CMS
 */
export async function deleteUserAvatar(userId: string): Promise<void> {
	try {
		let provider: ReturnType<typeof getCMSProvider> | null = null;
		try {
			provider = getCMSProvider();
		} catch {
			provider = null;
		}

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return;
		}

		await provider.deleteUserAvatar(userId);

		logger.success('User avatar deleted from CMS', {
			userId,
			provider: process.env.CMS_PROVIDER
		});
	} catch (error) {
		securityLogger.error('Failed to delete user avatar from CMS', {
			error: error instanceof Error ? error.message : String(error),
			userId
		});
		return;
	}
}

/**
 * Upload file to CMS
 */
export async function uploadFile(file: File, path: string): Promise<CMSFile> {
	try {
		const provider = getCMSProvider();

		if (!provider) {
			throw new Error('CMS provider not initialized. Check your environment configuration.');
		}

		const uploaded = await provider.uploadFile(file, path);

		logger.success('File uploaded to CMS', {
			path,
			size: file.size,
			type: file.type,
			provider: process.env.CMS_PROVIDER
		});

		return uploaded;
	} catch (error) {
		securityLogger.error('Failed to upload file to CMS', {
			error: error instanceof Error ? error.message : String(error),
			path
		});
		throw error;
	}
}

/**
 * Delete file from CMS
 */
export async function deleteFile(fileId: string): Promise<void> {
	try {
		let provider: ReturnType<typeof getCMSProvider> | null = null;
		try {
			provider = getCMSProvider();
		} catch {
			provider = null;
		}

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return;
		}

		await provider.deleteFile(fileId);

		logger.success('File deleted from CMS', {
			fileId,
			provider: process.env.CMS_PROVIDER
		});
	} catch (error) {
		securityLogger.error('Failed to delete file from CMS', {
			error: error instanceof Error ? error.message : String(error),
			fileId
		});
		return;
	}
}

/**
 * Get file from CMS
 */
export async function getFile(fileId: string): Promise<CMSFile | null> {
	try {
		let provider: ReturnType<typeof getCMSProvider> | null = null;
		try {
			provider = getCMSProvider();
		} catch {
			provider = null;
		}

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return null;
		}

		const file = await provider.getFile(fileId);

		if (file) {
			logger.info('File retrieved from CMS', { fileId });
		}

		return file;
	} catch (error) {
		securityLogger.error('Failed to get file from CMS', {
			error: error instanceof Error ? error.message : String(error),
			fileId
		});
		return null;
	}
}

/**
 * Health check for CMS provider
 */
export async function healthCheck(): Promise<boolean> {
	try {
		const provider = getCMSProvider();

		if (!provider) {
			logger.warn('CMS provider not initialized');
			return false;
		}

		const isHealthy = await provider.healthCheck();

		if (isHealthy) {
			logger.info('CMS health check passed', { provider: process.env.CMS_PROVIDER });
		} else {
			logger.warn('CMS health check failed', { provider: process.env.CMS_PROVIDER });
		}

		return isHealthy;
	} catch (error) {
		securityLogger.error('CMS health check error', {
			error: error instanceof Error ? error.message : String(error)
		});
		return false;
	}
}
