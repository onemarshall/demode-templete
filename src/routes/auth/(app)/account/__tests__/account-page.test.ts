import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ context: vi.fn(), eligibility: vi.fn() }));
vi.mock('#lib/modules/auth/server/user-context.js', () => ({ loadAuthUserContext: mocks.context }));
vi.mock('#lib/modules/auth/server/deletion-policy.js', () => ({ loadDeletionEligibility: mocks.eligibility }));

import { load } from '../+page.server';

beforeEach(() => vi.clearAllMocks());

describe('Account & privacy access', () => {
	it('requires a signed-in account', async () => {
		mocks.context.mockResolvedValue(null);
		await expect(load({ request: new Request('http://localhost/auth/account'), depends: vi.fn() } as never)).rejects.toMatchObject({ status: 302, location: '/auth/sign-in' });
		expect(mocks.eligibility).not.toHaveBeenCalled();
	});

	it('loads the current account deletion policy and credential metadata', async () => {
		const user = { id: 'user-1', email: 'person@example.com', role: 'user,admin', hasPassword: true };
		mocks.context.mockResolvedValue({ user });
		const deletionEligibility = { allowed: false, reason: 'admin', message: 'Administrator accounts cannot be deleted.' };
		mocks.eligibility.mockResolvedValue(deletionEligibility);
		const data = await load({ request: new Request('http://localhost/auth/account'), depends: vi.fn() } as never);
		expect(data).toMatchObject({ user, hasPassword: true, roles: ['user', 'admin'], deletionEligibility });
		expect(mocks.eligibility).toHaveBeenCalledWith({ id: 'user-1', role: 'user,admin' });
	});
});
