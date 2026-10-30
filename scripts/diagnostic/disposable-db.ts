/**
 * Disposable-database harness for the Diagnostic proofs.
 *
 * Every caller is restricted to a dedicated loopback database whose name it
 * declares, so a mistyped environment variable cannot reach the operator's
 * stack. The harness creates the Better Auth tables, runs the repository's
 * ordered migrations, seeds two identities and returns the brands the tenancy
 * backfill produced for them — one pilot, one deliberately unrelated.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import type { BetterAuthOptions } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';

// `import.meta.dir` is Bun-only. Vitest runs the same harness from the repo
// root, where `process.cwd()` is the equivalent anchor.
export const PROJECT_ROOT = import.meta.dir ? resolve(import.meta.dir, '..', '..') : process.cwd();

export interface DisposableDatabase {
	pool: Pool;
	databaseUrl: string;
	/** The auth config's own pool; must be closed too or the process lingers. */
	authPool: Pool | undefined;
	/** The brand owned by the first seeded user. */
	pilot: { brandId: string; organisationId: string; userId: string };
	/** A brand owned by a different user in a different organisation. */
	other: { brandId: string; organisationId: string; userId: string };
}

export function requireSafeDatabase(urlValue: string | undefined, expectedName: string): string {
	if (!urlValue)
		throw new Error(`Set the verification URL to a disposable database named ${expectedName}.`);
	const url = new URL(urlValue);
	const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (!['localhost', '127.0.0.1', '::1'].includes(hostname))
		throw new Error('Verification is restricted to PostgreSQL on localhost/loopback.');
	if (decodeURIComponent(url.pathname.replace(/^\//, '')) !== expectedName)
		throw new Error(`Verification database must be named exactly ${expectedName}.`);
	if (url.searchParams.has('options') || url.searchParams.has('host'))
		throw new Error('Do not override the PostgreSQL host through URL options.');
	return urlValue;
}

export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

/**
 * Prepare a blank disposable database and return the two seeded brands.
 * The caller owns `pool` and must close it.
 */
export async function prepareDisposableDatabase(
	databaseUrl: string,
	migrationsExpectedThrough: number,
): Promise<DisposableDatabase> {
	process.env.BETTER_DATABASE_URL = databaseUrl;
	process.env.MONTSEL_LOAD_DOTENV = '0';

	const { default: auth } = await import('../auth-cli.ts');
	const authOptions = auth.options as BetterAuthOptions;
	authOptions.advanced = {
		...authOptions.advanced,
		database: { ...authOptions.advanced?.database, validateSchema: false }
	};

	const pool = new Pool({ connectionString: databaseUrl, max: 4 });
	const { rows: existing } = await pool.query<{ table_name: string }>(
		`SELECT table_name FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
	);
	assert(
		existing.length === 0,
		`The verification database is not empty (${existing.map((row) => row.table_name).join(', ')}). Use a fresh database.`,
	);

	const plan = await getMigrations(authOptions);
	assert(plan.unsafeChanges.length === 0, plan.unsafeChanges.join('; '));
	assert(plan.schemaProblems.length === 0, plan.schemaProblems.join('; '));
	await plan.runMigrations();

	// Seeded before the tenancy backfill, which creates their personal
	// organisations and brands through the same path production uses.
	for (const suffix of ['a', 'b']) {
		await pool.query(
			`INSERT INTO "user" ("id", "name", "email", "emailVerified", "lastLoginMethod", "provider")
			 VALUES ($1, $2, $3, false, 'email', 'email')`,
			[
				`diag_verify_${suffix}`,
				`Diagnostic Verify ${suffix.toUpperCase()}`,
				`diag-verify-${suffix}@example.test`
			]
		);
	}

	// The migration runner is a Bun script (`import.meta.dir`, TS entry). Spawn
	// Bun explicitly so the harness also works when driven from Vitest, where
	// `process.execPath` is Node.
	const output = execFileSync('bun', ['scripts/database/migrate.ts'], {
		cwd: PROJECT_ROOT,
		env: { ...process.env, BETTER_DATABASE_URL: databaseUrl },
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	assert(
		output.includes(`✓ ${migrationsExpectedThrough} `),
		`Migration ${migrationsExpectedThrough} did not apply.`,
	);

	const { rows: brands } = await pool.query<{
		id: string;
		organisationId: string;
		createdBy: string;
	}>(`SELECT "id", "organisation_id" AS "organisationId", "created_by" AS "createdBy" FROM "brand"`);

	const pilotBrand = brands.find((brand) => brand.createdBy === 'diag_verify_a');
	const otherBrand = brands.find((brand) => brand.createdBy === 'diag_verify_b');
	assert(pilotBrand && otherBrand, 'Expected the tenancy backfill to create one brand per seeded user.');

	const authPool = authOptions.database as Pool | undefined;

	return {
		pool,
		databaseUrl,
		authPool: authOptions.database as Pool | undefined,
		pilot: {
			brandId: pilotBrand.id,
			organisationId: pilotBrand.organisationId,
			userId: 'diag_verify_a'
		},
		other: {
			brandId: otherBrand.id,
			organisationId: otherBrand.organisationId,
			userId: 'diag_verify_b'
		}
	};
}

export async function closeDisposableDatabase(database: DisposableDatabase): Promise<void> {
	await database.pool.end();
	if (database.authPool && typeof database.authPool.end === 'function') await database.authPool.end();
}
