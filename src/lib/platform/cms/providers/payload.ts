import type { CMSProvider, CMSUser, CMSFile, CMSConfig } from '../types';
import { createProviderLogger } from '../../logger.js';
import type { ConsolaInstance } from 'consola';

type MaybePayloadUser = Record<string, unknown> & {
	id?: string | number;
	email?: string;
	firstName?: string;
	lastName?: string;
	title?: string;
	name?: string;
};

type PayloadSingleResponse<T> = {
	doc?: T | null;
	data?: T | null;
	result?: T | null;
};

type PayloadListResponse<T> = {
	docs?: T[];
	data?: T[];
	results?: T[];
};

interface PayloadUploadDoc {
	id: string | number;
	filename?: string;
	url?: string;
	mimeType?: string;
	filesize?: number;
}

type PayloadUploadResponse = PayloadSingleResponse<PayloadUploadDoc> &
	PayloadListResponse<PayloadUploadDoc>;

export class PayloadCMSProvider implements CMSProvider {
	private readonly config: CMSConfig;
	private readonly logger: ConsolaInstance;
	private readonly usersCollection: string;
	private readonly mediaCollection: string;
	private readonly avatarField: string;
	private readonly depth: number;

	constructor(config: CMSConfig) {
		if (config.provider !== 'payload') {
			throw new Error('PayloadCMSProvider requires provider type "payload"');
		}

		this.config = config;
		this.usersCollection = (config.providerSpecificConfig?.usersCollection as string) ?? 'users';
		this.mediaCollection = (config.providerSpecificConfig?.mediaCollection as string) ?? 'media';
		this.avatarField = (config.providerSpecificConfig?.avatarField as string) ?? 'avatar';
		this.depth = (config.providerSpecificConfig?.depth as number) ?? 1;
		this.logger = createProviderLogger('CMS', 'payload');
		this.logger.start('Provider initialization started', {
			url: config.url,
			hasToken: Boolean(config.apiToken),
			usersCollection: this.usersCollection,
			mediaCollection: this.mediaCollection,
			depth: this.depth
		});
		this.logger.success('Provider initialization completed');
	}

	private get apiBase(): string {
		return this.config.url.replace(/\/$/, '');
	}

	private authHeaders(extra?: Record<string, string>): HeadersInit {
		return {
			Authorization: `Bearer ${this.config.apiToken}`,
			...(extra ?? {})
		};
	}

	private resolveUrl(url: string): string {
		if (!url) return '';
		return url.startsWith('http') ? url : `${this.apiBase}${url}`;
	}

	private toId(value: string | number | undefined): string {
		return value !== undefined ? String(value) : '';
	}

	async getUser(userId: string): Promise<CMSUser | null> {
		try {
			const response = await fetch(
				`${this.apiBase}/api/${this.usersCollection}/${userId}?depth=${this.depth}`,
				{ headers: this.authHeaders() }
			);

			if (!response.ok) {
				this.logger.warn('Failed to fetch Payload user', { userId, status: response.status });
				return null;
			}

			const raw = (await response.json()) as PayloadSingleResponse<MaybePayloadUser> &
				MaybePayloadUser;
			const doc = (raw.doc ?? raw.data ?? raw.result ?? raw) as MaybePayloadUser | null;

			if (!doc?.email) {
				return null;
			}

			const { id, email } = doc;
			const name = this.resolveUserName(doc);
			const media = this.resolveMedia(doc[this.avatarField]);

			return {
				id: this.toId(id ?? userId),
				email,
				name,
				avatar: media.id,
				avatarUrl: media.url
			};
		} catch (error) {
			this.logger.error('Failed to get Payload user', { userId, error });
			return null;
		}
	}

	async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
		try {
			const upload = await this.uploadToPayload(avatarUrl, 'avatar.jpg');

			if (!upload?.id) {
				throw new Error('Payload upload did not return an id');
			}

			const response = await fetch(`${this.apiBase}/api/${this.usersCollection}/${userId}`, {
				method: 'PATCH',
				headers: this.authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ [this.avatarField]: upload.id })
			});

			if (!response.ok) {
				throw new Error(`Payload user update failed (${response.status})`);
			}

			this.logger.info('User avatar updated', { userId, avatarId: upload.id });
		} catch (error) {
			this.logger.error('Failed to update Payload avatar', { userId, error });
			throw error;
		}
	}

	async deleteUserAvatar(userId: string): Promise<void> {
		try {
			const currentUser = await this.getUser(userId);

			if (!currentUser?.avatar) {
				this.logger.info('No avatar to delete for Payload user', { userId });
				await this.clearUserAvatarField(userId);
				return;
			}

			await this.clearUserAvatarField(userId);

			const deleteResponse = await fetch(
				`${this.apiBase}/api/${this.mediaCollection}/${currentUser.avatar}`,
				{ method: 'DELETE', headers: this.authHeaders() }
			);

			if (!deleteResponse.ok && deleteResponse.status !== 404) {
				throw new Error(`Payload avatar delete failed (${deleteResponse.status})`);
			}

			this.logger.info('User avatar deleted', { userId });
		} catch (error) {
			this.logger.error('Failed to delete Payload avatar', { userId, error });
			throw error;
		}
	}

	async uploadFile(file: File, folder?: string): Promise<CMSFile> {
		try {
			const upload = await this.uploadFileToPayload(file, folder);

			if (!upload) {
				throw new Error('Payload upload returned empty response');
			}

			return this.mapMediaToCMSFile(upload);
		} catch (error) {
			this.logger.error('Failed to upload file to Payload', { filename: file.name, error });
			throw error;
		}
	}

	async deleteFile(fileId: string): Promise<void> {
		try {
			const response = await fetch(`${this.apiBase}/api/${this.mediaCollection}/${fileId}`, {
				method: 'DELETE',
				headers: this.authHeaders()
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Payload delete failed (${response.status})`);
			}

			this.logger.info('File deleted', { fileId });
		} catch (error) {
			this.logger.error('Failed to delete Payload file', { fileId, error });
			throw error;
		}
	}

	async getFile(fileId: string): Promise<CMSFile | null> {
		try {
			const response = await fetch(`${this.apiBase}/api/${this.mediaCollection}/${fileId}`, {
				headers: this.authHeaders()
			});

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`Payload get file failed (${response.status})`);
			}

			const raw = (await response.json()) as PayloadSingleResponse<PayloadUploadDoc> &
				PayloadUploadDoc;
			const doc = (raw.doc ?? raw.data ?? raw.result ?? raw) as PayloadUploadDoc | null;

			return doc ? this.mapMediaToCMSFile(doc) : null;
		} catch (error) {
			this.logger.error('Failed to get Payload file', { fileId, error });
			return null;
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiBase}/api/${this.usersCollection}?limit=1`, {
				headers: this.authHeaders()
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

	private resolveUserName(user: MaybePayloadUser): string | undefined {
		if (user.name && typeof user.name === 'string') {
			return user.name;
		}

		const first = typeof user.firstName === 'string' ? user.firstName : undefined;
		const last = typeof user.lastName === 'string' ? user.lastName : undefined;

		if (first || last) {
			return `${first ?? ''} ${last ?? ''}`.trim() || undefined;
		}

		if (typeof user.title === 'string') {
			return user.title;
		}

		return undefined;
	}

	private resolveMedia(media: unknown): { id?: string; url?: string } {
		if (!media) return {};

		if (typeof media === 'string') {
			return { id: media };
		}

		if (typeof media === 'object' && media !== null) {
			const obj = media as Record<string, unknown>;
			const idValue = obj.id ?? obj.value ?? obj._id;
			const id =
				idValue !== undefined ? this.toId(idValue as string | number | undefined) : undefined;
			const rawUrl = obj.url;
			const url = typeof rawUrl === 'string' ? this.resolveUrl(rawUrl) : undefined;
			return { id, url };
		}

		return {};
	}

	private async uploadToPayload(
		avatarUrl: string,
		filename: string
	): Promise<PayloadUploadDoc | null> {
		const fileResponse = await fetch(avatarUrl);
		if (!fileResponse.ok) {
			throw new Error(`Failed to download avatar asset (${fileResponse.status})`);
		}
		const blob = await fileResponse.blob();
		const file = new File([blob], filename, { type: blob.type });
		return this.uploadFileToPayload(file);
	}

	private async uploadFileToPayload(file: File, folder?: string): Promise<PayloadUploadDoc | null> {
		const formData = new FormData();
		formData.append('file', file);
		if (folder) {
			formData.append('folder', folder);
		}

		const response = await fetch(`${this.apiBase}/api/${this.mediaCollection}`, {
			method: 'POST',
			headers: this.authHeaders(),
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Payload upload failed (${response.status})`);
		}

		const result = (await response.json()) as PayloadUploadResponse;
		const doc =
			result.doc ??
			result.data ??
			result.result ??
			result.docs?.[0] ??
			result.data?.[0] ??
			result.results?.[0];

		return doc ?? null;
	}

	private async clearUserAvatarField(userId: string): Promise<void> {
		const response = await fetch(`${this.apiBase}/api/${this.usersCollection}/${userId}`, {
			method: 'PATCH',
			headers: this.authHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ [this.avatarField]: null })
		});

		if (!response.ok) {
			throw new Error(`Payload avatar clear failed (${response.status})`);
		}
	}

	private mapMediaToCMSFile(doc: PayloadUploadDoc): CMSFile {
		return {
			id: this.toId(doc.id),
			filename: doc.filename ?? 'file',
			url: this.resolveUrl(doc.url ?? ''),
			size: doc.filesize ?? 0,
			type: doc.mimeType ?? 'application/octet-stream'
		};
	}
}
