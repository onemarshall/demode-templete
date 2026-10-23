import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), accounts: vi.fn(), query: vi.fn(), release: vi.fn(), connect: vi.fn() }));
vi.mock('#lib/auth.js', () => ({ auth: { api: { getSession: mocks.session, listUserAccounts: mocks.accounts } } }));
vi.mock('#lib/auth/server/database/db.js', () => ({ getDB: async () => ({ connect: mocks.connect }) }));
vi.mock('#lib/auth/server/session-serializer.js', () => ({ resolveUserImage: () => null }));

import { loadAuthUserContext } from '../user-context';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
	mocks.session.mockResolvedValue({ user: { id: 'user-1', email: 'person@example.com', name: 'Person' }, session: { id: 'session-1' } });
	mocks.accounts.mockResolvedValue([{ id: 'credential-1', providerId: 'credential', accountId: 'user-1' }]);
});

describe('account credential metadata', () => {
	it('returns password presence without exposing a stored hash, independently of last login', async () => {
		mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('lastLoginMethod')
			? [{ lastLoginMethod: 'github' }]
			: sql.includes('SELECT EXISTS') ? [{ hasPassword: true, password: 'must-not-be-serialized' }] : [] }));
		const context = await loadAuthUserContext(new Headers());
		expect(context?.user.hasPassword).toBe(true);
		expect(context?.user.lastLoginMethod).toBe('github');
		expect(context?.user).not.toHaveProperty('password');
		expect(JSON.stringify(context)).not.toContain('must-not-be-serialized');
		expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('SELECT EXISTS'), ['user-1', ['credential', 'email']]);
		expect(mocks.release).toHaveBeenCalledOnce();
	});

	it('does not infer a password from a previous login method', async () => {
		mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('lastLoginMethod')
			? [{ lastLoginMethod: 'password' }]
			: sql.includes('SELECT EXISTS') ? [{ hasPassword: false }] : [] }));
		expect((await loadAuthUserContext(new Headers()))?.user.hasPassword).toBe(false);
	});

	it('does not query account details without a signed-in user', async () => {
		mocks.session.mockResolvedValue(null);
		expect(await loadAuthUserContext(new Headers())).toBeNull();
		expect(mocks.connect).not.toHaveBeenCalled();
	});
});
