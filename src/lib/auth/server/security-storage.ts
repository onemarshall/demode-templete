import { createStorageAdapter, type StorageAdapter } from '#lib/auth/security/core/storage.js';
import { setSharedStorageAdapter } from '#lib/auth/security/services/redis.js';

let _adapter: StorageAdapter | null = null;

export async function getSecurityStorage(): Promise<StorageAdapter> {
	if (!_adapter) {
		_adapter = await createStorageAdapter();
		setSharedStorageAdapter(_adapter);
	}
	return _adapter;
}
