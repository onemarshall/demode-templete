import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenancySession, actionFailure } from '#lib/server/brand/request.js';
import { recipientInvitation } from '#lib/server/brand/management.js';
import { organizationApi } from '#lib/server/brand/organization-api.js';
import { reconcileAcceptedInvitation, retryProvisioning } from '#lib/server/brand/provisioning.js';
export const load: PageServerLoad = async (event) => {
	const { user } = await requireTenancySession(event);
	try { return { invitation: await recipientInvitation(user, event.params.invitationId), emailVerified: user.emailVerified }; }
	catch { error(404, 'Invitation unavailable. Sign in with the email address that received it.'); }
};
export const actions: Actions = {
	accept: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const invitation = await recipientInvitation(user, event.params.invitationId);
			if (invitation.status === 'pending') await organizationApi().acceptInvitation({ headers: event.request.headers, body: { invitationId: invitation.invitationId } });
			else if (invitation.status === 'accepted') await reconcileAcceptedInvitation(invitation.invitationId, user.id);
			return { message: 'Acceptance recorded. Brand access appears when setup completes.' };
		} catch (cause) { return actionFailure(cause); }
	},
	retry: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const invitation = await recipientInvitation(user, event.params.invitationId);
			if (invitation.status === 'accepted' && invitation.state === 'pending_acceptance') await reconcileAcceptedInvitation(invitation.invitationId, user.id);
			else await retryProvisioning({ provisioningId: invitation.provisioningId, actorUserId: user.id, headers: event.request.headers });
			return { message: 'Brand setup checked. Review the status below.' };
		} catch (cause) { return actionFailure(cause); }
	},
	reject: async (event) => {
		const { user } = await requireTenancySession(event);
		try {
			const invitation = await recipientInvitation(user, event.params.invitationId);
			await organizationApi().rejectInvitation({ headers: event.request.headers, body: { invitationId: invitation.invitationId } });
		} catch (cause) { return actionFailure(cause); }
		redirect(303, '/organisations');
	}
};
