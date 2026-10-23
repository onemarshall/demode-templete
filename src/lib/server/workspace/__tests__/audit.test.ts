import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), findMembership: vi.fn() }));
vi.mock('#lib/auth/server/database/db.js', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('../better-auth-adapter.js', () => ({ findMembership: mocks.findMembership, membershipIsAdminOrOwner: (membership: { role: string }) => membership.role.split(',').some((role) => ['owner', 'admin'].includes(role)) }));

import { requireWorkspaceAccess } from '../context.js';
import { listOrganisationAuditEvents, listWorkspaceAuditEvents } from '../audit.js';
import { WorkspaceAccessError } from '../errors.js';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findMembership.mockResolvedValue({ id: 'member-1' });
	mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('FROM "workspace"')
		? [{ id: 'workspace-1', organisationId: 'org-1', name: 'Brand', slug: 'brand', createdBy: 'owner', status: 'active' }]
		: sql.includes('FROM "workspace_member"')
			? [{ id: 'assignment-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'editor', status: 'active', expiresAt: null, grantSource: 'managed', grantedBy: 'owner', provisioningId: null, createdAt: new Date(), updatedAt: new Date() }]
			: [] }));
});

describe('workspace audit read permission', () => {
	it('denies ordinary workspace readers before querying audit events', async () => {
		const context = await requireWorkspaceAccess('user-1', 'workspace-1', 'workspace:read');
		await expect(listWorkspaceAuditEvents(context)).rejects.toThrow(WorkspaceAccessError);
		expect(mocks.query).toHaveBeenCalledTimes(2); // context resolution only
	});

	it('allows a context explicitly resolved for audit:read', async () => {
		mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('FROM "workspace"')
			? [{ id: 'workspace-1', organisationId: 'org-1', name: 'Brand', slug: 'brand', createdBy: 'owner', status: 'active' }]
			: sql.includes('FROM "workspace_member"')
				? [{ id: 'assignment-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'workspace_admin', status: 'active', expiresAt: null, grantSource: 'managed', grantedBy: 'owner', provisioningId: null, createdAt: new Date(), updatedAt: new Date() }]
				: [] }));
		const context = await requireWorkspaceAccess('user-1', 'workspace-1', 'audit:read');
		expect(await listWorkspaceAuditEvents(context)).toEqual([]);
		expect(mocks.query).toHaveBeenCalledTimes(3);
	});

	it('requires current organisation membership and limits audit visibility by role and expiry', async () => {
		mocks.findMembership.mockResolvedValue({ id: 'member-1', role: 'member' });
		mocks.query.mockResolvedValue({ rows: [] });
		await listOrganisationAuditEvents('user-1', 'org-1');
		expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('wm."role" = \'workspace_admin\''), ['org-1', 'user-1', false, 50, 0]);
		expect(mocks.query.mock.calls[0][0]).toContain('wm."expires_at" > now()');
		expect(mocks.query.mock.calls[0][0]).toContain('w."status" = \'active\'');

		mocks.findMembership.mockResolvedValue(null);
		await expect(listOrganisationAuditEvents('revoked-user', 'org-1')).rejects.toThrow(WorkspaceAccessError);
		expect(mocks.query).toHaveBeenCalledTimes(1);
	});

	it('exposes organisation-level events only to organisation owners and admins', async () => {
		mocks.findMembership.mockResolvedValue({ id: 'owner-membership', role: 'owner' });
		mocks.query.mockResolvedValue({ rows: [] });
		await listOrganisationAuditEvents('owner-1', 'org-1');
		expect(mocks.query).toHaveBeenCalledWith(expect.any(String), ['org-1', 'owner-1', true, 50, 0]);
	});
});
