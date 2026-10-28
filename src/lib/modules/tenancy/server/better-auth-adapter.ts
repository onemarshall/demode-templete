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

import { getDB, type DatabaseReader } from "#lib/platform/database/db.js";

type PoolClient = import("pg").PoolClient;

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
  client?: PoolClient | DatabaseReader,
  options: { lock?: boolean } = {},
): Promise<OrgMembershipRow | null> {
  if (options.lock && !client) throw new Error("Authority locks require a transaction");
  const sql = `SELECT "id", "organizationId", "userId", "role", "createdAt"
		 FROM "member" WHERE "userId" = $1 AND "organizationId" = $2 LIMIT 1${options.lock ? " FOR SHARE" : ""}`;
  const db = client ? null : await getDB();
  const { rows } = (await (client ?? db!).query(sql, [userId, organisationId])) as {
    rows: OrgMembershipRow[];
  };
  return rows[0] ?? null;
}

export async function findOrganisation(organisationId: string): Promise<OrganisationRow | null> {
  const db = await getDB();
  const { rows } = await db.query<OrganisationRow>(
    `SELECT "id", "name", "slug", "metadata", "createdAt"
		 FROM "organization" WHERE "id" = $1 LIMIT 1`,
    [organisationId],
  );
  return rows[0] ?? null;
}

/** Retained ownership mapping survives Better Auth member deletion. */
export async function getPersonalOrganisationOwner(
  organisationId: string,
  client?: DatabaseReader,
  options: { lock?: boolean } = {},
): Promise<string | null> {
  if (options.lock && !client) throw new Error("Authority locks require a transaction");
  const db = client ?? (await getDB());
  const result = await db.query(
    `SELECT "owner_user_id" AS "ownerUserId"
		 FROM "personal_organisation_owner" p
		 JOIN "member" m ON m."organizationId" = p."organisation_id" AND m."userId" = p."owner_user_id"
		 WHERE p."organisation_id" = $1 AND m."role" ~ '(^|,)owner(,|$)' LIMIT 1${options.lock ? " FOR SHARE OF p, m" : ""}`,
    [organisationId],
  );
  const { rows } = result as { rows: { ownerUserId: string }[] };
  return rows[0]?.ownerUserId ?? null;
}

export async function findOrganisationBySlug(slug: string): Promise<OrganisationRow | null> {
  const db = await getDB();
  const { rows } = await db.query<OrganisationRow>(
    `SELECT "id", "name", "slug", "metadata", "createdAt"
		 FROM "organization" WHERE "slug" = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ?? null;
}

const ORG_SLUG_SUFFIX_LIMIT = 25;

function slugifyOrganisationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Derives a free URL slug from a display name. Returns null if no candidate is available. */
export async function uniqueOrganisationSlug(name: string): Promise<string | null> {
  const base = slugifyOrganisationName(name);
  if (!base) return null;
  for (let suffix = 0; suffix <= ORG_SLUG_SUFFIX_LIMIT; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    if (!(await findOrganisationBySlug(candidate))) return candidate;
  }
  return null;
}

export async function listUserOrganisations(
  userId: string,
): Promise<(OrganisationRow & { role: string })[]> {
  const db = await getDB();
  const { rows } = await db.query<OrganisationRow & { role: string }>(
    `SELECT o."id", o."name", o."slug", o."metadata", o."createdAt", m."role"
		 FROM "organization" o
		 JOIN "member" m ON m."organizationId" = o."id"
		 WHERE m."userId" = $1
		 ORDER BY o."createdAt" ASC`,
    [userId],
  );
  return rows;
}

export async function countOrganisationOwners(
  organisationId: string,
  client?: PoolClient,
): Promise<number> {
  const sql = `SELECT count(*) AS count FROM "member"
		 WHERE "organizationId" = $1 AND "role" ~ $2`;
  const db = client ? null : await getDB();
  const { rows } = await (client ?? db!).query<{ count: string }>(sql, [
    organisationId,
    OWNER_ROLE_PATTERN,
  ]);
  return Number(rows[0]?.count ?? 0);
}

export async function countOrganisationMembers(
  organisationId: string,
  client?: PoolClient,
): Promise<number> {
  const sql = `SELECT count(*) AS count FROM "member" WHERE "organizationId" = $1`;
  const db = client ? null : await getDB();
  const { rows } = await (client ?? db!).query<{ count: string }>(sql, [organisationId]);
  return Number(rows[0]?.count ?? 0);
}

export function membershipHasRole(membership: OrgMembershipRow, role: string): boolean {
  return membership.role
    .split(",")
    .map((r) => r.trim())
    .includes(role);
}

export function membershipIsAdminOrOwner(membership: OrgMembershipRow): boolean {
  return membershipHasRole(membership, "owner") || membershipHasRole(membership, "admin");
}

/** Current actor identity for durable service operations. This is deliberately
 * inside the version-pinned Better Auth adapter rather than feature SQL. */
export async function findCurrentUserIdentity(
  userId: string,
  client?: DatabaseReader,
  options: { lock?: boolean } = {},
): Promise<{ id: string; name: string } | null> {
  if (options.lock && !client) throw new Error("Authority locks require a transaction");
  const db = client ?? (await getDB());
  const result = (await db.query(
    `SELECT "id", "name" FROM "user" WHERE "id"=$1 AND COALESCE("banned",false)=false${options.lock ? " FOR SHARE" : ""}`,
    [userId],
  )) as { rows: { id: string; name: string }[] };
  const user = result.rows[0];
  return user?.name?.trim() ? user : null;
}
