/**
 * Consultant authority.
 *
 * A Langfell consultant does not become a client brand member. Access is an
 * engagement-scoped grant with a role and an expiry. Every consultant route and
 * action passes through this guard; the client brand-role matrix is untouched.
 */

import { getDB } from '#lib/platform/database/db.js';
import { findBrandRow } from '#lib/modules/tenancy/server/context.js';

export type ConsultantRole = 'reviewer' | 'strategist' | 'publisher';
export type ConsultantAction = 'read' | 'review' | 'approve' | 'publish';

export class ConsultantAccessError extends Error {
	constructor() {
		super('Consultant access denied');
		this.name = 'ConsultantAccessError';
	}
}

export interface ConsultantGrant {
	id: string;
	engagementId: string;
	organisationId: string;
	brandId: string;
	role: ConsultantRole;
}

export interface ConsultantEngagement {
	id: string;
	organisationId: string;
	brandId: string;
	brandName: string;
	productKey: string;
	family: string;
	deliveryRoute: string;
	status: string;
	assignedStrategist: string | null;
	engineJobId: string | null;
	engineRunRef: string | null;
	intake: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

const ENGAGEMENT_COLUMNS = `e."id", e."organisation_id" AS "organisationId", e."brand_id" AS "brandId",
	e."product_key" AS "productKey", e."family",
	e."delivery_route" AS "deliveryRoute", e."status",
	e."assigned_strategist" AS "assignedStrategist",
	e."engine_job_id" AS "engineJobId", e."engine_run_ref" AS "engineRunRef",
	e."intake", e."created_at" AS "createdAt", e."updated_at" AS "updatedAt"`;

/**
 * Resolve brand names through the tenancy layer.
 *
 * The brand table is not this module's to read. A brand that no longer sits in
 * the engagement's organisation is treated as absent, which is what the join it
 * replaces did.
 */
async function resolveBrandNames(
	rows: ReadonlyArray<{ brandId: string; organisationId: string }>
): Promise<Map<string, string>> {
	const names = new Map<string, string>();
	for (const { brandId, organisationId } of rows) {
		if (names.has(brandId)) continue;
		const brand = await findBrandRow(brandId);
		if (brand && brand.organisationId === organisationId) names.set(brandId, brand.name);
	}
	return names;
}

export async function findConsultantGrant(
	userId: string,
	engagementId: string
): Promise<ConsultantGrant | null> {
	const db = await getDB();
	const { rows } = await db.query<ConsultantGrant>(
		`SELECT "id", "engagement_id" AS "engagementId",
		        "organisation_id" AS "organisationId", "brand_id" AS "brandId", "role"
		 FROM "consultant_grant"
		 WHERE "user_id" = $1 AND "engagement_id" = $2
		   AND "status" = 'active'
		   AND ("expires_at" IS NULL OR "expires_at" > now())
		 LIMIT 1`,
		[userId, engagementId]
	);
	return rows[0] ?? null;
}

export async function requireConsultantAccess(
	userId: string,
	engagementId: string,
	action: ConsultantAction
): Promise<ConsultantGrant> {
	const grant = await findConsultantGrant(userId, engagementId);
	if (!grant) throw new ConsultantAccessError();
	const allowed =
		action === 'read' || action === 'review'
			? ['reviewer', 'strategist', 'publisher'].includes(grant.role)
			: action === 'approve'
				? ['strategist', 'publisher'].includes(grant.role)
				: grant.role === 'publisher';
	if (!allowed) throw new ConsultantAccessError();
	return grant;
}

export async function listConsultantEngagements(
	userId: string
): Promise<Array<ConsultantEngagement & { grantRole: ConsultantRole }>> {
	const db = await getDB();
	const { rows } = await db.query<ConsultantEngagement & { grantRole: ConsultantRole }>(
		`SELECT ${ENGAGEMENT_COLUMNS}, g."role" AS "grantRole"
		 FROM "consultant_grant" g
		 JOIN "diagnostic_engagement" e ON e."id" = g."engagement_id"
		 WHERE g."user_id" = $1 AND g."status" = 'active'
		   AND (g."expires_at" IS NULL OR g."expires_at" > now())
		 ORDER BY e."updated_at" DESC
		 LIMIT 100`,
		[userId]
	);
	const names = await resolveBrandNames(rows);
	return rows.flatMap((row) => {
		const brandName = names.get(row.brandId);
		return brandName ? [{ ...row, brandName }] : [];
	});
}

export async function loadConsultantEngagement(
	engagementId: string
): Promise<ConsultantEngagement | null> {
	const db = await getDB();
	const { rows } = await db.query<ConsultantEngagement>(
		`SELECT ${ENGAGEMENT_COLUMNS}
		 FROM "diagnostic_engagement" e
		 WHERE e."id" = $1
		 LIMIT 1`,
		[engagementId]
	);
	const row = rows[0];
	if (!row) return null;
	const brandName = (await resolveBrandNames([row])).get(row.brandId);
	return brandName ? { ...row, brandName } : null;
}

/** True when the user holds at least one live grant. Used by the layout guard. */
export async function hasConsultantAccess(userId: string): Promise<boolean> {
	const db = await getDB();
	const { rows } = await db.query<{ present: boolean }>(
		`SELECT EXISTS (
		   SELECT 1 FROM "consultant_grant"
		   WHERE "user_id" = $1 AND "status" = 'active'
		     AND ("expires_at" IS NULL OR "expires_at" > now())
		 ) AS "present"`,
		[userId]
	);
	return Boolean(rows[0]?.present);
}

export interface ConsultantGrantAdminView {
	id: string;
	userId: string;
	userEmail: string | null;
	engagementId: string;
	brandName: string;
	family: string;
	role: ConsultantRole;
	status: string;
	expiresAt: string | null;
	createdAt: string;
}

export async function listAllConsultantGrants(): Promise<ConsultantGrantAdminView[]> {
	const db = await getDB();
	const { rows } = await db.query<{
		id: string;
		userId: string;
		userEmail: string | null;
		engagementId: string;
		brandId: string;
		organisationId: string;
		family: string;
		role: ConsultantRole;
		status: string;
		expiresAt: Date | string | null;
		createdAt: Date | string;
	}>(
		`SELECT g."id", g."user_id" AS "userId", u."email" AS "userEmail",
		        g."engagement_id" AS "engagementId", e."brand_id" AS "brandId",
		        e."organisation_id" AS "organisationId", e."family", g."role", g."status",
		        g."expires_at" AS "expiresAt", g."created_at" AS "createdAt"
		 FROM "consultant_grant" g
		 JOIN "user" u ON u."id" = g."user_id"
		 JOIN "diagnostic_engagement" e ON e."id" = g."engagement_id"
		 ORDER BY g."created_at" DESC
		 LIMIT 200`
	);
	const names = await resolveBrandNames(rows);
	const iso = (value: Date | string | null) =>
		value == null ? null : value instanceof Date ? value.toISOString() : value;
	return rows.flatMap((row) => {
		const brandName = names.get(row.brandId);
		if (!brandName) return [];
		return [
			{
				id: row.id,
				userId: row.userId,
				userEmail: row.userEmail,
				engagementId: row.engagementId,
				brandName,
				family: row.family,
				role: row.role,
				status: row.status,
				expiresAt: iso(row.expiresAt),
				createdAt: iso(row.createdAt) ?? ''
			}
		];
	});
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
	const db = await getDB();
	const { rows } = await db.query<{ id: string }>(
		`SELECT "id" FROM "user" WHERE lower("email") = lower($1) LIMIT 1`,
		[email.trim()]
	);
	return rows[0]?.id ?? null;
}

export interface CreateGrantInput {
	userId: string;
	engagementId: string;
	role: ConsultantRole;
	grantedBy: string;
	expiresAt?: string | null;
}

export async function createConsultantGrant(input: CreateGrantInput): Promise<string> {
	if (!['reviewer', 'strategist', 'publisher'].includes(input.role))
		throw new Error('Choose a reviewer, strategist or publisher role.');
	const engagement = await loadConsultantEngagement(input.engagementId);
	if (!engagement) throw new Error('Engagement not found.');
	const db = await getDB();
	const id = `cg_${crypto.randomUUID()}`;
	await db.query(
		`INSERT INTO "consultant_grant"
		   ("id", "user_id", "organisation_id", "brand_id", "engagement_id",
		    "role", "status", "granted_by", "expires_at")
		 VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
		 ON CONFLICT ("user_id", "engagement_id") DO UPDATE
		 SET "role" = EXCLUDED."role", "status" = 'active',
		     "expires_at" = EXCLUDED."expires_at", "granted_by" = EXCLUDED."granted_by"`,
		[
			id,
			input.userId,
			engagement.organisationId,
			engagement.brandId,
			engagement.id,
			input.role,
			input.grantedBy,
			input.expiresAt || null
		]
	);
	return id;
}

export async function revokeConsultantGrant(
	grantId: string,
	revokedBy: string
): Promise<void> {
	const db = await getDB();
	await db.query(
		`UPDATE "consultant_grant"
		 SET "status" = 'revoked'
		 WHERE "id" = $1 AND "status" = 'active'`,
		[grantId]
	);
	// The grant row keeps its history; the actor is retained by the caller's
	// audit trail rather than overwritten on the row.
	void revokedBy;
}
