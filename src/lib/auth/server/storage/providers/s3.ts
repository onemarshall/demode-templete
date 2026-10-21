/**
 * AWS S3 Storage Provider — STUB
 *
 * This provider is not implemented. The factory in
 * `../index.ts` already rejects `provider: 's3'`; this class exists
 * only so the surrounding types compile and so a future contributor
 * has a starting skeleton. Every method throws on purpose — earlier
 * versions silently logged "success" and returned fabricated URLs,
 * which masked broken uploads.
 *
 * To implement: install `@aws-sdk/client-s3`, replace the throws
 * below with real SDK calls, and register in `../index.ts`.
 */

import type { StorageProvider, StorageFile, S3Config } from '../types';

const NOT_IMPLEMENTED =
	'S3StorageProvider is not implemented. Install @aws-sdk/client-s3 and replace the stub methods in src/lib/auth/server/storage/providers/s3.ts.';

export class S3StorageProvider implements StorageProvider {
	private readonly config: S3Config;

	constructor(config: S3Config) {
		if (config.provider !== 's3') {
			throw new Error('S3StorageProvider requires provider type "s3"');
		}
		this.config = config;
	}

	async uploadFile(_file: File, _path: string): Promise<StorageFile> {
		throw new Error(NOT_IMPLEMENTED);
	}

	async deleteFile(_path: string): Promise<void> {
		throw new Error(NOT_IMPLEMENTED);
	}

	async getFile(_path: string): Promise<StorageFile | null> {
		throw new Error(NOT_IMPLEMENTED);
	}

	async listFiles(_directory: string): Promise<StorageFile[]> {
		throw new Error(NOT_IMPLEMENTED);
	}

	getFileUrl(path: string): string {
		// Deterministic URL is the one piece that can be computed without
		// the SDK, so it's safe to keep — useful for tests/migration paths.
		return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${path}`;
	}

	async healthCheck(): Promise<boolean> {
		throw new Error(NOT_IMPLEMENTED);
	}
}
