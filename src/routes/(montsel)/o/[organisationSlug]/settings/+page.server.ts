import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenancySession, formText, actionFailure } from '#lib/server/workspace/request.js';
import { organisationSettings } from '#lib/server/workspace/management.js';
import { createWorkspace, archiveWorkspace } from '#lib/server/workspace/workspaces.js';
import { grantAdministrativeAssignment } from '#lib/server/workspace/repositories.js';
import { transferOwnership, removeOrganisationMember } from '#lib/server/workspace/lifecycle.js';
import { resendInvitationEmail, cancelWorkspaceInvitation } from '#lib/server/workspace/invitations.js';
import { retryProvisioning } from '#lib/server/workspace/provisioning.js';
const roles = ['workspace_admin', 'editor', 'contributor', 'viewer'] as const;
export const load: PageServerLoad = async (event) => {
	const { user } = await requireTenancySession(event);
	try { return await organisationSettings(user.id, event.params.organisationSlug); }
	catch { error(404, 'Organisation unavailable'); }
};
export const actions: Actions = {
	createWorkspace: async (event) => {
		const { user } = await requireTenancySession(event);
		let path: string;
		try {
			const data = await organisationSettings(user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			const workspace = await createWorkspace({ userId: user.id, organisationId: data.organisation.id, name: formText(form, 'name', 120), slug: formText(form, 'slug', 48) });
			path = `/o/${data.organisation.slug}/w/${workspace.slug}`;
		} catch (cause) { return actionFailure(cause); }
		redirect(303, path);
	},
	grant: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a workspace role.' };
			await grantAdministrativeAssignment({ actorUserId: user.id, organisationId: organisation.id, workspaceId: formText(form, 'workspaceId'), targetUserId: formText(form, 'targetUserId'), role: role as typeof roles[number], reason: formText(form, 'reason', 500) });
			return { message: 'Workspace access granted.' };
		} catch (cause) { return actionFailure(cause); }
	},
	transfer: async (event) => {
		const session = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(session.user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			await transferOwnership({ userId: session.user.id, sessionCreatedAt: session.session.createdAt, organisationId: organisation.id, targetUserId: formText(form, 'targetUserId'), confirmation: formText(form, 'confirmation'), reason: formText(form, 'reason', 500) });
			return { message: 'Ownership transferred. You are now an organisation admin.' };
		} catch (cause) { return actionFailure(cause); }
	},
	remove: async (event) => {
		const session = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(session.user.id, event.params.organisationSlug);
			await removeOrganisationMember({ userId: session.user.id, sessionCreatedAt: session.session.createdAt, organisationId: organisation.id, targetUserId: formText(await event.request.formData(), 'targetUserId') });
		} catch (cause) { return actionFailure(cause); }
		redirect(303, '/organisations');
	},
	archive: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			if (formText(form, 'confirmation') !== 'ARCHIVE') return { message: 'Type ARCHIVE to confirm.' };
			await archiveWorkspace({ userId: user.id, organisationId: organisation.id, workspaceId: formText(form, 'workspaceId') });
			return { message: 'Workspace archived.' };
		} catch (cause) { return actionFailure(cause); }
	},
	resend: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(user.id, event.params.organisationSlug);
			const delivered = await resendInvitationEmail({ invitationId: formText(await event.request.formData(), 'invitationId'), actorUserId: user.id, organisationId: organisation.id, headers: event.request.headers });
			return { message: delivered ? 'Invitation sent.' : 'Email delivery failed. You can retry.' };
		} catch (cause) { return actionFailure(cause); }
	},
	cancel: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(user.id, event.params.organisationSlug);
			await cancelWorkspaceInvitation({ invitationId: formText(await event.request.formData(), 'invitationId'), actorUserId: user.id, organisationId: organisation.id, headers: event.request.headers });
			return { message: 'Invitation cancelled.' };
		} catch (cause) { return actionFailure(cause); }
	},
	retry: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const data = await organisationSettings(user.id, event.params.organisationSlug);
			const id = formText(await event.request.formData(), 'provisioningId');
			if (!data.invitations.some((i) => i.id === id)) error(404, 'Invitation unavailable');
			return { message: `Invitation status: ${await retryProvisioning({ provisioningId: id, actorUserId: user.id, headers: event.request.headers })}` };
		} catch (cause) { return actionFailure(cause); }
	}
};
