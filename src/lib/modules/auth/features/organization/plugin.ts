/**
 * Organization plugin with explicit host tenancy hooks.
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

import { organization as betterAuthOrganization, type OrganizationOptions } from "better-auth/plugins";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { logger } from "#lib/platform/logger.js";
import { ac, owner, admin, member } from "./permissions.js";

export type OrganizationHooks = NonNullable<OrganizationOptions['organizationHooks']>;

interface OrganizationEnv {
  AUTH_ORGANIZATION_PLUGIN?: boolean;
}

export function OrganizationPlugin(env: OrganizationEnv, organizationHooks?: OrganizationHooks): BetterAuthPlugin | null {
  if (!env.AUTH_ORGANIZATION_PLUGIN) {
    return null;
  }
  if (!organizationHooks) throw new Error("Organization plugin requires host organization hooks.");
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
    organizationHooks,
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
