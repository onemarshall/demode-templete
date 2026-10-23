/**
 * Revocation cascade and membership audit (spec §7.2, Appendix D.4).
 *
 * Trigger: member row deleted (leave, remove, administrator removal, account
 * deletion). Denial is immediate by validation (§6.4 never-cache) — the
 * follow-up cleanup below is asynchronous, idempotent and never relied upon
 * for denial. Fallback cleanup failures are logged and audited; the primary lifecycle service commits cleanup with membership removal.
 */

import { withTransaction } from '#lib/auth/server/database/db.js';
import { logger } from '#lib/auth/shared/logger.js';
import { writeAuditEvent } from './audit.js';

/**
 * afterRemoveMember hook: deactivate the removed user's assignments across
 * the organisation's workspaces, cancel their pending provisioning, audit.
 */
export async function cascadeMembershipRemoval(data: {
	member: { userId: string; organizationId: string };
	user?: { id: string; email: string };
}): Promise<void> {
	const userId = data.member.userId;
	const organisationId = data.member.organizationId;
	try {
		await withTransaction(async (client) => {
			await client.query(
				`UPDATE "workspace_member" wm
				 SET "status" = 'revoked', "updated_at" = now()
				 WHERE wm."user_id" = $1
				   AND wm."status" IN ('active', 'pending_provisioning')
				   AND wm."workspace_id" IN (
					   SELECT "id" FROM "workspace" WHERE "organisation_id" = $2
				   )`,
				[userId, organisationId]
			);
			await client.query(
				`UPDATE "invitation_provisioning" p
				 SET "state" = 'cancelled', "updated_at" = now()
				 WHERE p."organisation_id" = $2
				   AND p."state" IN ('pending_acceptance', 'provisioning', 'retry_pending')
				   AND (p."recipient_user_id" = $1 OR p."recipient_email" = $3)`,
				[userId, organisationId, data.user?.email ?? '']
			);
			await writeAuditEvent(
				{
					organisationId,
					actorType: 'system',
					action: 'membership.removed_cascade',
					resourceType: 'member',
					resourceId: userId,
					metadata: { organisationId }
				},
				client
			);
		});
	} catch (error) {
		// Never relied upon for denial; the primary lifecycle service performs atomic cleanup.
		logger.error('[cascade] membership removal cleanup failed', {
			userId,
			organisationId,
			error: error instanceof Error ? error.message : String(error)
		});
		await writeAuditEvent({
			organisationId,
			actorType: 'system',
			action: 'membership.removed_cascade_failed',
			resourceType: 'member',
			resourceId: userId,
			outcome: 'error',
			metadata: { error: error instanceof Error ? error.message : String(error) }
		});
	}
}

/**
 * afterAddMember hook: audit direct membership additions (server-side
 * addMember, backfill, onboarding).
 */
export async function auditMembershipChange(data: {
	member: { userId: string; organizationId: string; role: string };
	user?: { id: string };
}): Promise<void> {
	try {
		await writeAuditEvent({
			organisationId: data.member.organizationId,
			actorUserId: data.user?.id ?? data.member.userId,
			action: 'membership.added',
			resourceType: 'member',
			resourceId: data.member.userId,
			metadata: { role: data.member.role }
		});
	} catch (error) {
		logger.error('[cascade] membership audit failed', {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
