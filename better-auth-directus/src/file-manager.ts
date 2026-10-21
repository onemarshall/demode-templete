/**
 * Directus File Manager Service
 * Handles file operations in Directus CMS
 */

import { readItem, deleteItem, uploadFiles, readItems, updateItem } from '@directus/sdk';
import type { RestClient } from '@directus/sdk';
import { z } from 'zod';
import type { DirectusSyncFile, SyncLogger } from './types';
import type { DirectusSyncSchema } from './schema';
import { DirectusBoundary } from './boundary';

const noopLogger: SyncLogger = {
	info() {},
	warn() {},
	error() {},
	debug() {}
};

interface FileQueryFilter {
	folder?: { _eq: string };
	filename_download?: { _contains: string };
}

interface FileQueryOptions {
	limit: number;
	offset: number;
	fields: readonly string[];
	filter?: FileQueryFilter;
}

interface DirectusFileRecord {
	id: string;
	filename_download?: string;
	filesize?: number;
	type?: string;
	folder?: string;
}

const listFilesOptionsSchema = z.object({
	limit: z.number().int().min(0).max(500).optional(),
	offset: z.number().int().min(0).optional(),
	folder: z.string().trim().min(1).optional(),
	search: z.string().trim().min(1).optional()
});

const fileMetadataSchema = z.record(z.string(), z.unknown());

export class DirectusFileManager {
	private client: RestClient<DirectusSyncSchema>;
	private config: { url: string };
	private boundary: DirectusBoundary;
	private logger: SyncLogger;

	constructor(
		client: RestClient<DirectusSyncSchema>,
		config: { url: string },
		boundary?: DirectusBoundary,
		logger?: SyncLogger
	) {
		this.client = client;
		this.config = config;
		this.boundary = boundary ?? new DirectusBoundary();
		this.logger = logger ?? noopLogger;
	}

	private toAssetUrl(fileId: string): string {
		return `${this.config.url}/assets/${fileId}`;
	}

	private toSyncFile(
		file: {
			id: string;
			filename_download?: string | null;
			filesize?: number | null;
			type?: string | null;
		},
		fallback?: { filename?: string; size?: number; type?: string }
	): DirectusSyncFile {
		return {
			id: file.id,
			filename: file.filename_download || fallback?.filename || 'unknown',
			url: this.toAssetUrl(file.id),
			size: typeof file.filesize === 'number' ? file.filesize : fallback?.size || 0,
			type: file.type || fallback?.type || 'application/octet-stream'
		};
	}

	async uploadFile(file: File, folder?: string): Promise<DirectusSyncFile> {
		return await this.boundary.run({
			operation: 'DirectusFileManager.uploadFile',
			propagateErrors: true,
			op: async () => {
				try {
					const formData = new FormData();
					formData.append('file', file);

					if (folder) {
						formData.append('folder', folder);
					}

					const uploadedFile = await this.client.request(uploadFiles(formData));

					if (!uploadedFile || !uploadedFile.id) {
						throw new Error('File upload failed');
					}

					const result = this.toSyncFile(
						{
							id: uploadedFile.id as string,
							filename_download: uploadedFile.filename_download as string | null | undefined,
							filesize: typeof uploadedFile.filesize === 'number' ? uploadedFile.filesize : null,
							type: uploadedFile.type as string | null | undefined
						},
						{ filename: file.name, size: file.size, type: file.type }
					);

					this.logger.info('File uploaded successfully', {
						fileId: result.id,
						filename: result.filename
					});
					return result;
				} catch (error) {
					this.logger.error('Failed to upload file', { filename: file.name, error });
					throw error;
				}
			}
		});
	}

	async deleteFile(fileId: string): Promise<void> {
		await this.boundary.run({
			operation: 'DirectusFileManager.deleteFile',
			fallback: undefined,
			op: async () => {
				try {
					await this.client.request(deleteItem('directus_files', fileId));
					this.logger.info('File deleted successfully', { fileId });
					return;
				} catch (error) {
					this.logger.error('Failed to delete file', { fileId, error });
					throw error;
				}
			}
		});
	}

	async getFile(fileId: string): Promise<DirectusSyncFile | null> {
		return await this.boundary.run({
			operation: 'DirectusFileManager.getFile',
			fallback: null,
			op: async () => {
				try {
					const file = await this.client.request(
						readItem('directus_files', fileId, {
							fields: ['id', 'filename_download', 'filesize', 'type']
						})
					);

					if (!file) return null;

					return this.toSyncFile({
						id: file.id as string,
						filename_download: file.filename_download as string | null | undefined,
						filesize: typeof file.filesize === 'number' ? file.filesize : null,
						type: file.type as string | null | undefined
					});
				} catch (error) {
					this.logger.error('Failed to get file', { fileId, error });
					throw error;
				}
			}
		});
	}

	async listFiles(
		options: {
			limit?: number;
			offset?: number;
			folder?: string;
			search?: string;
		} = {}
	): Promise<DirectusSyncFile[]> {
		return await this.boundary.run({
			operation: 'DirectusFileManager.listFiles',
			fallback: [],
			op: async () => {
				try {
					const parsedOptions = listFilesOptionsSchema.parse(options);
					const query: FileQueryOptions = {
						limit: parsedOptions.limit ?? 100,
						offset: parsedOptions.offset ?? 0,
						fields: ['id', 'filename_download', 'filesize', 'type', 'folder'] as const
					};

					const filter: FileQueryFilter = {};

					if (parsedOptions.folder) {
						filter.folder = { _eq: parsedOptions.folder };
					}

					if (parsedOptions.search) {
						filter.filename_download = { _contains: parsedOptions.search };
					}

					if (Object.keys(filter).length > 0) {
						query.filter = filter;
					}

					const files = (await this.client.request(
						readItems('directus_files', query as unknown as Record<string, unknown>)
					)) as unknown as DirectusFileRecord[];

					return files.map((file) => this.toSyncFile(file));
				} catch (error) {
					this.logger.error('Failed to list files', { error });
					throw error;
				}
			}
		});
	}

	async getFileMetadata(fileId: string): Promise<DirectusFileRecord | null> {
		return await this.boundary.run({
			operation: 'DirectusFileManager.getFileMetadata',
			fallback: null,
			op: async () => {
				try {
					const file = await this.client.request(
						readItem('directus_files', fileId, {
							fields: ['*']
						})
					);

					return (file as DirectusFileRecord) || null;
				} catch (error) {
					this.logger.error('Failed to get file metadata', { fileId, error });
					throw error;
				}
			}
		});
	}

	async updateFileMetadata(fileId: string, metadata: Record<string, unknown>): Promise<void> {
		await this.boundary.run({
			operation: 'DirectusFileManager.updateFileMetadata',
			fallback: undefined,
			op: async () => {
				try {
					const parsedMetadata = fileMetadataSchema.parse(metadata);
					await this.client.request(updateItem('directus_files', fileId, parsedMetadata));
					this.logger.info('File metadata updated', { fileId });
					return;
				} catch (error) {
					this.logger.error('Failed to update file metadata', { fileId, error });
					throw error;
				}
			}
		});
	}
}
