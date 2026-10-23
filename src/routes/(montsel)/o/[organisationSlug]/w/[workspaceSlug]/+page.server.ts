import type { Actions, PageServerLoad } from './$types';
import { workspaceRequest, formText, actionFailure } from '#lib/server/workspace/request.js';
import { listWorkspaceMembers, grantWorkspaceAssignment, revokeWorkspaceAssignment, updateWorkspaceMetadata } from '#lib/server/workspace/repositories.js';
import { assignableMembers } from '#lib/server/workspace/management.js';
import { findMembership, membershipIsAdminOrOwner } from '#lib/server/workspace/better-auth-adapter.js';
import { createWorkspaceInvitation } from '#lib/server/workspace/invitations.js';
import { listWorkspaceAuditEvents } from '#lib/server/workspace/audit.js';
import { requireWorkspaceAccess } from '#lib/server/workspace/context.js';
import { setWorkspacePreference } from '#lib/server/workspace/resolution.js';
const roles = ['workspace_admin', 'editor', 'contributor', 'viewer'] as const;
export const load: PageServerLoad = async (event) => {
	const { session, route, ctx } = await workspaceRequest(event, 'workspace:read');
	const manager = ctx.workspaceRole === 'workspace_admin';
	const members = manager ? await listWorkspaceMembers(await requireWorkspaceAccess(session.user.id, ctx.workspaceId, 'workspace_members:manage')) : [];
	const audit = manager ? await listWorkspaceAuditEvents(await requireWorkspaceAccess(session.user.id, ctx.workspaceId, 'audit:read'), { limit: 20 }) : [];
	const membership = await findMembership(session.user.id, ctx.organisationId);
	const availableMembers = manager ? await assignableMembers(await requireWorkspaceAccess(session.user.id, ctx.workspaceId, 'workspace_members:manage')) : [];
	return { route, role: ctx.workspaceRole, manager, members, audit, availableMembers, canInvite: manager && Boolean(membership && membershipIsAdminOrOwner(membership)) };
};
export const actions: Actions = {
	remember: async (event) => {
		const { ctx } = await workspaceRequest(event, 'workspace:read');
		await setWorkspacePreference(ctx.userId, ctx.organisationId, ctx.workspaceId);
		return { message: 'Saved as your preferred workspace.' };
	},
	rename: async (event) => {
		const { ctx } = await workspaceRequest(event, 'workspace:update');
		try { await updateWorkspaceMetadata(ctx, { name: formText(await event.request.formData(), 'name', 120) }); return { message: 'Workspace updated.' }; }
		catch (cause) { return actionFailure(cause); }
	},
	invite: async (event) => {
		const { ctx } = await workspaceRequest(event, 'workspace_members:manage');
		try {
			const form = await event.request.formData();
			const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a workspace role.' };
			const result = await createWorkspaceInvitation({ inviterUserId: ctx.userId, organisationId: ctx.organisationId, email: formText(form, 'email', 254), assignments: [{ workspaceId: ctx.workspaceId, role: role as typeof roles[number] }], headers: event.request.headers });
			return { message: result.emailDelivered ? 'Invitation sent.' : 'Invitation saved. Email delivery failed; resend it from organisation settings.' };
		} catch (cause) { return actionFailure(cause); }
	},
	grant: async (event) => {
		const { ctx } = await workspaceRequest(event, 'workspace_members:manage');
		try {
			const form = await event.request.formData(); const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a workspace role.' };
			await grantWorkspaceAssignment(ctx, { targetUserId: formText(form, 'targetUserId'), role: role as typeof roles[number] });
			return { message: 'Workspace access updated.' };
		} catch (cause) { return actionFailure(cause); }
	},
	revoke: async (event) => {
		const { ctx } = await workspaceRequest(event, 'workspace_members:manage');
		try { await revokeWorkspaceAssignment(ctx, formText(await event.request.formData(), 'targetUserId')); return { message: 'Workspace access removed.' }; }
		catch (cause) { return actionFailure(cause); }
	}
};
