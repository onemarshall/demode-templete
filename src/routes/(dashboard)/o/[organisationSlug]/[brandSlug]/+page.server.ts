import type { Actions, PageServerLoad } from './$types';
import { brandRequest, formText, actionFailure } from '#lib/server/brand/request.js';
import { listBrandMembers, grantBrandAssignment, revokeBrandAssignment, updateBrandMetadata } from '#lib/server/brand/repositories.js';
import { assignableMembers } from '#lib/server/brand/management.js';
import { findMembership, membershipIsAdminOrOwner } from '#lib/server/brand/better-auth-adapter.js';
import { createBrandInvitation } from '#lib/server/brand/invitations.js';
import { listBrandAuditEvents } from '#lib/server/brand/audit.js';
import { requireBrandAccess } from '#lib/server/brand/context.js';
import { setBrandPreference } from '#lib/server/brand/resolution.js';
const roles = ['brand_admin', 'editor', 'contributor', 'viewer'] as const;
export const load: PageServerLoad = async (event) => {
	const { session, route, ctx } = await brandRequest(event, 'brand:read');
	const manager = ctx.brandRole === 'brand_admin';
	const members = manager ? await listBrandMembers(await requireBrandAccess(session.user.id, ctx.brandId, 'brand_members:manage')) : [];
	const audit = manager ? await listBrandAuditEvents(await requireBrandAccess(session.user.id, ctx.brandId, 'audit:read'), { limit: 20 }) : [];
	const membership = await findMembership(session.user.id, ctx.organisationId);
	const availableMembers = manager ? await assignableMembers(await requireBrandAccess(session.user.id, ctx.brandId, 'brand_members:manage')) : [];
	return { route, role: ctx.brandRole, manager, members, audit, availableMembers, canInvite: manager && Boolean(membership && membershipIsAdminOrOwner(membership)) };
};
export const actions: Actions = {
	remember: async (event) => {
		const { ctx } = await brandRequest(event, 'brand:read');
		await setBrandPreference(ctx.userId, ctx.organisationId, ctx.brandId);
		return { message: 'Saved as your preferred brand.' };
	},
	rename: async (event) => {
		const { ctx } = await brandRequest(event, 'brand:update');
		try { await updateBrandMetadata(ctx, { name: formText(await event.request.formData(), 'name', 120) }); return { message: 'Brand updated.' }; }
		catch (cause) { return actionFailure(cause); }
	},
	invite: async (event) => {
		const { ctx } = await brandRequest(event, 'brand_members:manage');
		try {
			const form = await event.request.formData();
			const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a brand role.' };
			const result = await createBrandInvitation({ inviterUserId: ctx.userId, organisationId: ctx.organisationId, email: formText(form, 'email', 254), assignments: [{ brandId: ctx.brandId, role: role as typeof roles[number] }], headers: event.request.headers });
			return { message: result.emailDelivered ? 'Invitation sent.' : 'Invitation saved. Email delivery failed; resend it from organisation settings.' };
		} catch (cause) { return actionFailure(cause); }
	},
	grant: async (event) => {
		const { ctx } = await brandRequest(event, 'brand_members:manage');
		try {
			const form = await event.request.formData(); const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a brand role.' };
			await grantBrandAssignment(ctx, { targetUserId: formText(form, 'targetUserId'), role: role as typeof roles[number] });
			return { message: 'Brand access updated.' };
		} catch (cause) { return actionFailure(cause); }
	},
	revoke: async (event) => {
		const { ctx } = await brandRequest(event, 'brand_members:manage');
		try { await revokeBrandAssignment(ctx, formText(await event.request.formData(), 'targetUserId')); return { message: 'Brand access removed.' }; }
		catch (cause) { return actionFailure(cause); }
	}
};
