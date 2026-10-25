import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';

const mocks = vi.hoisted(() => {
	return {
		getServerEnv: vi.fn(),
		getSession: vi.fn(),
		detectSuspiciousActivity: vi.fn(),
		storage: {
			get: vi.fn(),
			ttl: vi.fn()
		},
		redis: {
			get: vi.fn(),
			ttl: vi.fn(),
			ping: vi.fn(),
			destroy: vi.fn()
		}
	};
});

vi.mock('#lib/platform/config/server.server.js', () => ({
	getServerEnv: mocks.getServerEnv
}));
vi.mock('#lib/platform/config/index.js', () => ({
	getServerEnv: mocks.getServerEnv
}));

vi.mock('#lib/app/setup.server.js', () => ({
	auth: { api: { getSession: mocks.getSession } }
}));

vi.mock('#lib/modules/auth/server/config.js', () => ({
	auth: {
		api: {
			getSession: mocks.getSession
		}
	}
}));

// The security storage is selected from the environment at import time, so it
// is mocked here to keep the temp-block checks deterministic.
vi.mock('#lib/modules/auth/server/security-storage.js', () => ({
	getSecurityStorage: vi.fn(async () => mocks.storage)
}));

vi.mock('#lib/platform/redis/index.js', () => ({
	getSharedRedisClient: vi.fn().mockResolvedValue(mocks.redis)
}));

vi.mock('#lib/modules/auth/security/services/abuse-detection.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/modules/auth/security/services/abuse-detection.js')>()),
	detectSuspiciousActivity: mocks.detectSuspiciousActivity
}));

describe('hooks.server auth headers', () => {
	beforeEach(() => {
		mocks.getServerEnv.mockReset();
		mocks.getSession.mockReset();
		mocks.detectSuspiciousActivity.mockReset();
		mocks.storage.get.mockReset();
		mocks.storage.ttl.mockReset();
		mocks.redis.get.mockReset();
		mocks.redis.ttl.mockReset();

		mocks.getServerEnv.mockResolvedValue({ PUBLIC_SITE_URL: 'http://localhost:3000' });
		mocks.getSession.mockResolvedValue(null);
		mocks.detectSuspiciousActivity.mockResolvedValue({
			blocked: false,
			riskScore: 0,
			requireCaptcha: false,
			securityLevel: 'low'
		});
		mocks.storage.get.mockResolvedValue(null);
		mocks.storage.ttl.mockResolvedValue(60);
		mocks.redis.get.mockResolvedValue(null);
		mocks.redis.ttl.mockResolvedValue(60);
	});

	it('adds Server-Timing and x-response-time to /api/auth responses', async () => {
		const { handle } = await import('../hooks.server');
		type HandleArgs = Parameters<Handle>[0];

		const event = {
			url: new URL('http://localhost/api/auth/sign-in/email'),
			request: new Request('http://localhost/api/auth/sign-in/email', { method: 'POST' }),
			locals: {},
			getClientAddress: () => '203.0.113.10'
		} as unknown as RequestEvent;

		const response = await handle({
			event,
			resolve: async () => new Response('ok', { status: 200 })
		} as unknown as HandleArgs);

		expect(response.headers.get('server-timing')).toContain('app;dur=');
		expect(response.headers.get('x-response-time')).toContain('ms');
	});

	it('returns 429 with Retry-After and x-ratelimit-* headers when temp-blocked', async () => {
		mocks.storage.get.mockResolvedValue('1');
		mocks.storage.ttl.mockResolvedValue(42);

		const { handle } = await import('../hooks.server');
		type HandleArgs = Parameters<Handle>[0];

		const event = {
			url: new URL('http://localhost/api/auth/sign-in/email'),
			request: new Request('http://localhost/api/auth/sign-in/email', { method: 'POST' }),
			locals: {},
			getClientAddress: () => '203.0.113.10'
		} as unknown as RequestEvent;

		const response = await handle({
			event,
			resolve: async () => new Response('ok', { status: 200 })
		} as unknown as HandleArgs);

		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('42');
		expect(response.headers.get('x-ratelimit-remaining')).toBe('0');
		expect(response.headers.get('x-ratelimit-reset')).toBeTruthy();
		expect(response.headers.get('server-timing')).toContain('app;dur=');
	});
});
