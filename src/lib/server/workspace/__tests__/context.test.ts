import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), findMembership: vi.fn() }));
vi.mock('#lib/auth/server/database/db.js', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('../better-auth-adapter.js', () => ({ findMembership: mocks.findMembership }));

import { assertOperationAction, requireWorkspaceAccess } from '../context.js';
import { requireAction } from '../repositories.js';
import { WorkspaceAccessError } from '../errors.js';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findMembership.mockResolvedValue({ id: 'member-1' });
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "workspace"')) {
			return { rows: [{ id: 'workspace-1', organisationId: 'org-1', name: 'Brand', slug: 'brand', createdBy: 'owner', status: 'active' }] };
		}
		if (sql.includes('FROM "workspace_member"')) {
			return { rows: [{ id: 'assignment-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'workspace_admin', status: 'active', expiresAt: null, grantSource: 'managed', grantedBy: 'owner', provisioningId: null, createdAt: new Date(), updatedAt: new Date() }] };
		}
		return { rows: [] };
	});
});

describe('workspace operation context', () => {
	it('mints a frozen runtime-branded context scoped to the requested action', async () => {
		const context = await requireWorkspaceAccess('user-1', 'workspace-1', 'workspace:read');
		expect(Object.isFrozen(context)).toBe(true);
		expect(context.authorizedAction).toBe('workspace:read');
		expect(() => assertOperationAction(context, 'workspace:read')).not.toThrow();
		expect(() => requireAction(context, 'workspace:update')).toThrow(WorkspaceAccessError);
	});

	it('rejects an object forged with a TypeScript cast', () => {
		const forged = { userId: 'user-1', organisationId: 'org-1', workspaceId: 'workspace-1', workspaceSlug: 'brand', workspaceRole: 'workspace_admin', authorizedAction: 'audit:read' };
		expect(() => assertOperationAction(forged as never, 'audit:read')).toThrow(WorkspaceAccessError);
	});

	it('re-resolves workspace, membership, and assignment on every operation', async () => {
		await requireWorkspaceAccess('user-1', 'workspace-1', 'workspace:read');
		await requireWorkspaceAccess('user-1', 'workspace-1', 'workspace:read');
		expect(mocks.query).toHaveBeenCalledTimes(4);
		expect(mocks.findMembership).toHaveBeenCalledTimes(2);
	});

	it('fails closed when the current membership has been revoked', async () => {
		mocks.findMembership.mockResolvedValue(null);
		await expect(requireWorkspaceAccess('user-1', 'workspace-1', 'workspace:read')).rejects.toThrow(WorkspaceAccessError);
		expect(mocks.query).toHaveBeenCalledTimes(1);
	});
});
