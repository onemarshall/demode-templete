import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../routes/api/system-health/+server';

const { mockQuery, mockPing, mockFetch } = vi.hoisted(() => ({
	mockQuery: vi.fn(),
	mockPing: vi.fn(),
	mockFetch: vi.fn()
}));

vi.mock('#lib/auth/shared/env/index.js', async () => {
	// Reuse the shared env mock's full export set ($test → src/test alias),
	// then override getServerEnv to inject the BDC key this test asserts on.
	const actual = await import('$test/mocks/env');
	return {
		...actual,
		getServerEnv: vi.fn().mockImplementation(async () => ({
			...(await actual.getServerEnv()),
			REDIS_URL: 'redis://localhost:6379',
			BIGDATACLOUD_API_KEY: 'test-key'
		}))
	};
});
vi.mock('#lib/auth/server/database/db.js', () => ({
	getDB: vi.fn().mockResolvedValue({ query: mockQuery })
}));

vi.mock('#lib/auth/shared/redis/index.js', () => ({
	getSharedRedisClient: vi.fn().mockResolvedValue({ ping: mockPing })
}));

vi.mock('#lib/monitoring/apm.js', () => ({
	emitSystemHealth: vi.fn().mockResolvedValue(undefined)
}));

// The route resolves an optional session for admin-only detail.
// Mock the config module so the real Better Auth instance (and its
// Postgres adapter) never initializes in this unit test.
vi.mock('#lib/auth/server/config.js', () => ({
	auth: {
		api: {
			getSession: vi.fn().mockResolvedValue(null)
		}
	}
}));

global.fetch = mockFetch as unknown as typeof fetch;

describe('GET /api/system-health', () => {
	beforeEach(() => {
		mockQuery.mockReset();
		mockPing.mockReset();
		mockFetch.mockReset();
		mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
		mockPing.mockResolvedValueOnce('PONG');
		mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
	});

	it('returns operational when dependencies are healthy', async () => {
		const response = await GET({} as unknown as Parameters<typeof GET>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.overallStatus).toBe('operational');
		expect(body.checks.map((c: { name: string; status: string }) => c.status)).toContain(
			'operational'
		);
	});

	it('returns critical when database check fails', async () => {
		mockQuery.mockReset();
		mockQuery.mockRejectedValueOnce(new Error('db down'));
		mockPing.mockResolvedValueOnce('PONG');
		mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

		const response = await GET({} as unknown as Parameters<typeof GET>[0]);
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.overallStatus).toBe('critical');
		const dbCheck = body.checks.find((c: { name: string }) => c.name === 'database');
		expect(dbCheck.status).toBe('critical');
	});
});
