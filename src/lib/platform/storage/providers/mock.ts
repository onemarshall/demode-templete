/**
 * Mock Storage Provider Implementation
 * For testing and development without storing real files
 */

import type { StorageProvider, StorageFile, StorageConfig } from '../types';
import { createProviderLogger } from '../../logger';
import type { ConsolaInstance } from 'consola';

export interface MockStorageFile extends StorageFile {
	content: Buffer;
}

export class MockStorageProvider implements StorageProvider {
	private config: StorageConfig;
	private files: Map<string, MockStorageFile> = new Map();
	private shouldFail = false;
	private readonly logger: ConsolaInstance;

	constructor(config: StorageConfig & { provider: 'mock' }) {
		this.config = config;
		this.logger = createProviderLogger('Storage', config.provider);
		this.logger.debug('Provider initialization started', { mode: 'testing' });
		this.logger.debug('Provider initialization completed');
	}

	async uploadFile(file: File, path: string): Promise<StorageFile> {
		if (this.shouldFail) {
			throw new Error('Mock storage provider configured to fail');
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		const mockFile: MockStorageFile = {
			path,
			url: `mock://storage/${path}`,
			size: buffer.length,
			type: file.type,
			uploadedAt: new Date(),
			content: buffer
		};

		this.files.set(path, mockFile);
		this.logger.info('File uploaded (mock)', { path, size: buffer.length });

		return {
			path: mockFile.path,
			url: mockFile.url,
			size: mockFile.size,
			type: mockFile.type,
			uploadedAt: mockFile.uploadedAt
		};
	}

	async deleteFile(path: string): Promise<void> {
		if (this.shouldFail) {
			throw new Error('Mock storage provider configured to fail');
		}

		if (!this.files.has(path)) {
			throw new Error(`File not found: ${path}`);
		}

		this.files.delete(path);
		this.logger.info('File deleted (mock)', { path });
	}

	async getFile(path: string): Promise<StorageFile | null> {
		const file = this.files.get(path);

		if (!file) {
			return null;
		}

		return {
			path: file.path,
			url: file.url,
			size: file.size,
			type: file.type,
			uploadedAt: file.uploadedAt
		};
	}

	async listFiles(directory: string): Promise<StorageFile[]> {
		const files: StorageFile[] = [];

		for (const [path, file] of this.files.entries()) {
			if (path.startsWith(directory)) {
				files.push({
					path: file.path,
					url: file.url,
					size: file.size,
					type: file.type,
					uploadedAt: file.uploadedAt
				});
			}
		}

		this.logger.info('Files listed (mock)', { directory, count: files.length });
		return files;
	}

	getFileUrl(path: string): string {
		return `mock://storage/${path}`;
	}

	async healthCheck(): Promise<boolean> {
		this.logger.info('Health check (mock, always healthy)');
		return true;
	}

	/**
	 * Testing utilities
	 */

	getFileCount(): number {
		return this.files.size;
	}

	getAllFiles(): Map<string, MockStorageFile> {
		return new Map(this.files);
	}

	getFileContent(path: string): Buffer | undefined {
		return this.files.get(path)?.content;
	}

	fileExists(path: string): boolean {
		return this.files.has(path);
	}

	clearAllFiles(): void {
		this.files.clear();
		this.logger.info('Storage cleared');
	}

	setFailureMode(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
		this.logger.info('Failure mode toggled', { shouldFail });
	}

	getFilesByType(type: string): StorageFile[] {
		const files: StorageFile[] = [];

		for (const file of this.files.values()) {
			if (file.type === type) {
				files.push({
					path: file.path,
					url: file.url,
					size: file.size,
					type: file.type,
					uploadedAt: file.uploadedAt
				});
			}
		}

		return files;
	}

	async getFilesByDirectory(directory: string): Promise<StorageFile[]> {
		return this.listFiles(directory);
	}
}
