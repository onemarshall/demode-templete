/**
 * Storage Provider Factory
 * Creates and manages storage provider instances
 */

import type { StorageProvider, StorageConfig, LocalStorageConfig } from './types';
import { LocalStorageProvider } from './providers/local';
import { MockStorageProvider } from './providers/mock';
import { createProviderLogger } from '../logger';

let storageInstance: StorageProvider | null = null;

/**
 * Create a storage provider instance based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
	const storageLogger = createProviderLogger('Storage', config.provider);
	storageLogger.start('Factory creation started');

	if (config.provider === 'local') {
		return new LocalStorageProvider(config as LocalStorageConfig);
	}

	if (config.provider === 'mock') {
		return new MockStorageProvider(config as StorageConfig & { provider: 'mock' });
	}

	if (config.provider === 's3') {
		throw new Error('S3 provider not yet implemented. Contributions welcome!');
	}

	if (config.provider === 'cloudinary') {
		throw new Error('Cloudinary provider not yet implemented. Contributions welcome!');
	}

	if (config.provider === 'gcs') {
		throw new Error('Google Cloud Storage provider not yet implemented. Contributions welcome!');
	}

	const _exhaustive: never = config.provider;
	storageLogger.error('Factory creation failed - unknown provider', { provider: _exhaustive });
	throw new Error(`Unknown storage provider: ${_exhaustive}`);
}

/**
 * Get or create the global storage provider instance
 */
export function getStorageProvider(config?: StorageConfig): StorageProvider {
	if (!storageInstance) {
		if (!config) {
			throw new Error(
				'Storage provider not initialized. Call getStorageProvider with config first.'
			);
		}
		storageInstance = createStorageProvider(config);
	}
	return storageInstance;
}

/**
 * Initialize the global storage provider
 */
export function initializeStorage(config: StorageConfig): StorageProvider {
	const storageLogger = createProviderLogger('Storage', config.provider);
	storageInstance = createStorageProvider(config);
	storageLogger.success('Initialization completed');
	return storageInstance;
}

/**
 * Reset the storage provider (useful for testing)
 */
export function resetStorage(): void {
	storageInstance = null;
	createProviderLogger('Storage').info('Provider reset');
}

export type {
	StorageProvider,
	StorageConfig,
	StorageFile,
	S3Config,
	CloudinaryConfig,
	LocalStorageConfig,
	GCSConfig
} from './types';
export { LocalStorageProvider } from './providers/local';
