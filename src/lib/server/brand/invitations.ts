/**
 * Montsel invitation service (spec §7).
 *
 * ALL organisation invitations that carry brand access are created
 * through this service. Flow: authority checks → plugin invitation creation
 * (email send is a no-op) → provisioning record exists (hook) → attach
 * intended brand grants → deliver email. The provisioning record is
 * therefore always persisted before delivery (§7.1), and delivery failure
 * never grants access.
 */

import { APIError } from 'better-auth/api';
import { auth } from '#lib/auth.js';
import { organizationApi } from './organization-api.js';
import { publicEnv } from '#lib/auth/shared/env/index.js';
import { sendTemplateEmail } from '#lib/auth/server/email/index.js';
import { logger } from '#lib/auth/shared/logger.js';
import { getDB } from '#lib/auth/server/database/db.js';
import { writeAuditEvent } from './audit.js';
import { findMembership, membershipIsAdminOrOwner, countOrganisationMembers } from './better-auth-adapter.js';
import { addGrantsToProvisioning, canGrantBrand, cancelProvisioning, type GrantRow } from './provisioning.js';
import { ORGANISATION_MEMBERS } from './limits.js';

export interface CreateInvitationInput {
	inviterUserId: string;
	organisationId: string;
	email: string;
	assignments: GrantRow[];
	headers: Headers;
}

export interface CreatedInvitation {
	invitationId: string;
	email: string;
	emailDelivered: boolean;
}

export async function createBrandInvitation(input: CreateInvitationInput): Promise<CreatedInvitation> {
	if (input.assignments.length === 0) {
		throw new APIError('BAD_REQUEST', { message: 'An invitation must target at least one brand' });
	}
	if (new Set(input.assignments.map((assignment) => assignment.brandId)).size !== input.assignments.length) {
		throw new APIError('BAD_REQUEST', { message: 'A brand can only appear once in an invitation' });
	}
	const session = await auth.api.getSession({ headers: input.headers });
	if (!session?.user || session.user.id !== input.inviterUserId) {
		throw new APIError('UNAUTHORIZED', { message: 'Invitation actor does not match the authenticated session' });
	}
	const recipientEmail = input.email.trim().toLowerCase();
	if (!recipientEmail || !session.user.emailVerified && recipientEmail === session.user.email.trim().toLowerCase()) {
		throw new APIError('FORBIDDEN', { message: 'A verified recipient email is required' });
	}

	// Inviter authority, checked at creation (§7) and again at activation.
	const inviterMembership = await findMembership(input.inviterUserId, input.organisationId);
	if (!inviterMembership || !membershipIsAdminOrOwner(inviterMembership)) {
		throw new APIError('FORBIDDEN', { message: 'Not allowed to invite to this organisation' });
	}

	// Server-side capacity pre-check (§11.2); re-enforced under lock at activation.
	const memberCount = await countOrganisationMembers(input.organisationId);
	if (memberCount + 1 > ORGANISATION_MEMBERS) {
		throw new APIError('FORBIDDEN', { message: 'Organisation member limit reached' });
	}

	// Brand grants must target active brands of the invited organisation.
	const db = await getDB();
	const { rows: validBrands } = await db.query<{ id: string }>(
		`SELECT "id" FROM "brand"
		 WHERE "id" = ANY($1) AND "organisation_id" = $2 AND "status" = 'active'`,
		[input.assignments.map((a) => a.brandId), input.organisationId]
	);
	const validIds = new Set(validBrands.map((b) => b.id));
	for (const assignment of input.assignments) {
		if (!validIds.has(assignment.brandId)) {
			throw new APIError('FORBIDDEN', { message: 'Brand does not belong to this organisation' });
		}
		if (!(await canGrantBrand(input.inviterUserId, input.organisationId, assignment.brandId))) {
			throw new APIError('FORBIDDEN', { message: 'Not allowed to grant access to this brand' });
		}
	}

	// Plugin invitation. Org role is always 'member': owner/admin promotion is
	// an owner-authorised flow and must not be smuggled into an invitation (§6.2).
	const invitation = await organizationApi().createInvitation({
		body: {
			email: recipientEmail,
			role: 'member',
			organizationId: input.organisationId,
			resend: false
		},
		headers: input.headers
	});

	// The afterCreateInvitation hook has persisted the provisioning record.
	try {
		await addGrantsToProvisioning({
			invitationId: invitation.id,
			organisationId: input.organisationId,
			inviterUserId: input.inviterUserId,
			grants: input.assignments
		});
	} catch (error) {
		await organizationApi().cancelInvitation({ body: { invitationId: invitation.id }, headers: input.headers }).catch(() => undefined);
		await cancelProvisioning({
			invitationId: invitation.id,
			organisationId: input.organisationId,
			actorUserId: input.inviterUserId,
			reason: 'grant_attachment_failed'
		});
		throw error;
	}

	const emailDelivered = await deliverInvitationEmail({
		invitationId: invitation.id,
		email: recipientEmail,
		roles: input.assignments.map((a) => a.role)
	});

	await writeAuditEvent({
		organisationId: input.organisationId,
		actorUserId: input.inviterUserId,
		action: 'invitation.created',
		resourceType: 'invitation',
		resourceId: invitation.id,
		metadata: { recipient: recipientEmail, assignments: input.assignments, emailDelivered }
	});

	return { invitationId: invitation.id, email: recipientEmail, emailDelivered };
}

async function deliverInvitationEmail(params: {
	invitationId: string;
	email: string;
	roles: string[];
}): Promise<boolean> {
	const siteUrl = typeof publicEnv.PUBLIC_SITE_URL === 'string' ? publicEnv.PUBLIC_SITE_URL : '';
	const inviteUrl = `${siteUrl}/invite/${params.invitationId}`;
	try {
		await sendTemplateEmail('admin-invite', {
			email: params.email,
			inviteUrl,
			roleName: params.roles.join(', ')
		});
		return true;
	} catch (error) {
		// Delivery failure never grants access; the invitation stays
		// pending_acceptance and can be resent (§7.1).
		logger.error('[invitations] delivery failed', {
			invitationId: params.invitationId,
			error: error instanceof Error ? error.message : String(error)
		});
		return false;
	}
}

/** Resend delivery for a pending invitation (authorised recovery action). */
export async function resendInvitationEmail(params: {
	invitationId: string;
	actorUserId: string;
	organisationId: string;
	headers: Headers;
}): Promise<boolean> {
	await assertSessionActor(params.headers, params.actorUserId);
	const membership = await findMembership(params.actorUserId, params.organisationId);
	if (!membership || !membershipIsAdminOrOwner(membership)) {
		throw new APIError('FORBIDDEN', { message: 'Not allowed to resend this invitation' });
	}
	const db = await getDB();
	const { rows } = await db.query<{ recipientEmail: string }>(
		`SELECT "recipient_email" AS "recipientEmail" FROM "invitation_provisioning"
		 WHERE "invitation_id" = $1 AND "organisation_id" = $2
		   AND "state" = 'pending_acceptance' LIMIT 1`,
		[params.invitationId, params.organisationId]
	);
	const record = rows[0];
	if (!record) throw new APIError('NOT_FOUND', { message: 'Invitation is not pending' });

	const delivered = await deliverInvitationEmail({
		invitationId: params.invitationId,
		email: record.recipientEmail,
		roles: []
	});
	await writeAuditEvent({
		organisationId: params.organisationId,
		actorUserId: params.actorUserId,
		action: 'invitation.resent',
		resourceType: 'invitation',
		resourceId: params.invitationId,
		metadata: { emailDelivered: delivered }
	});
	return delivered;
}

/** Cancel a pending invitation (inviter withdrawing). */
export async function cancelBrandInvitation(params: {
	invitationId: string;
	actorUserId: string;
	organisationId: string;
	headers: Headers;
}): Promise<void> {
	await assertSessionActor(params.headers, params.actorUserId);
	const membership = await findMembership(params.actorUserId, params.organisationId);
	if (!membership || !membershipIsAdminOrOwner(membership)) {
		throw new APIError('FORBIDDEN', { message: 'Not allowed to cancel this invitation' });
	}
	// Cancel the plugin invitation with the inviter's session; the
	// provisioning cancel below is authoritative either way — a cancelled
	// provisioning record blocks acceptance (guardInvitationAcceptance).
	await organizationApi()
		.cancelInvitation({ body: { invitationId: params.invitationId }, headers: params.headers })
		.catch(() => undefined);
	await cancelProvisioning({
		invitationId: params.invitationId,
		organisationId: params.organisationId,
		actorUserId: params.actorUserId,
		reason: 'cancelled_by_inviter'
	});
}

async function assertSessionActor(headers: Headers, actorUserId: string): Promise<void> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user || session.user.id !== actorUserId) {
		throw new APIError('UNAUTHORIZED', { message: 'Invitation actor does not match the authenticated session' });
	}
}
