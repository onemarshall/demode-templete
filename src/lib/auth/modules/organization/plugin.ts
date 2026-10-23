/**
 * Organization Plugin — Montsel tenancy foundation (spec §1, Appendix B).
 *
 * Configuration decisions recorded in Appendix B.3 / Appendix C:
 * - requireEmailVerificationOnInvitation: true (B.3 #4 — verified email is
 *   required for by-ID invitation actions regardless of ID generator)
 * - disableOrganizationDeletion: true (B.3 #6 — §11.1)
 * - cancelPendingInvitationsOnReInvite: true (D.6 — one invitation ID per
 *   provisioning lifecycle)
 * - teams and dynamic access control stay disabled in Phase 1 (B.1)
 * - sendInvitationEmail is a no-op: delivery is Montsel's responsibility
 *   after the provisioning record is persisted (§7.1)
 */

import { organization as betterAuthOrganization } from "better-auth/plugins";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { findMembership, membershipHasRole } from "#lib/server/workspace/better-auth-adapter.js";
import { logger } from "#lib/auth/shared/logger.js";
import { ac, owner, admin, member } from "./permissions.js";
import {
  onInvitationCreated,
  guardInvitationAcceptance,
  onInvitationAccepted,
  cancelProvisioning,
} from "#lib/server/workspace/provisioning.js";
import { cascadeMembershipRemoval, auditMembershipChange } from "#lib/server/workspace/cascade.js";

interface OrganizationEnv {
  AUTH_ORGANIZATION_PLUGIN?: boolean;
}

export function OrganizationPlugin(env: OrganizationEnv): BetterAuthPlugin | null {
  if (!env.AUTH_ORGANIZATION_PLUGIN) {
    return null;
  }
  logger.debug("Organization plugin enabled (server flag)");

  const plugin = betterAuthOrganization({
    ac,
    roles: { owner, admin, member },
    // Phase 1 (D4): any user may create organisations; per-user limit is
    // enforced server-side in onboarding/creation paths.
    allowUserToCreateOrganization: true,
    organizationLimit: 10,
    membershipLimit: 100,
    requireEmailVerificationOnInvitation: true,
    disableOrganizationDeletion: true,
    cancelPendingInvitationsOnReInvite: true,
    async sendInvitationEmail() {
      // Delivery happens in the Montsel invitation service after the
      // provisioning record and grants are persisted (§7.1).
    },
    organizationHooks: {
      beforeCreateInvitation: async ({ invitation, inviter, organization }) => {
        const membership = await findMembership(inviter.id, organization.id);
        if (
          !membership ||
          !["member", "admin"].includes(invitation.role) ||
          (invitation.role === "admin" && !membershipHasRole(membership, "owner"))
        ) {
          throw new APIError("FORBIDDEN", {
            message: "This organisation role requires an owner-authorised operation.",
          });
        }
      },
      afterCancelInvitation: async ({ invitation, cancelledBy, organization }) => {
        await cancelProvisioning({
          invitationId: invitation.id,
          organisationId: organization.id,
          actorUserId: cancelledBy.id,
          reason: "cancelled",
        });
      },
      afterRejectInvitation: async ({ invitation, user, organization }) => {
        await cancelProvisioning({
          invitationId: invitation.id,
          organisationId: organization.id,
          actorUserId: user.id,
          reason: "rejected",
        });
      },
      afterCreateInvitation: onInvitationCreated,
      beforeAcceptInvitation: guardInvitationAcceptance,
      afterAcceptInvitation: onInvitationAccepted,
      afterAddMember: auditMembershipChange,
      afterRemoveMember: cascadeMembershipRemoval,
    },
  });
  // Native endpoints perform unlocked last-owner checks. All such writes go
  // through Montsel's transaction; no HTTP or server API bypass is allowed.
  return {
    ...plugin,
    hooks: {
      ...(plugin as BetterAuthPlugin).hooks,
      before: [
        ...((plugin as BetterAuthPlugin).hooks?.before ?? []),
        {
          matcher: (ctx) =>
            [
              "/organization/update-member-role",
              "/organization/remove-member",
              "/organization/leave",
              "/organization/add-member",
            ].includes(ctx.path ?? "") ||
            (ctx as { operationId?: string }).operationId === "addOrganizationMember",
          handler: createAuthMiddleware(async () => {
            throw new APIError("FORBIDDEN", {
              message: "Use organisation settings for membership and ownership changes.",
            });
          }),
        },
      ],
    },
  };
}
