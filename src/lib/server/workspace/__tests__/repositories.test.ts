import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), findMembership: vi.fn(), transactionQuery: vi.fn(), audit: vi.fn() }));
vi.mock('#lib/auth/server/database/db.js', () => ({
	getDB: async () => ({ query: mocks.query }),
	withTransaction: async (callback: (client: { query: typeof mocks.transactionQuery }) => Promise<unknown>) => callback({ query: mocks.transactionQuery })
}));
vi.mock('../better-auth-adapter.js', () => ({ findMembership: mocks.findMembership, membershipHasRole: (membership: { role: string }, role: string) => membership.role.split(',').includes(role) }));
vi.mock('../audit.js', () => ({ writeAuditEvent: mocks.audit }));

import { requireWorkspaceAccess } from '../context.js';
import { grantAdministrativeAssignment, grantWorkspaceAssignment } from '../repositories.js';
import { WorkspaceAccessError } from '../errors.js';

const workspaceRow = { id: 'workspace-1', organisationId: 'org-1', name: 'Brand', slug: 'brand', createdBy: 'owner', status: 'active' };
const assignmentRow = { id: 'assignment-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'workspace_admin', status: 'active', expiresAt: null, grantSource: 'managed', grantedBy: 'owner', provisioningId: null, createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findMembership.mockResolvedValue({ id: 'membership-1', role: 'member' });
	mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('FROM "workspace"') ? [workspaceRow] : sql.includes('FROM "workspace_member"') ? [assignmentRow] : [] }));
	mocks.transactionQuery.mockImplementation(async (sql: string) => {
		if (sql.includes('bool_or')) return { rows: [{ count: '25', targetActive: false }] };
		if (sql.includes('JOIN "workspace_member"')) return { rows: [{ organisationId: 'org-1', role: 'workspace_admin' }] };
		if (sql.includes('FROM "workspace"')) return { rows: [{ organisationId: 'org-1' }] };
		if (sql.includes('SELECT "role", "status"') || sql.includes('SELECT "role"')) return { rows: [] };
		return { rows: [] };
	});
});

describe('workspace seat limits', () => {
	it('enforces the seat cap under the organisation lock for managed grants', async () => {
		const context = await requireWorkspaceAccess('user-1', 'workspace-1', 'workspace_members:manage');
		await expect(grantWorkspaceAssignment(context, { targetUserId: 'user-2', role: 'editor' })).rejects.toThrow(WorkspaceAccessError);
		expect(mocks.transactionQuery).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['org-1']);
		expect(mocks.transactionQuery).toHaveBeenCalledWith(expect.stringContaining('bool_or'), ['workspace-1', 'user-2']);
		expect(mocks.transactionQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO "workspace_member"'))).toBe(false);
	});

	it('enforces the same seat cap for explicit owner administrative grants', async () => {
		mocks.findMembership.mockImplementation(async (userId: string) => ({ id: `membership-${userId}`, role: userId === 'owner-1' ? 'owner' : 'member' }));
		await expect(grantAdministrativeAssignment({
			actorUserId: 'owner-1', organisationId: 'org-1', workspaceId: 'workspace-1',
			targetUserId: 'user-2', role: 'editor', reason: 'Access request'
		})).rejects.toThrow(WorkspaceAccessError);
		expect(mocks.transactionQuery).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['org-1']);
		expect(mocks.transactionQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO "workspace_member"'))).toBe(false);
	});
});
