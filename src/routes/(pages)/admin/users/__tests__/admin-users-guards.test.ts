import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
	return {
		getSession: vi.fn(),
		getServerEnv: vi.fn(),
		admin: {
			listUsers: vi.fn(),
			getUser: vi.fn(),
			listUserSessions: vi.fn(),
			banUser: vi.fn(),
			unbanUser: vi.fn(),
			setRole: vi.fn(),
			setUserPassword: vi.fn(),
			revokeUserSession: vi.fn(),
			revokeUserSessions: vi.fn(),
			impersonateUser: vi.fn(),
			stopImpersonating: vi.fn(),
			removeUser: vi.fn()
		}
	};
});

vi.mock('$lib/auth/server/config', () => ({
	auth: {
		api: {
			getSession: mocks.getSession
		}
	}
}));

vi.mock('$lib/auth/shared/env', () => ({
	getServerEnv: mocks.getServerEnv
}));

vi.mock('$lib/auth/server/admin-helpers', () => ({
	getAdminApi: () => mocks.admin
}));

import { load } from '../+page.server';

type LoadArgs = Parameters<typeof load>[0];

type SessionUser = {
	id: string;
	email: string;
	name: string;
	image?: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	role?: string;
};

function createLoadArgs(url: URL, headers?: Headers): LoadArgs {
	return {
		request: new Request(url.toString(), { headers: headers ?? new Headers() }),
		url
	} as unknown as LoadArgs;
}

function createSession(user: SessionUser) {
	return {
		user,
		session: {
			id: 'sess_1',
			userId: user.id,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60)
		}
	};
}

describe('/admin/users load guards', () => {
	beforeEach(() => {
		mocks.getSession.mockReset();
		mocks.getServerEnv.mockReset();
		mocks.admin.listUsers.mockReset();

		mocks.getServerEnv.mockResolvedValue({
			AUTH_ADMIN_ROLES: ['admin'],
			AUTH_ADMIN_USER_IDS: []
		});

		mocks.admin.listUsers.mockResolvedValue({ users: [] });
	});

	it('redirects to /auth/sign-in when session is missing', async () => {
		mocks.getSession.mockResolvedValue(null);

		const url = new URL('http://localhost/admin/users');
		await expect(load(createLoadArgs(url))).rejects.toMatchObject({ status: 302 });
	});

	it('throws 403 when user is authenticated but not allowed', async () => {
		const user: SessionUser = {
			id: 'u_1',
			email: 'user@example.com',
			name: 'User',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			role: 'user'
		};
		mocks.getSession.mockResolvedValue(createSession(user));

		const url = new URL('http://localhost/admin/users');
		await expect(load(createLoadArgs(url))).rejects.toMatchObject({ status: 403 });
	});

	it('allows access when role is in AUTH_ADMIN_ROLES', async () => {
		const user: SessionUser = {
			id: 'u_admin',
			email: 'admin@example.com',
			name: 'Admin',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			role: 'admin'
		};
		mocks.getSession.mockResolvedValue(createSession(user));

		const url = new URL('http://localhost/admin/users');
		const result = await load(createLoadArgs(url));
		expect(result).toMatchObject({ users: [] });
		expect(mocks.admin.listUsers).toHaveBeenCalledTimes(1);
	});

	it('allows access when user id is in AUTH_ADMIN_USER_IDS', async () => {
		mocks.getServerEnv.mockResolvedValue({
			AUTH_ADMIN_ROLES: ['admin'],
			AUTH_ADMIN_USER_IDS: ['u_special']
		});

		const user: SessionUser = {
			id: 'u_special',
			email: 'special@example.com',
			name: 'Special',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			role: 'user'
		};
		mocks.getSession.mockResolvedValue(createSession(user));

		const url = new URL('http://localhost/admin/users');
		const result = await load(createLoadArgs(url));
		expect(result).toMatchObject({ users: [] });
		expect(mocks.admin.listUsers).toHaveBeenCalledTimes(1);
	});
});
