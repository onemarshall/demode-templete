import type { CMSProvider, CMSUser, CMSFile, CMSConfig } from '../types.js';
import { createProviderLogger } from '../../logger.js';
import type { ConsolaInstance } from 'consola';

interface TempleUserResponse {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	avatar?: {
		id?: string;
		url?: string;
	};
}

interface TempleFileResponse {
	id: string;
	filename: string;
	url: string;
	size: number;
	mimeType: string;
}

export class TempleCMSProvider implements CMSProvider {
	private readonly config: CMSConfig;
	private readonly logger: ConsolaInstance;

	constructor(config: CMSConfig) {
		if (config.provider !== 'temple') {
			throw new Error('TempleCMSProvider requires provider type "temple"');
		}

		this.config = config;
		this.logger = createProviderLogger('CMS', 'temple');
		this.logger.start('Provider initialization started', {
			url: config.url,
			hasToken: Boolean(config.apiToken)
		});
		this.logger.success('Provider initialization completed');
	}

	private get apiBase(): string {
		return this.config.url.replace(/\/$/, '');
	}

	private get headers(): HeadersInit {
		return {
			Authorization: `Bearer ${this.config.apiToken}`,
			'Content-Type': 'application/json'
		};
	}

	private toAbsoluteUrl(url: string): string {
		if (!url) return '';
		if (url.startsWith('http')) return url;
		return `${this.apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
	}

	async getUser(userId: string): Promise<CMSUser | null> {
		try {
			const response = await fetch(`${this.apiBase}/api/users/${userId}`, {
				headers: this.headers
			});

			if (!response.ok) {
				this.logger.warn('Failed to fetch Temple user', { userId, status: response.status });
				return null;
			}

			const user = (await response.json()) as TempleUserResponse;

			return {
				id: user.id,
				email: user.email,
				name: this.resolveName(user),
				avatar: user.avatar?.id,
				avatarUrl: user.avatar?.url ? this.toAbsoluteUrl(user.avatar.url) : undefined
			};
		} catch (error) {
			this.logger.error('Failed to get Temple user', { userId, error });
			return null;
		}
	}

	async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
		try {
			const uploadedFile = await this.uploadExternalAsset(avatarUrl, 'avatar.jpg');

			if (!uploadedFile) {
				throw new Error('Temple upload returned empty response');
			}

			const response = await fetch(`${this.apiBase}/api/users/${userId}`, {
				method: 'PATCH',
				headers: this.headers,
				body: JSON.stringify({ avatar: uploadedFile.id })
			});

			if (!response.ok) {
				throw new Error(`Temple user update failed (${response.status})`);
			}

			this.logger.info('User avatar updated', { userId, avatarId: uploadedFile.id });
		} catch (error) {
			this.logger.error('Failed to update Temple avatar', { userId, error });
			throw error;
		}
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		try {
			const user = await this.getUser(userId);

			if (!user?.avatar) {
				this.logger.info('No avatar to delete for Temple user', { userId });
				return;
			}

			// Clear avatar reference first
			await fetch(`${this.apiBase}/api/users/${userId}`, {
				method: 'PATCH',
				headers: this.headers,
				body: JSON.stringify({ avatar: null })
			});

			// Delete the file
			const response = await fetch(`${this.apiBase}/api/files/${user.avatar}`, {
				method: 'DELETE',
				headers: this.headers
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Temple avatar delete failed (${response.status})`);
			}

			this.logger.info('User avatar deleted', { userId });
		} catch (error) {
			this.logger.error('Failed to delete Temple avatar', { userId, error });
			throw error;
		}
	}

	async uploadFile(file: File, folder?: string): Promise<CMSFile> {
		try {
			const uploadedFile = await this.uploadFileInternal(file, folder);

			if (!uploadedFile) {
				throw new Error('Temple upload returned empty response');
			}

			return this.mapFile(uploadedFile);
		} catch (error) {
			this.logger.error('Failed to upload file to Temple', { filename: file.name, error });
			throw error;
		}
	}

	async deleteFile(fileId: string): Promise<void> {
		try {
			const response = await fetch(`${this.apiBase}/api/files/${fileId}`, {
				method: 'DELETE',
				headers: this.headers
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Temple delete failed (${response.status})`);
			}

			this.logger.info('File deleted', { fileId });
		} catch (error) {
			this.logger.error('Failed to delete Temple file', { fileId, error });
			throw error;
		}
	}

	async getFile(fileId: string): Promise<CMSFile | null> {
		try {
			const response = await fetch(`${this.apiBase}/api/files/${fileId}`, {
				headers: this.headers
			});

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`Temple get file failed (${response.status})`);
			}

			const file = (await response.json()) as TempleFileResponse;
			return this.mapFile(file);
		} catch (error) {
			this.logger.error('Failed to get Temple file', { fileId, error });
			return null;
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiBase}/api/users?limit=1`, {
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

	private resolveName(user: TempleUserResponse): string | undefined {
		if (user.displayName) return user.displayName;

		const combined = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
		return combined || undefined;
	}

	private async uploadExternalAsset(
		assetUrl: string,
		filename: string
	): Promise<TempleFileResponse | null> {
		const response = await fetch(assetUrl);
		if (!response.ok) {
			throw new Error(`Failed to download external asset (${response.status})`);
		}
		const blob = await response.blob();
		const file = new File([blob], filename, { type: blob.type });
		return this.uploadFileInternal(file);
	}

	private async uploadFileInternal(
		file: File,
		folder?: string
	): Promise<TempleFileResponse | null> {
		const formData = new FormData();
		formData.append('file', file);
		if (folder) {
			formData.append('folder', folder);
		}

		const response = await fetch(`${this.apiBase}/api/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.config.apiToken}`
			},
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Temple upload failed (${response.status})`);
		}

		return (await response.json()) as TempleFileResponse;
	}

	private mapFile(file: TempleFileResponse): CMSFile {
		return {
			id: file.id,
			filename: file.filename,
			url: this.toAbsoluteUrl(file.url),
			size: file.size,
			type: file.mimeType
		};
	}
}
