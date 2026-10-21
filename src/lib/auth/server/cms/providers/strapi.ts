import type { CMSProvider, CMSUser, CMSFile, CMSConfig } from '#lib/auth/server/cms/types.js';
import { createProviderLogger } from '#lib/auth/shared/logger.js';
import type { ConsolaInstance } from 'consola';

interface StrapiUser {
	id: number;
	documentId: string;
	email: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	avatar?: {
		id: number;
		documentId: string;
		url: string;
	} | null;
}

interface StrapiUploadResponseItem {
	id: number;
	documentId: string;
	name: string;
	url: string;
	mime: string;
	size: number;
}

type StrapiUploadResponse = StrapiUploadResponseItem[];

export class StrapiCMSProvider implements CMSProvider {
	private readonly config: CMSConfig;
	private readonly logger: ConsolaInstance;

	constructor(config: CMSConfig) {
		if (config.provider !== 'strapi') {
			throw new Error('StrapiCMSProvider requires provider type "strapi"');
		}

		this.config = config;
		this.logger = createProviderLogger('CMS', 'strapi');
		this.logger.start('Provider initialization started', {
			url: config.url,
			hasToken: Boolean(config.apiToken)
		});
		this.logger.success('Provider initialization completed');
	}

	private get headers(): HeadersInit {
		return {
			Authorization: `Bearer ${this.config.apiToken}`
		};
	}

	private get apiBase(): string {
		return this.config.url.replace(/\/$/, '');
	}

	private resolveUrl(url: string): string {
		if (!url) return '';
		return url.startsWith('http') ? url : `${this.apiBase}${url}`;
	}

	async getUser(userId: string): Promise<CMSUser | null> {
		try {
			const response = await fetch(`${this.apiBase}/api/users/${userId}?populate=avatar`, {
				headers: this.headers
			});

			if (!response.ok) {
				this.logger.warn('Failed to fetch Strapi user', {
					userId,
					status: response.status
				});
				return null;
			}

			const user = (await response.json()) as StrapiUser;

			if (!user) return null;

			return {
				id: String(user.id),
				email: user.email,
				name:
					user.firstName || user.lastName
						? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
						: user.username,
				avatar: user.avatar?.documentId ?? undefined,
				avatarUrl: user.avatar?.url ? this.resolveUrl(user.avatar.url) : undefined
			};
		} catch (error) {
			this.logger.error('Failed to get Strapi user', { userId, error });
			return null;
		}
	}

	async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
		try {
			const fileResponse = await fetch(avatarUrl);
			const blob = await fileResponse.blob();
			const file = new File([blob], 'avatar.jpg', { type: blob.type });

			const uploadedFile = await this.uploadToStrapi(file);

			if (!uploadedFile) {
				throw new Error('Strapi upload did not return a file');
			}

			// Strapi 5 user update still uses numeric id for relation
			const updateResponse = await fetch(`${this.apiBase}/api/users/${userId}`, {
				method: 'PUT',
				headers: {
					...this.headers,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ avatar: uploadedFile.id })
			});

			if (!updateResponse.ok) {
				throw new Error(`Strapi user update failed (${updateResponse.status})`);
			}

			this.logger.info('User avatar updated', {
				userId,
				avatarId: uploadedFile.id,
				avatarDocumentId: uploadedFile.documentId
			});
		} catch (error) {
			this.logger.error('Failed to update Strapi user avatar', { userId, error });
			throw error;
		}
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		try {
			const user = await this.getUser(userId);

			if (!user?.avatar) {
				this.logger.info('No avatar to delete for Strapi user', { userId });
				return;
			}

			// Delete file using documentId
			const deleteResponse = await fetch(`${this.apiBase}/api/upload/files/${user.avatar}`, {
				method: 'DELETE',
				headers: this.headers
			});

			if (!deleteResponse.ok) {
				throw new Error(`Strapi avatar delete failed (${deleteResponse.status})`);
			}

			// Clear avatar relation on user
			const updateResponse = await fetch(`${this.apiBase}/api/users/${userId}`, {
				method: 'PUT',
				headers: {
					...this.headers,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ avatar: null })
			});

			if (!updateResponse.ok) {
				throw new Error(`Strapi avatar clear failed (${updateResponse.status})`);
			}

			this.logger.info('User avatar deleted', { userId });
		} catch (error) {
			this.logger.error('Failed to delete Strapi avatar', { userId, error });
			throw error;
		}
	}

	async uploadFile(file: File, folder?: string): Promise<CMSFile> {
		try {
			const uploadedFile = await this.uploadToStrapi(file, folder);

			if (!uploadedFile) {
				throw new Error('Strapi upload returned empty response');
			}

			return {
				id: uploadedFile.documentId,
				filename: uploadedFile.name,
				url: this.resolveUrl(uploadedFile.url),
				size: uploadedFile.size * 1024,
				type: uploadedFile.mime
			};
		} catch (error) {
			this.logger.error('Failed to upload file to Strapi', { filename: file.name, error });
			throw error;
		}
	}

	async deleteFile(fileId: string): Promise<void> {
		try {
			// fileId is documentId in Strapi 5
			const response = await fetch(`${this.apiBase}/api/upload/files/${fileId}`, {
				method: 'DELETE',
				headers: this.headers
			});

			if (!response.ok) {
				throw new Error(`Strapi delete failed (${response.status})`);
			}

			this.logger.info('File deleted', { fileId });
		} catch (error) {
			this.logger.error('Failed to delete Strapi file', { fileId, error });
			throw error;
		}
	}

	async getFile(fileId: string): Promise<CMSFile | null> {
		try {
			// fileId is documentId in Strapi 5
			const response = await fetch(`${this.apiBase}/api/upload/files/${fileId}`, {
				headers: this.headers
			});

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`Strapi get file failed (${response.status})`);
			}

			const file = (await response.json()) as StrapiUploadResponseItem;

			return {
				id: file.documentId,
				filename: file.name,
				url: this.resolveUrl(file.url),
				size: file.size * 1024,
				type: file.mime
			};
		} catch (error) {
			this.logger.error('Failed to get Strapi file', { fileId, error });
			return null;
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiBase}/api/users?pagination[pageSize]=1`, {
				headers: this.headers
			});

			const isHealthy = response.ok;

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

	private async uploadToStrapi(
		file: File,
		folder?: string
	): Promise<StrapiUploadResponseItem | undefined> {
		const formData = new FormData();
		formData.append('files', file);
		if (folder) {
			formData.append('path', folder);
		}

		const response = await fetch(`${this.apiBase}/api/upload`, {
			method: 'POST',
			headers: this.headers,
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Strapi upload failed (${response.status})`);
		}

		const result = (await response.json()) as StrapiUploadResponse;
		return result[0];
	}
}
