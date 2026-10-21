/**
 * Cloudinary Storage Provider Implementation
 * Handles file storage via Cloudinary
 */

import type { StorageProvider, StorageFile, CloudinaryConfig } from '../types';
import { createProviderLogger } from '../../../shared/logger';
import type { ConsolaInstance } from 'consola';

export class CloudinaryStorageProvider implements StorageProvider {
	private config: CloudinaryConfig;
	private readonly logger: ConsolaInstance;

	constructor(config: CloudinaryConfig) {
		if (config.provider !== 'cloudinary') {
			throw new Error('CloudinaryStorageProvider requires provider type "cloudinary"');
		}

		this.config = config;
		this.logger = createProviderLogger('Storage', config.provider);
		this.logger.start('Provider initialization started', { cloudName: config.cloudName });
		this.logger.success('Provider initialization completed');
	}

	private getUploadUrl(): string {
		return `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`;
	}

	async uploadFile(file: File, path: string): Promise<StorageFile> {
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('api_key', this.config.apiKey);
			formData.append('public_id', path);

			if (this.config.folder) {
				formData.append('folder', this.config.folder);
			}

			const response = await fetch(this.getUploadUrl(), {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(`Cloudinary API error: ${error.error?.message || response.statusText}`);
			}

			const data = await response.json();

			this.logger.info('File uploaded', { path, size: file.size });

			return {
				path,
				url: data.secure_url,
				size: data.bytes,
				type: file.type,
				uploadedAt: new Date(data.created_at)
			};
		} catch (error) {
			this.logger.error('Failed to upload file', { path, error });
			throw error;
		}
	}

	async deleteFile(path: string): Promise<void> {
		try {
			const formData = new FormData();
			formData.append('api_key', this.config.apiKey);
			formData.append('public_id', path);

			const response = await fetch(
				`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/destroy`,
				{
					method: 'POST',
					body: formData
				}
			);

			if (!response.ok) {
				throw new Error(`Cloudinary delete failed: ${response.statusText}`);
			}

			this.logger.info('File deleted', { path });
		} catch (error) {
			this.logger.error('Failed to delete file', { path, error });
			throw error;
		}
	}

	async getFile(path: string): Promise<StorageFile | null> {
		try {
			const response = await fetch(
				`https://res.cloudinary.com/${this.config.cloudName}/image/upload/${path}`,
				{
					method: 'HEAD'
				}
			);

			if (!response.ok) {
				return null;
			}

			return {
				path,
				url: `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${path}`,
				size: parseInt(response.headers.get('content-length') || '0'),
				type: response.headers.get('content-type') || 'application/octet-stream',
				uploadedAt: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to get file', { path, error });
			return null;
		}
	}

	async listFiles(directory: string): Promise<StorageFile[]> {
		try {
			// Cloudinary doesn't provide a direct list API
			// This would require using the Admin API with authentication
			this.logger.warn('List files not implemented', { directory });
			return [];
		} catch (error) {
			this.logger.error('Failed to list files', { directory, error });
			return [];
		}
	}

	getFileUrl(path: string): string {
		return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${path}`;
	}

	async healthCheck(): Promise<boolean> {
		try {
			const response = await fetch(
				`https://res.cloudinary.com/${this.config.cloudName}/image/upload/w_1,h_1/sample.jpg`,
				{
					method: 'HEAD'
				}
			);

			const isHealthy = response.ok || response.status === 404;
			if (isHealthy) {
				this.logger.info('Health check passed');
			} else {
				this.logger.warn('Health check failed', { status: response.status });
			}
			return isHealthy;
		} catch (error) {
			this.logger.error('Health check error', { error });
			return false;
		}
	}
}
