import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { Pool, type PoolClient } from 'pg';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	pool: undefined as unknown,
	getSession: vi.fn(),
	loggerError: vi.fn()
}));

vi.mock('#lib/auth/server/database/db.js', () => ({
	getDB: async () => mocks.pool,
	withTransaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
		const pool = mocks.pool as Pool;
		const client = await pool.connect();
		try {
			await client.query('BEGIN');
			const result = await callback(client);
			await client.query('COMMIT');
			return result;
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	}
}));

vi.mock('#lib/auth/index.js', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('#lib/auth/shared/logger.js', () => ({ logger: { error: mocks.loggerError } }));

import { requireBrandAccess } from '../context.js';
import { BrandAccessError } from '../errors.js';
import {
	addGrantsToProvisioning,
	cancelProvisioning,
	guardInvitationAcceptance,
	onInvitationAccepted,
	processDueProvisioningRetries,
	reconcileAcceptedInvitation,
	retryProvisioning
} from '../provisioning.js';
import { createBrand } from '../brands.js';
import { removeOrganisationMember, transferOwnership } from '../lifecycle.js';

const DATABASE_NAME = 'montsel_phase1_integration';
const DATABASE_URL = process.env.MONTSEL_PHASE1_TEST_DATABASE_URL;
const runPrefix = `phase1-it-${randomUUID().replace(/-/g, '')}`;
let pool: Pool;
let authPool: Pool | undefined;
let enabled = false;

function assertTestDatabase(value: string | undefined): string {
	if (!value) throw new Error('MONTSEL_PHASE1_TEST_DATABASE_URL is required by this integration suite.');
	const url = new URL(value);
	const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Integration suite only permits loopback PostgreSQL.');
	if (decodeURIComponent(url.pathname.replace(/^\//, '')) !== DATABASE_NAME) {
		throw new Error(`Integration database must be named exactly ${DATABASE_NAME}.`);
	}
	return value;
}

async function prepareSchema(url: string): Promise<void> {
	process.env.BETTER_DATABASE_URL = url;
	const { default: auth } = await import(resolveProjectFile('scripts/auth-cli.ts'));
	auth.options.advanced = {
		...auth.options.advanced,
		database: { ...auth.options.advanced?.database, validateSchema: false }
	};
	authPool = auth.options.database as Pool;
	const { getMigrations } = await import('better-auth/db/migration');
	const pluginMigrations = await getMigrations(auth.options);
	if (pluginMigrations.unsafeChanges.length || pluginMigrations.schemaProblems.length) {
		throw new Error([...pluginMigrations.unsafeChanges, ...pluginMigrations.schemaProblems].join('; '));
	}
	await pluginMigrations.runMigrations();
	execFileSync(process.execPath, [resolveProjectFile('scripts/database/migrate.ts')], {
		cwd: process.cwd(),
		env: { ...process.env, BETTER_DATABASE_URL: url },
		stdio: 'inherit'
	});
}

function resolveProjectFile(relativePath: string): string {
	return resolve(process.cwd(), relativePath);
}

async function cleanupPriorFixtures(): Promise<void> {
	const { rows: organisations } = await pool.query<{ id: string }>(
		`SELECT id FROM "organization" WHERE slug LIKE 'phase1-it-%'`
	);
	const { rows: users } = await pool.query<{ id: string }>(
		`SELECT id FROM "user" WHERE email LIKE 'phase1-it-%@example.test'`
	);
	const orgIds = organisations.map((row) => row.id);
	const userIds = users.map((row) => row.id);
	if (orgIds.length) {
		await pool.query(`DELETE FROM "audit_event" WHERE "organisation_id" = ANY($1)`, [orgIds]);
		await pool.query(`DELETE FROM "invitation_provisioning" WHERE "organisation_id" = ANY($1)`, [orgIds]);
		await pool.query(
			`DELETE FROM "brand_member" WHERE "brand_id" IN
			 (SELECT id FROM "brand" WHERE "organisation_id" = ANY($1))`,
			[orgIds]
		);
		await pool.query(`DELETE FROM "user_brand_preference" WHERE "user_id" = ANY($1)`, [userIds]);
		await pool.query(`DELETE FROM "brand" WHERE "organisation_id" = ANY($1)`, [orgIds]);
		await pool.query(`DELETE FROM "personal_organisation_owner" WHERE "organisation_id" = ANY($1)`, [orgIds]);
		await pool.query(`DELETE FROM "invitation" WHERE "organizationId" = ANY($1)`, [orgIds]);
		await pool.query(`DELETE FROM "member" WHERE "organizationId" = ANY($1)`, [orgIds]);
		await pool.query(`DELETE FROM "organization" WHERE id = ANY($1)`, [orgIds]);
	}
	if (userIds.length) await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
}

async function insertUser(label: string, emailVerified = true): Promise<string> {
	const id = `${runPrefix}-${label}`;
	await pool.query(
		`INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4)`,
		[id, label, `${id}@example.test`, emailVerified]
	);
	return id;
}

async function insertOrganisation(label: string, ownerUserId: string): Promise<string> {
	const id = `${runPrefix}-org-${label}`;
	await pool.query(
		`INSERT INTO "organization" (id, name, slug, "createdAt", metadata)
		 VALUES ($1, $2, $3, now(), '{"montsel":{"type":"shared"}}')`,
		[id, label, `phase1-it-${runPrefix}-${label}`]
	);
	await pool.query(
		`INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt")
		 VALUES ($1, $2, $3, 'owner', now())`,
		[`${id}-member-owner`, id, ownerUserId]
	);
	await pool.query(
		`INSERT INTO "personal_organisation_owner" (organisation_id, owner_user_id) VALUES ($1, $2)`,
		[id, ownerUserId]
	);
	return id;
}

async function insertBrand(
	organisationId: string,
	creatorId: string,
	label: string,
	status: 'active' | 'archived' = 'active'
): Promise<string> {
	const id = `${organisationId}-brand-${label}`;
	await pool.query(
		`INSERT INTO "brand" (id, organisation_id, name, slug, created_by, status)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		[id, organisationId, label, label, creatorId, status]
	);
	return id;
}

async function insertMember(organisationId: string, userId: string, role = 'member'): Promise<string> {
	const id = `${organisationId}-member-${userId}`;
	await pool.query(
		`INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt") VALUES ($1, $2, $3, $4, now())`,
		[id, organisationId, userId, role]
	);
	return id;
}

async function insertAssignment(
	brandId: string,
	userId: string,
	role: 'brand_admin' | 'editor' | 'contributor' | 'viewer' = 'viewer',
	status: 'active' | 'revoked' | 'expired' = 'active',
	expiresAt: Date | null = null
): Promise<void> {
	await pool.query(
		`INSERT INTO "brand_member" (id, brand_id, user_id, role, status, expires_at, grant_source, granted_by)
		 VALUES ($1, $2, $3, $4, $5, $6, 'managed', $7)`,
		[`${brandId}-assignment-${userId}`, brandId, userId, role, status, expiresAt, userId]
	);
}

async function createInvitation(organisationId: string, inviterId: string, recipientId: string, label: string) {
	const id = `${runPrefix}-invitation-${label}`;
	const provisioningId = `${id}-provisioning`;
	const email = `${recipientId}@example.test`;
	await pool.query(
		`INSERT INTO "invitation" (id, "organizationId", email, role, status, "inviterId", "expiresAt", "createdAt")
		 VALUES ($1, $2, $3, 'member', 'pending', $4, now() + interval '1 hour', now())`,
		[id, organisationId, email, inviterId]
	);
	await pool.query(
		`INSERT INTO "invitation_provisioning" (id, invitation_id, organisation_id, recipient_email, state, idempotency_key, created_by)
		 VALUES ($1, $2, $3, $4, 'pending_acceptance', $2, $5)`,
		[provisioningId, id, organisationId, email, inviterId]
	);
	return { id, provisioningId, email };
}

async function addBrandGrant(invitationId: string, organisationId: string, inviterId: string, brandIds: string[]) {
	await addGrantsToProvisioning({
		invitationId,
		organisationId,
		inviterUserId: inviterId,
		grants: brandIds.map((brandId) => ({ brandId, role: 'editor' as const }))
	});
}

describe.skipIf(!DATABASE_URL)('Phase 1 PostgreSQL service integration', () => {
	beforeAll(async () => {
		const url = assertTestDatabase(DATABASE_URL);
		pool = new Pool({ connectionString: url, max: 12 });
		const { rows: tables } = await pool.query<{ table_name: string }>(
			`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
		);
		const hasLedger = tables.some((row) => row.table_name === 'schema_migrations');
		if (!hasLedger && tables.length) throw new Error('Test database is not empty; use the dedicated integration database.');
		if (hasLedger) {
			const { rows } = await pool.query<{ version: number }>(`SELECT version FROM schema_migrations ORDER BY version`);
			if (rows.length !== 2 || rows[0]?.version !== 1 || rows[1]?.version !== 2) {
				throw new Error('Test database does not have completed Montsel migrations 1 and 2.');
			}
		}
		await prepareSchema(url);
		mocks.pool = pool;
		await cleanupPriorFixtures();
		enabled = true;
	});

	afterEach(async () => {
		if (enabled) await cleanupPriorFixtures();
	});

	afterAll(async () => {
		if (pool) {
			await cleanupPriorFixtures();
			await pool.end();
		}
		await authPool?.end();
	});

	it('denies cross-tenant, unassigned, archived and expired brand access, and sees revocation on the next request', async () => {
		const ownerA = await insertUser('access-owner-a');
		const ownerB = await insertUser('access-owner-b');
		const unassigned = await insertUser('access-unassigned');
		const orgA = await insertOrganisation('access-a', ownerA);
		const orgB = await insertOrganisation('access-b', ownerB);
		await insertMember(orgA, unassigned);
		await insertMember(orgB, unassigned);
		const active = await insertBrand(orgA, ownerA, 'active');
		const otherTenant = await insertBrand(orgB, ownerB, 'other-tenant');
		const missingAssignment = await insertBrand(orgA, ownerA, 'missing-assignment');
		const archived = await insertBrand(orgA, ownerA, 'archived', 'archived');
		const expired = await insertBrand(orgA, ownerA, 'expired');
		await insertAssignment(active, ownerA, 'brand_admin');
		await insertAssignment(archived, ownerA, 'brand_admin');
		await insertAssignment(expired, ownerA, 'brand_admin', 'active', new Date(Date.now() - 1000));

		await expect(requireBrandAccess(ownerA, otherTenant, 'brand:read')).rejects.toBeInstanceOf(BrandAccessError);
		await expect(requireBrandAccess(unassigned, missingAssignment, 'brand:read')).rejects.toBeInstanceOf(BrandAccessError);
		await expect(requireBrandAccess(ownerA, archived, 'brand:read')).rejects.toBeInstanceOf(BrandAccessError);
		await expect(requireBrandAccess(ownerA, expired, 'brand:read')).rejects.toBeInstanceOf(BrandAccessError);
		await expect(requireBrandAccess(ownerA, active, 'brand:read')).resolves.toMatchObject({ brandId: active });

		await pool.query(`UPDATE "brand_member" SET status = 'revoked' WHERE brand_id = $1 AND user_id = $2`, [active, ownerA]);
		await expect(requireBrandAccess(ownerA, active, 'brand:read')).rejects.toBeInstanceOf(BrandAccessError);
	});

	it('rolls back a partial grant attachment and succeeds on retry', async () => {
		const owner = await insertUser('grant-owner');
		const recipient = await insertUser('grant-recipient');
		const organisationId = await insertOrganisation('grant', owner);
		const firstBrand = await insertBrand(organisationId, owner, 'one');
		const secondBrand = await insertBrand(organisationId, owner, 'two');
		const invitation = await createInvitation(organisationId, owner, recipient, 'rollback');
		const suffix = randomUUID().replace(/-/g, '');
		const functionName = `phase1_fail_grant_audit_${suffix}`;
		const triggerName = `phase1_fail_grant_audit_trigger_${suffix}`;
		await pool.query(`CREATE FUNCTION public."${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$
			BEGIN
				IF NEW."action" = 'invitation.grants_attached' THEN RAISE EXCEPTION 'intentional phase1 integration rollback'; END IF;
				RETURN NEW;
			END
		$$`);
		await pool.query(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "audit_event" FOR EACH ROW EXECUTE FUNCTION public."${functionName}"()`);
		try {
			await expect(addBrandGrant(invitation.id, organisationId, owner, [firstBrand, secondBrand]))
				.rejects.toThrow('intentional phase1 integration rollback');
		} finally {
			await pool.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "audit_event"`);
			await pool.query(`DROP FUNCTION IF EXISTS public."${functionName}"()`);
		}
		const afterRollback = await pool.query<{ count: string }>(
			`SELECT count(*) AS count FROM "invitation_brand_grant" WHERE "provisioning_id" = $1`,
			[invitation.provisioningId]
		);
		expect(Number(afterRollback.rows[0]?.count)).toBe(0);

		await addBrandGrant(invitation.id, organisationId, owner, [firstBrand, secondBrand]);
		const afterRetry = await pool.query<{ count: string }>(
			`SELECT count(*) AS count FROM "invitation_brand_grant" WHERE "provisioning_id" = $1`,
			[invitation.provisioningId]
		);
		expect(Number(afterRetry.rows[0]?.count)).toBe(2);
	});

	it('does not partially activate grants when one selected brand becomes unavailable', async () => {
		const owner = await insertUser('all-grants-owner');
		const recipient = await insertUser('all-grants-recipient');
		const organisationId = await insertOrganisation('all-grants', owner);
		const firstBrand = await insertBrand(organisationId, owner, 'grant-active');
		const secondBrand = await insertBrand(organisationId, owner, 'grant-to-archive');
		const invitation = await createInvitation(organisationId, owner, recipient, 'all-grants');
		await addBrandGrant(invitation.id, organisationId, owner, [firstBrand, secondBrand]);
		await pool.query(`UPDATE "brand" SET status = 'archived' WHERE id = $1`, [secondBrand]);
		await insertMember(organisationId, recipient);
		const invitationInput = {
			id: invitation.id,
			email: invitation.email,
			status: 'accepted',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			organizationId: organisationId,
			inviterId: owner
		};
		await pool.query(`UPDATE "invitation" SET status = 'accepted' WHERE id = $1`, [invitation.id]);
		await onInvitationAccepted({
			invitation: invitationInput,
			member: { id: `${organisationId}-member-${recipient}` },
			user: { id: recipient, email: invitation.email, emailVerified: true },
			organization: { id: organisationId }
		});

		const provisioning = await pool.query<{ state: string }>(
			`SELECT state FROM "invitation_provisioning" WHERE id = $1`,
			[invitation.provisioningId]
		);
		const assignments = await pool.query(
			`SELECT 1 FROM "brand_member" WHERE user_id = $1 AND brand_id = ANY($2) AND status = 'active'`,
			[recipient, [firstBrand, secondBrand]]
		);
		expect(provisioning.rows[0]?.state).toBe('retry_pending');
		expect(assignments.rows).toHaveLength(0);
	});

	it('cancels pending provisioning and removes its unactivated brand grants', async () => {
		const owner = await insertUser('cancel-owner');
		const recipient = await insertUser('cancel-recipient');
		const organisationId = await insertOrganisation('cancel', owner);
		const brandId = await insertBrand(organisationId, owner, 'cancel-grant');
		const invitation = await createInvitation(organisationId, owner, recipient, 'cancel');
		await addBrandGrant(invitation.id, organisationId, owner, [brandId]);
		await cancelProvisioning({
			invitationId: invitation.id,
			organisationId,
			actorUserId: owner,
			reason: 'Integration cancellation proof'
		});
		const state = await pool.query<{ state: string }>(
			`SELECT state FROM "invitation_provisioning" WHERE id = $1`,
			[invitation.provisioningId]
		);
		const grants = await pool.query(
			`SELECT 1 FROM "invitation_brand_grant" WHERE provisioning_id = $1`,
			[invitation.provisioningId]
		);
		expect(state.rows[0]?.state).toBe('cancelled');
		expect(grants.rows).toHaveLength(0);
	});

	it('records seat-limit failure, enforces invitation retry backoff, and activates after capacity opens', async () => {
		const owner = await insertUser('capacity-owner');
		const recipient = await insertUser('capacity-recipient');
		const organisationId = await insertOrganisation('capacity', owner);
		const brandId = await insertBrand(organisationId, owner, 'seat-limited');
		await insertAssignment(brandId, owner, 'brand_admin');
		for (let index = 0; index < 24; index += 1) {
			const userId = await insertUser(`capacity-seat-${index}`);
			await insertMember(organisationId, userId);
			await insertAssignment(brandId, userId);
		}
		const invitation = await createInvitation(organisationId, owner, recipient, 'capacity');
		await addBrandGrant(invitation.id, organisationId, owner, [brandId]);
		const invitationInput = {
			id: invitation.id,
			email: invitation.email,
			status: 'pending',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			organizationId: organisationId,
			inviterId: owner
		};
		await guardInvitationAcceptance({
			invitation: invitationInput,
			user: { id: recipient, email: invitation.email, emailVerified: true },
			organization: { id: organisationId }
		});
		const memberId = `${organisationId}-member-${recipient}`;
		await insertMember(organisationId, recipient);
		await pool.query(`UPDATE "invitation" SET status = 'accepted' WHERE id = $1`, [invitation.id]);
		await onInvitationAccepted({
			invitation: { ...invitationInput, status: 'accepted' },
			member: { id: memberId },
			user: { id: recipient, email: invitation.email, emailVerified: true },
			organization: { id: organisationId }
		});

		const failedActivation = await pool.query<{ state: string; attempts: number; next_retry_at: Date }>(
			`SELECT state, attempts, next_retry_at FROM "invitation_provisioning" WHERE id = $1`,
			[invitation.provisioningId]
		);
		expect(failedActivation.rows[0]).toMatchObject({ state: 'retry_pending', attempts: 1 });
		expect(failedActivation.rows[0]!.next_retry_at.getTime()).toBeGreaterThan(Date.now());
		mocks.getSession.mockResolvedValue({ user: { id: recipient } });
		await expect(
			retryProvisioning({ provisioningId: invitation.provisioningId, actorUserId: recipient, headers: new Headers() })
		).rejects.toThrow('Provisioning retry backoff has not elapsed');
		await reconcileAcceptedInvitation(invitation.id, recipient);
		const stillWaiting = await pool.query<{ state: string; attempts: number; next_retry_at: Date }>(
			`SELECT state, attempts, next_retry_at FROM "invitation_provisioning" WHERE id = $1`,
			[invitation.provisioningId]
		);
		expect(stillWaiting.rows[0]).toMatchObject({ state: 'retry_pending', attempts: 1 });
		expect(stillWaiting.rows[0]!.next_retry_at.getTime()).toBeGreaterThan(Date.now());
		expect(await processDueProvisioningRetries()).toMatchObject({ processed: 0, active: 0 });

		const seatToFree = `${brandId}-assignment-${`${runPrefix}-capacity-seat-0`}`;
		await pool.query(`DELETE FROM "brand_member" WHERE id = $1`, [seatToFree]);
		await pool.query(`UPDATE "invitation_provisioning" SET next_retry_at = now() - interval '1 second' WHERE id = $1`, [invitation.provisioningId]);
		expect(await processDueProvisioningRetries()).toMatchObject({ processed: 1, active: 1, failed: 0 });
		const activeAssignment = await pool.query(
			`SELECT 1 FROM "brand_member" WHERE brand_id = $1 AND user_id = $2 AND status = 'active'`,
			[brandId, recipient]
		);
		expect(activeAssignment.rows).toHaveLength(1);
	});

	it('recovers an accepted invitation when the acceptance hook was interrupted', async () => {
		const owner = await insertUser('abandoned-owner');
		const recipient = await insertUser('abandoned-recipient');
		const organisationId = await insertOrganisation('abandoned', owner);
		const brandId = await insertBrand(organisationId, owner, 'abandoned-hook');
		await insertAssignment(brandId, owner, 'brand_admin');
		const invitation = await createInvitation(organisationId, owner, recipient, 'abandoned');
		await addBrandGrant(invitation.id, organisationId, owner, [brandId]);
		const invitationInput = {
			id: invitation.id,
			email: invitation.email,
			status: 'pending',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			organizationId: organisationId,
			inviterId: owner
		};
		await guardInvitationAcceptance({
			invitation: invitationInput,
			user: { id: recipient, email: invitation.email, emailVerified: true },
			organization: { id: organisationId }
		});
		await insertMember(organisationId, recipient);
		await pool.query(`UPDATE "invitation" SET status = 'accepted' WHERE id = $1`, [invitation.id]);
		await pool.query(
			`UPDATE "invitation_provisioning" SET updated_at = now() - interval '61 seconds' WHERE id = $1`,
			[invitation.provisioningId]
		);

		expect(await processDueProvisioningRetries()).toMatchObject({ processed: 1, active: 1, failed: 0 });
		const state = await pool.query<{ state: string }>(
			`SELECT state FROM "invitation_provisioning" WHERE id = $1`,
			[invitation.provisioningId]
		);
		const assignment = await pool.query(
			`SELECT 1 FROM "brand_member" WHERE brand_id = $1 AND user_id = $2 AND status = 'active'`,
			[brandId, recipient]
		);
		expect(state.rows[0]?.state).toBe('active');
		expect(assignment.rows).toHaveLength(1);
	});

	it('serializes concurrent ownership transfer and member removal with the organisation lock', async () => {
		const ownerOne = await insertUser('race-owner-one');
		const ownerTwo = await insertUser('race-owner-two');
		const organisationId = await insertOrganisation('race', ownerOne);
		await insertMember(organisationId, ownerTwo, 'owner');
		const session = new Date();
		const outcomes = await Promise.allSettled([
			transferOwnership({
				userId: ownerOne,
				organisationId,
				targetUserId: ownerTwo,
				sessionCreatedAt: session,
				confirmation: 'TRANSFER',
				reason: 'Concurrent lock proof'
			}),
			removeOrganisationMember({
				userId: ownerOne,
				organisationId,
				targetUserId: ownerTwo,
				sessionCreatedAt: session
			})
		]);
		expect(outcomes.some((outcome) => outcome.status === 'fulfilled')).toBe(true);
		const owners = await pool.query<{ count: string }>(
			`SELECT count(*) AS count FROM "member" WHERE "organizationId" = $1 AND role ~ '(^|,)owner(,|$)'`,
			[organisationId]
		);
		expect(Number(owners.rows[0]?.count)).toBeGreaterThanOrEqual(1);
	});

	it('enforces the organisation brand creation limit in PostgreSQL', async () => {
		const owner = await insertUser('limit-owner');
		const organisationId = await insertOrganisation('limit', owner);
		await insertBrand(organisationId, owner, 'existing');
		for (let index = 0; index < 9; index += 1) {
			await createBrand({
				userId: owner,
				organisationId,
				name: `Brand ${index}`,
				slug: `brand-${index}`
			});
		}
		await expect(
			createBrand({ userId: owner, organisationId, name: 'Too many', slug: 'too-many' })
		).rejects.toThrow('Brand limit reached');
		const active = await pool.query<{ count: string }>(
			`SELECT count(*) AS count FROM "brand" WHERE organisation_id = $1 AND status = 'active'`,
			[organisationId]
		);
		expect(Number(active.rows[0]?.count)).toBe(10);
	});
});
