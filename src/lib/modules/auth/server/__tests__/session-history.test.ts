import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recordHistory } = vi.hoisted(() => ({ recordHistory: vi.fn() }));
vi.mock('../history.js', () => ({ recordHistory }));
vi.mock('#lib/platform/redis/index.js', () => ({ getSharedRedisClient: vi.fn(async () => { throw new Error('redis unavailable'); }) }));

import { betterAuthDatabaseHooks } from '../database/hooks.js';

describe('session history recording', () => {
	beforeEach(() => recordHistory.mockReset().mockResolvedValue(undefined));
	const afterSessionCreate = betterAuthDatabaseHooks?.session?.create?.after;

	it('records only successfully created sessions as sign-ins, without storing session credentials', async () => {
		expect(afterSessionCreate).toBeDefined();
		await afterSessionCreate!({
			token: 'secret-session-token',
			userId: 'user-1',
			createdAt: new Date('2026-10-22T10:00:00Z'),
			ipAddress: '203.0.113.4',
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/123.0 Safari/537.36'
		} as never, null);
		expect(recordHistory).toHaveBeenCalledWith({
			category: 'security', action: 'session_created', outcome: 'success', actorId: 'user-1',
			metadata: { method: 'session', ipAddress: '203.0.113.4', device: 'Chrome on macOS' }
		});
		expect(JSON.stringify(recordHistory.mock.calls)).not.toContain('secret-session-token');
	});

	it('fails open if the history store is unavailable after session creation', async () => {
		recordHistory.mockRejectedValueOnce(new Error('database unavailable'));
		expect(afterSessionCreate).toBeDefined();
		await expect(afterSessionCreate!({
			token: 'secret-session-token', userId: 'user-1', createdAt: new Date()
		} as never, null)).resolves.toBeUndefined();
	});
});
