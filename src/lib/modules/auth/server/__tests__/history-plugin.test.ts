import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recordHistory } = vi.hoisted(() => ({ recordHistory: vi.fn() }));
vi.mock('../history.js', () => ({ recordHistory }));

import { historyPlugin } from '../plugins/history.js';

const hook = historyPlugin().hooks!.after![0]!;

describe('history plugin hooks', () => {
	beforeEach(() => recordHistory.mockReset().mockResolvedValue(undefined));

	it('records a successful role change with the authenticated actor and target', async () => {
		const ctx = {
			path: '/admin/set-role',
			body: { userId: 'target-1', role: 'moderator' },
			context: { session: { user: { id: 'admin-1' } }, returned: { status: 200 } }
		};
		expect(hook.matcher(ctx as never)).toBe(true);
		await hook.handler(ctx as never);
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({
			category: 'admin', action: 'role_changed', outcome: 'success', actorId: 'admin-1', targetId: 'target-1', metadata: { role: 'moderator' }
		}));
	});

	it('records failed administrator actions without retaining the error body', async () => {
		const ctx = {
			path: '/admin/remove-user',
			body: { userId: 'target-2' },
			context: { session: { user: { id: 'admin-1' } }, returned: { status: 500, error: { message: 'sensitive detail' } } }
		};
		await hook.handler(ctx as never);
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({
			action: 'user_removed', outcome: 'failure', actorId: 'admin-1', targetId: 'target-2', metadata: undefined
		}));
	});

	it('does not log an incomplete two-factor challenge or mutation without an authenticated session', async () => {
		expect(hook.matcher({ path: '/two-factor/verify-totp' } as never)).toBe(false);
		await hook.handler({ path: '/admin/remove-user', body: { userId: 'target-2' }, context: {} } as never);
		expect(recordHistory).not.toHaveBeenCalled();
	});

	it('fails open when history persistence is unavailable', async () => {
		recordHistory.mockRejectedValueOnce(new Error('db unavailable'));
		await expect(hook.handler({ path: '/admin/remove-user', body: { userId: 'target-2' }, context: { session: { user: { id: 'admin-1' } } } } as never)).resolves.toBeUndefined();
	});
});
