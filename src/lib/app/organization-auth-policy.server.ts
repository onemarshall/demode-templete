import { APIError } from 'better-auth/api';
import { findMembership, membershipHasRole } from '#lib/modules/tenancy/server/better-auth-adapter.js';
import { onInvitationCreated, guardInvitationAcceptance, onInvitationAccepted, cancelProvisioning } from '#lib/modules/tenancy/server/provisioning.js';
import { cascadeMembershipRemoval, auditMembershipChange } from '#lib/modules/tenancy/server/cascade.js';
import type { AuthIntegrations } from '#lib/modules/auth/server/integrations.js';

export const appOrganizationHooks: AuthIntegrations['organizationHooks'] = {
  beforeCreateInvitation: async ({ invitation, inviter, organization }) => {
    const membership = await findMembership(inviter.id, organization.id);
    if (!membership || !['member', 'admin'].includes(invitation.role) ||
      (invitation.role === 'admin' && !membershipHasRole(membership, 'owner'))) {
      throw new APIError('FORBIDDEN', { message: 'This organisation role requires an owner-authorised operation.' });
    }
  },
  afterCancelInvitation: async ({ invitation, cancelledBy, organization }) => {
    await cancelProvisioning({ invitationId: invitation.id, organisationId: organization.id, actorUserId: cancelledBy.id, reason: 'cancelled' });
  },
  afterRejectInvitation: async ({ invitation, user, organization }) => {
    await cancelProvisioning({ invitationId: invitation.id, organisationId: organization.id, actorUserId: user.id, reason: 'rejected' });
  },
  afterCreateInvitation: onInvitationCreated,
  beforeAcceptInvitation: guardInvitationAcceptance,
  afterAcceptInvitation: onInvitationAccepted,
  afterAddMember: auditMembershipChange,
  afterRemoveMember: cascadeMembershipRemoval,
};

