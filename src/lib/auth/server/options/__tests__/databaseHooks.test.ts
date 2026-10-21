import { describe, it, expect, vi, beforeEach } from 'vitest';
import { databaseHooks } from '../databaseHooks';
import { getServerEnv } from '#lib/auth/shared/env/index.js';

const mockGetDirectusCMSProvider = vi.fn();

// Mock dependencies
vi.mock('#lib/auth/shared/env/index.js', () => ({
	getServerEnv: vi.fn()
}));

vi.mock('#lib/auth/server/plugins/cms.js', () => ({
	getDirectusCMSProvider: () => mockGetDirectusCMSProvider()
}));

// Mock the dynamically imported service
const mockSyncUser = vi.fn();
vi.mock('#lib/server/directus/sync', () => ({
	directusUserService: {
		syncUser: (...args: unknown[]) => mockSyncUser(...args)
	}
}));

describe('databaseHooks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should NOT sync if CMS_PROVIDER is not directus', async () => {
		vi.mocked(getServerEnv).mockResolvedValue({ CMS_PROVIDER: 'strapi' } as unknown as never);
		mockGetDirectusCMSProvider.mockReturnValue(null);

		const user = {
			id: '1',
			email: 'test@example.com',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date()
		} as unknown as Record<string, unknown>;

		const afterHook = databaseHooks?.user?.create?.after;
		if (afterHook) {
			await afterHook(user as never, {} as never);
		}

		expect(mockSyncUser).not.toHaveBeenCalled();
	});

	it('should sync if CMS_PROVIDER is directus', async () => {
		vi.mocked(getServerEnv).mockResolvedValue({ CMS_PROVIDER: 'directus' } as unknown as never);
		mockGetDirectusCMSProvider.mockReturnValue({
			syncUser: mockSyncUser
		});

		const user = {
			id: '1',
			email: 'test@example.com',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date()
		} as unknown as Record<string, unknown>;

		const afterHook = databaseHooks?.user?.create?.after;
		if (afterHook) {
			await afterHook(user as never, {} as never);
		}

		expect(mockSyncUser).toHaveBeenCalledWith(user);
	});
});
