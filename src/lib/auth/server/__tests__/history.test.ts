import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('#lib/auth/server/database/db.js', () => ({ getDB: async () => ({ query }) }));

import { listAdminHistory, listOwnHistory, recordHistory } from '../history.js';

describe('account and administrator history persistence', () => {
	beforeEach(() => query.mockReset());

	it('stores only whitelisted safe metadata and caps string values', async () => {
		query.mockResolvedValue({ rows: [] });
		await recordHistory({
			category: 'admin',
			action: 'role_changed',
			outcome: 'success',
			actorId: 'admin-1',
			targetId: 'user-1',
			metadata: {
				role: 'moderator',
				password: 'never-store-this',
				authToken: 'never-store-this-either',
				longLabel: 'x'.repeat(200)
			}
		});
		const insert = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO auth_history'));
		expect(insert?.[1]?.[6]).toBe(JSON.stringify({ role: 'moderator', longLabel: 'x'.repeat(160) }));
		expect(String(query.mock.calls.at(-1)?.[0])).toContain('DELETE FROM auth_history');
	});

	it('scopes user reads to actor or target, applies the retention window, and clamps pagination', async () => {
		query.mockResolvedValue({ rows: [] });
		await listOwnHistory('user-a', undefined, 500);
		const sql = String(query.mock.calls.at(-1)?.[0]);
		expect(sql).toContain('actor_id = $1 OR target_id = $1');
		expect(sql).toContain('created_at >= NOW()');
		expect(query.mock.calls.at(-1)?.[1]).toEqual(['user-a', null, null, 90, null, 50]);
	});

	it('leaves the actor filter unset for the admin audit list', async () => {
		query.mockResolvedValue({ rows: [] });
		await listAdminHistory();
		expect(query.mock.calls.at(-1)?.[1]?.[0]).toBeNull();
		expect(query.mock.calls.at(-1)?.[1]?.[2]).toBe('admin');
	});
});
