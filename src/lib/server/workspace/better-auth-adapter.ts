/**
 * Version-pinned adapter for Better Auth's organisation plugin tables (§6.4).
 *
 * This is the ONLY module permitted to know the plugin's table and column
 * names. Verified against better-auth@1.7.12 (Appendix B.1); a schema-drift
 * test fails the build if the installed plugin's organisation schema changes.
 * Montsel reads membership directly (never-cache, §6.4) — the server-API
 * alternative was rejected as hot-path coupling.
 *
 * Functions accept an optional PoolClient so in-transaction checks (advisory
 * locks, limit enforcement, owner counts) run on the transaction's own
 * connection.
 */

import { getDB } from '#lib/auth/server/database/db.js';

type PoolClient = import('pg').PoolClient;

export interface OrgMembershipRow {
	id: string;
	organizationId: string;
	userId: string;
	role: string;
	createdAt: Date;
}

export interface OrganisationRow {
	id: string;
	name: string;
	slug: string;
	metadata: string | null;
	createdAt: Date;
}

const OWNER_ROLE_PATTERN = `(^|,)owner(,|$)`;

export async function findMembership(
	userId: string,
	organisationId: string,
	client?: PoolClient
): Promise<OrgMembershipRow | null> {
	const sql = `SELECT "id", "organizationId", "userId", "role", "createdAt"
		 FROM "member" WHERE "userId" = $1 AND "organizationId" = $2 LIMIT 1`;
	const db = client ? null : await getDB();
	const { rows } = await (client ?? db!).query<OrgMembershipRow>(sql, [userId, organisationId]);
	return rows[0] ?? null;
}

export async function findOrganisation(organisationId: string): Promise<OrganisationRow | null> {
	const db = await getDB();
	const { rows } = await db.query<OrganisationRow>(
		`SELECT "id", "name", "slug", "metadata", "createdAt"
		 FROM "organization" WHERE "id" = $1 LIMIT 1`,
		[organisationId]
	);
	return rows[0] ?? null;
}

/** Retained ownership mapping survives Better Auth member deletion. */
export async function getPersonalOrganisationOwner(organisationId: string): Promise<string | null> {
	const db = await getDB();
	const { rows } = await db.query<{ ownerUserId: string }>(
		`SELECT "owner_user_id" AS "ownerUserId"
		 FROM "personal_organisation_owner" p
		 JOIN "member" m ON m."organizationId" = p."organisation_id" AND m."userId" = p."owner_user_id"
		 WHERE p."organisation_id" = $1 AND m."role" ~ '(^|,)owner(,|$)' LIMIT 1`,
		[organisationId]
	);
	return rows[0]?.ownerUserId ?? null;
}

export async function findOrganisationBySlug(slug: string): Promise<OrganisationRow | null> {
	const db = await getDB();
	const { rows } = await db.query<OrganisationRow>(
		`SELECT "id", "name", "slug", "metadata", "createdAt"
		 FROM "organization" WHERE "slug" = $1 LIMIT 1`,
		[slug]
	);
	return rows[0] ?? null;
}

export async function listUserOrganisations(userId: string): Promise<OrganisationRow[]> {
	const db = await getDB();
	const { rows } = await db.query<OrganisationRow>(
		`SELECT o."id", o."name", o."slug", o."metadata", o."createdAt"
		 FROM "organization" o
		 JOIN "member" m ON m."organizationId" = o."id"
		 WHERE m."userId" = $1
		 ORDER BY o."createdAt" ASC`,
		[userId]
	);
	return rows;
}

export async function countOrganisationOwners(
	organisationId: string,
	client?: PoolClient
): Promise<number> {
	const sql = `SELECT count(*) AS count FROM "member"
		 WHERE "organizationId" = $1 AND "role" ~ $2`;
	const db = client ? null : await getDB();
	const { rows } = await (client ?? db!).query<{ count: string }>(sql, [organisationId, OWNER_ROLE_PATTERN]);
	return Number(rows[0]?.count ?? 0);
}

export async function countOrganisationMembers(
	organisationId: string,
	client?: PoolClient
): Promise<number> {
	const sql = `SELECT count(*) AS count FROM "member" WHERE "organizationId" = $1`;
	const db = client ? null : await getDB();
	const { rows } = await (client ?? db!).query<{ count: string }>(sql, [organisationId]);
	return Number(rows[0]?.count ?? 0);
}

export function membershipHasRole(membership: OrgMembershipRow, role: string): boolean {
	return membership.role.split(',').map((r) => r.trim()).includes(role);
}

export function membershipIsAdminOrOwner(membership: OrgMembershipRow): boolean {
	return membershipHasRole(membership, 'owner') || membershipHasRole(membership, 'admin');
}
