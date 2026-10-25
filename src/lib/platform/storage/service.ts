/**
 * Storage Service Layer
 * Uses the new modular provider system to handle file storage
 * Supports: Local, S3, Cloudinary, Mock
 */

import { getStorageProvider } from './server.server';
import { logger, securityLogger } from '../logger';

export interface UploadOptions {
	file: File;
	path: string;
	metadata?: Record<string, unknown>;
}

export interface StorageFile {
	path: string;
	url: string;
	size: number;
	type: string;
	uploadedAt: Date;
}

/**
 * Upload a file using the configured storage provider
 */
export async function uploadFile(options: UploadOptions): Promise<StorageFile> {
	try {
		const provider = getStorageProvider();

		if (!provider) {
			throw new Error('Storage provider not initialized. Check your environment configuration.');
		}

		const uploaded = await provider.uploadFile(options.file, options.path);

		logger.success('File uploaded successfully', {
			path: options.path,
			size: options.file.size,
			type: options.file.type,
			provider: process.env.STORAGE_PROVIDER
		});

		return uploaded;
	} catch (error) {
		securityLogger.error('Failed to upload file', {
			error: error instanceof Error ? error.message : String(error),
			path: options.path,
			size: options.file.size
		});
		throw error;
	}
}

/**
 * Delete a file using the configured storage provider
 */
export async function deleteFile(path: string): Promise<void> {
	try {
		const provider = getStorageProvider();

		if (!provider) {
			throw new Error('Storage provider not initialized. Check your environment configuration.');
		}

		await provider.deleteFile(path);

		logger.success('File deleted successfully', {
			path,
			provider: process.env.STORAGE_PROVIDER
		});
	} catch (error) {
		securityLogger.error('Failed to delete file', {
			error: error instanceof Error ? error.message : String(error),
			path
		});
		throw error;
	}
}

/**
 * Get file information using the configured storage provider
 */
export async function getFile(path: string): Promise<StorageFile | null> {
	try {
		const provider = getStorageProvider();

		if (!provider) {
			throw new Error('Storage provider not initialized. Check your environment configuration.');
		}

		const file = await provider.getFile(path);

		if (file) {
			logger.info('File retrieved', { path });
		}

		return file;
	} catch (error) {
		securityLogger.error('Failed to get file', {
			error: error instanceof Error ? error.message : String(error),
			path
		});
		throw error;
	}
}

/**
 * List files in a directory using the configured storage provider
 */
export async function listFiles(directory: string): Promise<StorageFile[]> {
	try {
		const provider = getStorageProvider();

		if (!provider) {
			throw new Error('Storage provider not initialized. Check your environment configuration.');
		}

		const files = await provider.listFiles(directory);

		logger.info('Files listed', {
			directory,
			count: files.length,
			provider: process.env.STORAGE_PROVIDER
		});

		return files;
	} catch (error) {
		securityLogger.error('Failed to list files', {
			error: error instanceof Error ? error.message : String(error),
			directory
		});
		throw error;
	}
}

/**
 * Get the URL for a file using the configured storage provider
 */
export function getFileUrl(path: string): string {
	try {
		const provider = getStorageProvider();

		if (!provider) {
			throw new Error('Storage provider not initialized. Check your environment configuration.');
		}

		return provider.getFileUrl(path);
	} catch (error) {
		securityLogger.error('Failed to get file URL', {
			error: error instanceof Error ? error.message : String(error),
			path
		});
		throw error;
	}
}

/**
 * Upload user avatar
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
	const path = `avatars/${userId}/${Date.now()}-${file.name}`;
	const uploaded = await uploadFile({ file, path });
	return uploaded.url;
}

/**
 * Delete user avatar
 */
export async function deleteUserAvatar(userId: string, fileName: string): Promise<void> {
	const path = `avatars/${userId}/${fileName}`;
	await deleteFile(path);
}

/**
 * List user avatars
 */
export async function listUserAvatars(userId: string): Promise<StorageFile[]> {
	return listFiles(`avatars/${userId}`);
}

/**
 * Upload document
 */
export async function uploadDocument(userId: string, file: File): Promise<string> {
	const path = `documents/${userId}/${Date.now()}-${file.name}`;
	const uploaded = await uploadFile({ file, path });
	return uploaded.url;
}

/**
 * Delete document
 */
export async function deleteDocument(userId: string, fileName: string): Promise<void> {
	const path = `documents/${userId}/${fileName}`;
	await deleteFile(path);
}

/**
 * List user documents
 */
export async function listUserDocuments(userId: string): Promise<StorageFile[]> {
	return listFiles(`documents/${userId}`);
}
