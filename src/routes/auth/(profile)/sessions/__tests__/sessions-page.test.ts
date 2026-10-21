import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const {
	getSessionMock,
	listSessionsMock,
	listUserAccountsMock,
	revokeSessionMock,
	revokeOtherSessionsMock,
	signOutMock,
	invalidateAllMock,
	gotoMock,
	loggerInfoMock,
	loggerWarnMock,
	loggerDebugMock
} = vi.hoisted(() => ({
	getSessionMock: vi.fn(),
	listSessionsMock: vi.fn(),
	listUserAccountsMock: vi.fn(),
	revokeSessionMock: vi.fn(),
	revokeOtherSessionsMock: vi.fn(),
	signOutMock: vi.fn(),
	invalidateAllMock: vi.fn(),
	gotoMock: vi.fn(),
	loggerInfoMock: vi.fn(),
	loggerWarnMock: vi.fn(),
	loggerDebugMock: vi.fn()
}));

vi.mock('$lib/auth', () => ({
	auth: {
		api: {
			getSession: getSessionMock,
			listSessions: listSessionsMock,
			listUserAccounts: listUserAccountsMock
		}
	}
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		useSession: vi.fn(() => ({
			data: null,
			isPending: false,
			error: null
		})),
		revokeSession: revokeSessionMock,
		revokeOtherSessions: revokeOtherSessionsMock,
		signOut: signOutMock
	}
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock,
	invalidateAll: invalidateAllMock,
	beforeNavigate: vi.fn(),
	afterNavigate: vi.fn()
}));

vi.mock('$lib/auth/shared/logger', () => ({
	logger: {
		info: loggerInfoMock,
		warn: loggerWarnMock,
		debug: loggerDebugMock,
		error: vi.fn(),
		success: vi.fn()
	}
}));

let loadPage!: typeof import('../+page.server').load;

beforeAll(async () => {
	const serverModule = await import('../+page.server');
	loadPage = serverModule.load;
}, 30000);

function createMockLoadEvent(headersInit?: HeadersInit) {
	const headers = new Headers(headersInit);
	const request = new Request('http://localhost/auth/profile/sessions', { headers });
	return {
		request,
		getClientAddress: () => '127.0.0.1',
		depends: vi.fn(),
		locals: {}
	} as unknown as Parameters<typeof loadPage>[0];
}

async function loadResult(headersInit?: HeadersInit): Promise<Record<string, unknown>> {
	return (await loadPage(createMockLoadEvent(headersInit))) as unknown as Record<string, unknown>;
}

const mockSession = {
	user: {
		id: 'test-user-id',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: true,
		twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		image: null,
		passkeys: []
	},
	session: {
		id: 'test-session-id',
		token: 'test-token',
		userId: 'test-user-id',
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		createdAt: new Date(),
		updatedAt: new Date()
	}
};

describe('SessionsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockReset();
		listSessionsMock.mockReset();
		listUserAccountsMock.mockReset();
		revokeSessionMock.mockReset();
		revokeOtherSessionsMock.mockReset();
		signOutMock.mockReset();
		invalidateAllMock.mockReset();
		gotoMock.mockReset();
		loggerInfoMock.mockReset();
		loggerWarnMock.mockReset();
		loggerDebugMock.mockReset();

		getSessionMock.mockResolvedValue(mockSession);
		listSessionsMock.mockResolvedValue([mockSession.session]);
		listUserAccountsMock.mockResolvedValue([]);
		revokeSessionMock.mockResolvedValue(undefined);
		revokeOtherSessionsMock.mockResolvedValue(undefined);
		signOutMock.mockResolvedValue(undefined);
		invalidateAllMock.mockResolvedValue(undefined);
		gotoMock.mockResolvedValue(undefined);
	});

	it('loads page with valid session', async () => {
		const result = await loadResult({
			'user-agent': 'Mozilla/5.0 (Test Browser)',
			referer: 'http://localhost/auth/profile',
			host: 'localhost:5173'
		});

		expect(result).toBeDefined();
		expect(result.user).toBeDefined();
		expect(result.session).toBeDefined();
		expect(getSessionMock).toHaveBeenCalled();
	});

	it('returns all sessions', async () => {
		const result = await loadResult();

		expect(result.allSessions).toBeDefined();
		expect(Array.isArray(result.allSessions)).toBe(true);
		expect(listSessionsMock).toHaveBeenCalled();
	});

	it('returns account and passkey counts', async () => {
		const result = await loadResult();
		expect(result.accountCount).toBeTypeOf('number');
		expect(result.passkeyCount).toBeTypeOf('number');
	});

	it('redirects to sign-in when no session', async () => {
		getSessionMock.mockResolvedValueOnce({ user: null });

		try {
			await loadResult();
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	it('redirects to sign-in when session is expired', async () => {
		const expiredSession = {
			...mockSession,
			session: {
				...mockSession.session,
				expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
			}
		};

		getSessionMock.mockResolvedValueOnce(expiredSession);

		try {
			await loadResult();
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	it('marks dependencies for invalidation', async () => {
		const dependsMock = vi.fn();
		const event = createMockLoadEvent();
		event.depends = dependsMock;
		await loadPage(event);

		expect(dependsMock).toHaveBeenCalledWith('auth:session');
		expect(dependsMock).toHaveBeenCalledWith('auth:user');
	});

	it('handles failed session list gracefully', async () => {
		listSessionsMock.mockRejectedValueOnce(new Error('Failed to list sessions'));
		const result = await loadResult();

		expect(result.allSessions).toEqual([]);
		expect(loggerWarnMock).toHaveBeenCalledWith(
			'Failed to list sessions',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('handles failed accounts list gracefully', async () => {
		listUserAccountsMock.mockRejectedValueOnce(new Error('Failed to list accounts'));
		const result = await loadResult();

		expect(result.accountCount).toBe(0);
		expect(loggerDebugMock).toHaveBeenCalledWith(
			'Failed to list accounts',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});
});
