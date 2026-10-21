/**
 * Storage Provider Interface
 * Defines the contract that all storage providers must implement
 * This allows swapping between local, S3, Cloudinary, etc.
 */

export interface StorageFile {
	path: string;
	url: string;
	size: number;
	type: string;
	uploadedAt: Date;
}

export interface StorageProvider {
	/**
	 * Upload a file
	 */
	uploadFile(file: File, path: string): Promise<StorageFile>;

	/**
	 * Delete a file
	 */
	deleteFile(path: string): Promise<void>;

	/**
	 * Get file information
	 */
	getFile(path: string): Promise<StorageFile | null>;

	/**
	 * List files in a directory
	 */
	listFiles(directory: string): Promise<StorageFile[]>;

	/**
	 * Get file URL
	 */
	getFileUrl(path: string): string;

	/**
	 * Check if provider is connected and healthy
	 */
	healthCheck(): Promise<boolean>;
}

export type StorageProviderType = 'local' | 's3' | 'cloudinary' | 'gcs' | 'mock';

export interface StorageConfig {
	provider: StorageProviderType;
	basePath?: string;
	baseUrl?: string;
	providerSpecificConfig?: Record<string, unknown>;
}

/**
 * S3-specific configuration
 */
export interface S3Config extends StorageConfig {
	provider: 's3';
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	endpoint?: string;
}

/**
 * Cloudinary-specific configuration
 */
export interface CloudinaryConfig extends StorageConfig {
	provider: 'cloudinary';
	cloudName: string;
	apiKey: string;
	apiSecret: string;
	folder?: string;
}

/**
 * Local storage configuration
 */
export interface LocalStorageConfig extends StorageConfig {
	provider: 'local';
	uploadDir: string;
	publicDir: string;
}

/**
 * Google Cloud Storage configuration
 */
export interface GCSConfig extends StorageConfig {
	provider: 'gcs';
	projectId: string;
	bucket: string;
	keyFile: string;
}
