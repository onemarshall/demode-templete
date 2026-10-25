/**
 * Audit event writer and reader (spec §12).
 *
 * Records consequential actions: membership, permissions, overrides,
 * approvals, exports, application grants and deletion. Never records
 * credentials, session/access tokens, recovery codes or unrestricted
 * request bodies.
 */

import { randomUUID } from 'crypto';
import { getDB } from '#lib/platform/database/db.js';
import type { OperationContext } from './context.js';
import { assertOperationAction } from './context.js';
import { findMembership, membershipIsAdminOrOwner } from './better-auth-adapter.js';
import { BrandAccessError } from './errors.js';

export type AuditActorType = 'user' | 'system' | 'service';
export type AuditOutcome = 'success' | 'denied' | 'error';

export interface AuditEventInput {
	organisationId: string;
	brandId?: string | null;
	actorUserId?: string | null;
	actorType?: AuditActorType;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	outcome?: AuditOutcome;
	metadata?: Record<string, unknown>;
}

export interface AuditEventRow {
	id: string;
	organisationId: string;
	brandId: string | null;
	actorUserId: string | null;
	actorType: AuditActorType;
	action: string;
	resourceType: string;
	resourceId: string | null;
	outcome: AuditOutcome;
	metadata: Record<string, unknown>;
	createdAt: Date;
}

export async function writeAuditEvent(input: AuditEventInput, client?: import('pg').PoolClient): Promise<void> {
	const id = randomUUID().replace(/-/g, '');
	const params = [
		id,
		input.organisationId,
		input.brandId ?? null,
		input.actorUserId ?? null,
		input.actorType ?? 'user',
		input.action,
		input.resourceType,
		input.resourceId ?? null,
		input.outcome ?? 'success',
		JSON.stringify(input.metadata ?? {})
	];
	const sql = `
		INSERT INTO "audit_event"
			("id", "organisation_id", "brand_id", "actor_user_id", "actor_type",
			 "action", "resource_type", "resource_id", "outcome", "metadata")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`;

	if (client) {
		await client.query(sql, params);
		return;
	}
	const db = await getDB();
	await db.query(sql, params);
}

/**
 * List audit events for a brand. Caller must hold a context carrying
 * `audit:read` (Appendix A: brand admin only).
 */
export async function listBrandAuditEvents(
	ctx: OperationContext,
	options: { limit?: number; offset?: number } = {}
): Promise<AuditEventRow[]> {
	assertOperationAction(ctx, 'audit:read');
	const db = await getDB();
	const { rows } = await db.query<AuditEventRow>(
		`SELECT "id", "organisation_id" AS "organisationId", "brand_id" AS "brandId",
		        "actor_user_id" AS "actorUserId", "actor_type" AS "actorType",
		        "action", "resource_type" AS "resourceType", "resource_id" AS "resourceId",
		        "outcome", "metadata", "created_at" AS "createdAt"
		 FROM "audit_event"
		 WHERE "brand_id" = $1
		 ORDER BY "created_at" DESC
		 LIMIT $2 OFFSET $3`,
		[ctx.brandId, options.limit ?? 50, options.offset ?? 0]
	);
	return rows;
}

/**
 * List organisation-level audit events (null brand) plus events of
 * brands the reader is assigned to. Ordinary membership must not expose
 * events from unassigned brands (§12).
 */
export async function listOrganisationAuditEvents(
	userId: string,
	organisationId: string,
	options: { limit?: number; offset?: number } = {}
): Promise<AuditEventRow[]> {
	const membership = await findMembership(userId, organisationId);
	if (!membership) throw new BrandAccessError();
	const canReadOrganisationEvents = membershipIsAdminOrOwner(membership);
	const db = await getDB();
	const { rows } = await db.query<AuditEventRow>(
		`SELECT "id", "organisation_id" AS "organisationId", "brand_id" AS "brandId",
		        "actor_user_id" AS "actorUserId", "actor_type" AS "actorType",
		        "action", "resource_type" AS "resourceType", "resource_id" AS "resourceId",
		        "outcome", "metadata", "created_at" AS "createdAt"
		 FROM "audit_event" e
		 WHERE e."organisation_id" = $1
		   AND ((e."brand_id" IS NULL AND $3::boolean)
		        OR EXISTS (
			        SELECT 1 FROM "brand_member" wm
			        JOIN "brand" w ON w."id" = wm."brand_id"
			        WHERE w."organisation_id" = e."organisation_id"
			          AND w."status" = 'active'
			          AND wm."brand_id" = e."brand_id"
			          AND wm."user_id" = $2
			          AND wm."status" = 'active'
			          AND wm."role" = 'brand_admin'
			          AND (wm."expires_at" IS NULL OR wm."expires_at" > now())
		        ))
		 ORDER BY "created_at" DESC
		 LIMIT $4 OFFSET $5`,
		[organisationId, userId, canReadOrganisationEvents, options.limit ?? 50, options.offset ?? 0]
	);
	return rows;
}
