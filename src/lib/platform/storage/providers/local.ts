/**
 * Local Storage Provider Implementation
 * Stores files on the local filesystem
 */

import { mkdir, writeFile, readFile, unlink, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import type { StorageProvider, StorageFile, LocalStorageConfig } from '../types';
import { createProviderLogger } from '../../logger';
import type { ConsolaInstance } from 'consola';

export class LocalStorageProvider implements StorageProvider {
	private config: LocalStorageConfig;
	private readonly logger: ConsolaInstance;

	constructor(config: LocalStorageConfig) {
		if (config.provider !== 'local') {
			throw new Error('LocalStorageProvider requires provider type "local"');
		}

		this.config = config;
		this.logger = createProviderLogger('Storage', config.provider);
		this.logger.start('Provider initialization started', { uploadDir: config.uploadDir });
		this.logger.success('Provider initialization completed');
	}

	async uploadFile(file: File, path: string): Promise<StorageFile> {
		try {
			const fullPath = join(this.config.uploadDir, path);
			const directory = dirname(fullPath);

			// Create directory if it doesn't exist
			await mkdir(directory, { recursive: true });

			// Write file
			const buffer = await file.arrayBuffer();
			await writeFile(fullPath, Buffer.from(buffer));

			const fileStats = await stat(fullPath);

			this.logger.info('File uploaded', { path, size: fileStats.size });

			return {
				path,
				url: `${this.config.baseUrl}/${path}`,
				size: fileStats.size,
				type: file.type,
				uploadedAt: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to upload file', { path, error });
			throw error;
		}
	}

	async deleteFile(path: string): Promise<void> {
		try {
			const fullPath = join(this.config.uploadDir, path);
			await unlink(fullPath);

			this.logger.info('File deleted', { path });
		} catch (error) {
			this.logger.error('Failed to delete file', { path, error });
			throw error;
		}
	}

	async getFile(path: string): Promise<StorageFile | null> {
		try {
			const fullPath = join(this.config.uploadDir, path);
			const fileStats = await stat(fullPath);

			if (!fileStats.isFile()) {
				return null;
			}

			return {
				path,
				url: `${this.config.baseUrl}/${path}`,
				size: fileStats.size,
				type: 'application/octet-stream',
				uploadedAt: fileStats.mtime
			};
		} catch (error) {
			this.logger.error('Failed to get file', { path, error });
			return null;
		}
	}

	async listFiles(directory: string): Promise<StorageFile[]> {
		try {
			const fullPath = join(this.config.uploadDir, directory);
			const files = await readdir(fullPath, { withFileTypes: true });

			const storageFiles: StorageFile[] = [];

			for (const file of files) {
				if (file.isFile()) {
					const filePath = join(directory, file.name);
					const fullFilePath = join(fullPath, file.name);
					const fileStats = await stat(fullFilePath);

					storageFiles.push({
						path: filePath,
						url: `${this.config.baseUrl}/${filePath}`,
						size: fileStats.size,
						type: 'application/octet-stream',
						uploadedAt: fileStats.mtime
					});
				}
			}

			this.logger.info('Files listed', { directory, count: storageFiles.length });

			return storageFiles;
		} catch (error) {
			this.logger.error('Failed to list files', { directory, error });
			return [];
		}
	}

	getFileUrl(path: string): string {
		return `${this.config.baseUrl}/${path}`;
	}

	async healthCheck(): Promise<boolean> {
		try {
			// Try to create a test directory
			const testDir = join(this.config.uploadDir, '.health-check');
			await mkdir(testDir, { recursive: true });

			// Try to write a test file
			const testFile = join(testDir, 'test.txt');
			await writeFile(testFile, 'health check');

			// Try to read it back
			const content = await readFile(testFile, 'utf-8');

			// Clean up
			await unlink(testFile);

			const isHealthy = content === 'health check';
			if (isHealthy) {
				this.logger.info('Health check passed');
			} else {
				this.logger.warn('Health check failed');
			}
			return isHealthy;
		} catch (error) {
			this.logger.error('Health check error', { error });
			return false;
		}
	}
}
