import { createStorageAdapter, type StorageAdapter } from '$lib/auth/security/core/storage';
import { setSharedStorageAdapter } from '$lib/auth/security/services/redis';

let _adapter: StorageAdapter | null = null;

export async function getSecurityStorage(): Promise<StorageAdapter> {
	if (!_adapter) {
		_adapter = await createStorageAdapter();
		setSharedStorageAdapter(_adapter);
	}
	return _adapter;
}
