import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ assert: vi.fn(), send: vi.fn() }));
vi.mock('../../deletion-policy', () => ({ assertCanDeleteAccount: mocks.assert }));
vi.mock('../../email', () => ({ sendTemplateEmail: mocks.send }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ publicEnv: { PUBLIC_APP_NAME: 'Test app' } }));
import { getUserOptions } from '../user';
const user = { id: 'user', name: 'User', email: 'user@example.com', emailVerified: true, createdAt: new Date(), updatedAt: new Date() };

describe('Better Auth deletion policy hooks', () => {
	beforeEach(() => { vi.clearAllMocks(); mocks.assert.mockResolvedValue(undefined); });
	it('checks eligibility before sending the verification email', async () => {
		await getUserOptions().deleteUser.sendDeleteAccountVerification({ user, url: 'https://example.com/confirm', token: 'token' });
		expect(mocks.assert).toHaveBeenCalledExactlyOnceWith(user);
		expect(mocks.send).toHaveBeenCalledOnce();
	});
	it('does not send mail when eligibility has changed', async () => {
		mocks.assert.mockRejectedValue(new Error('Subscription still active'));
		await expect(getUserOptions().deleteUser.sendDeleteAccountVerification({ user, url: 'https://example.com/confirm', token: 'token' })).rejects.toThrow('Subscription still active');
		expect(mocks.send).not.toHaveBeenCalled();
	});
	it('checks the same policy before the confirmed deletion', async () => {
		mocks.assert.mockRejectedValue(new Error('Administrator account'));
		await expect(getUserOptions().deleteUser.beforeDelete(user)).rejects.toThrow('Administrator account');
		expect(mocks.assert).toHaveBeenCalledExactlyOnceWith(user);
	});
});
