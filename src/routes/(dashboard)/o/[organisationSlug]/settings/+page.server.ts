import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenancySession, formText, actionFailure } from '#lib/modules/tenancy/server/request.js';
import { organisationSettings } from '#lib/modules/tenancy/server/management.js';
import { createBrand, archiveBrand } from '#lib/modules/tenancy/server/brands.js';
import { grantAdministrativeAssignment } from '#lib/modules/tenancy/server/repositories.js';
import { transferOwnership, removeOrganisationMember } from '#lib/modules/tenancy/server/lifecycle.js';
import { resendInvitationEmail, cancelBrandInvitation } from '#lib/modules/tenancy/server/invitations.js';
import { retryProvisioning } from '#lib/modules/tenancy/server/provisioning.js';
const roles = ['brand_admin', 'editor', 'contributor', 'viewer'] as const;
export const load: PageServerLoad = async (event) => {
	const { user } = await requireTenancySession(event);
	try { return await organisationSettings(user.id, event.params.organisationSlug); }
	catch { error(404, 'Organisation unavailable'); }
};
export const actions: Actions = {
	createBrand: async (event) => {
		const { user } = await requireTenancySession(event);
		let path: string;
		try {
			const data = await organisationSettings(user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			const brand = await createBrand({ userId: user.id, organisationId: data.organisation.id, name: formText(form, 'name', 120), slug: formText(form, 'slug', 48) });
			path = `/o/${data.organisation.slug}/${brand.slug}`;
		} catch (cause) { return actionFailure(cause); }
		redirect(303, path);
	},
	grant: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const { organisation } = await organisationSettings(user.id, event.params.organisationSlug);
			const form = await event.request.formData();
			const role = formText(form, 'role');
			if (!roles.includes(role as typeof roles[number])) return { message: 'Choose a brand role.' };
			await grantAdministrativeAssignment({ actorUserId: user.id, organisationId: organisation.id, brandId: formText(form, 'brandId'), targetUserId: formText(form, 'targetUserId'), role: role as typeof roles[number], reason: formText(form, 'reason', 500) });
			return { message: 'Brand access granted.' };
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
			await archiveBrand({ userId: user.id, organisationId: organisation.id, brandId: formText(form, 'brandId') });
			return { message: 'Brand archived.' };
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
			await cancelBrandInvitation({ invitationId: formText(await event.request.formData(), 'invitationId'), actorUserId: user.id, organisationId: organisation.id, headers: event.request.headers });
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
