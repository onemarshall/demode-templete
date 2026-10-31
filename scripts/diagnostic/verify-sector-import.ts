#!/usr/bin/env bun
/**
 * Sector synthesis import proof — the file, and the rows it produces.
 *
 *   docker run -d --rm --name montsel-sector-import-verify \
 *     -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_sector_import_verify \
 *     -p 127.0.0.1:55445:5432 postgres:16
 *
 *   MONTSEL_SECTOR_IMPORT_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55445/montsel_sector_import_verify \
 *     bun scripts/diagnostic/verify-sector-import.ts
 *
 * A sector synthesis is imported once per sector and approved once, so a bad
 * file is discovered either here or in production. This runs the real import
 * against a disposable database and asserts what the operator actually needs to
 * know before approving:
 *
 *   - the candidate file parses and produces one immutable version
 *   - the version starts unapproved, so an import can never make anything live
 *   - the context items compile, because an approved version with no context
 *     contributes nothing to a report
 *   - re-running the same file is a no-op rather than a duplicate
 *   - the approval gate accepts it, and the record's active version moves
 *
 * The engine's importer is invoked as a subprocess, so no engine file changes
 * and the engine is not frozen against this work. After the port the same
 * assertions should be pointed at the application's own importer; they are
 * written against the file and the resulting rows for that reason.
 *
 * Environment:
 *   MONTSEL_ENGINE_DIR       engine CLI directory (default: the Langfell workspace)
 *   MONTSEL_CANDIDATE_FILE   the sector synthesis JSON to import
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';
import { assert, requireSafeDatabase } from './disposable-db.ts';

const DATABASE_NAME = 'montsel_sector_import_verify';
const url = requireSafeDatabase(
	process.env.MONTSEL_SECTOR_IMPORT_VERIFY_DATABASE_URL,
	DATABASE_NAME
);

const PRODUCT_ENGINES = resolve(
	homedir(),
	'Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines'
);
const ENGINE_DIR = process.env.MONTSEL_ENGINE_DIR ?? join(PRODUCT_ENGINES, 'diagnostic/app/cli');
const CANDIDATE_FILE =
	process.env.MONTSEL_CANDIDATE_FILE ??
	join(
		PRODUCT_ENGINES,
		'research/industries/cybersecurity-data-and-ai-services/managed-cybersecurity-service-providers/research/local-engine/candidate.json'
	);

assert(
	existsSync(join(ENGINE_DIR, 'src/cli.ts')),
	`No engine CLI at ${ENGINE_DIR}. Set MONTSEL_ENGINE_DIR.`
);
assert(existsSync(CANDIDATE_FILE), `No candidate file at ${CANDIDATE_FILE}. Set MONTSEL_CANDIDATE_FILE.`);

/** Run the engine CLI against the disposable database and nothing else. */
function engine(args: string[]): { code: number; out: string } {
	try {
		const out = execFileSync('bun', ['run', 'src/cli.ts', ...args], {
			cwd: ENGINE_DIR,
			env: { ...process.env, DATABASE_URL: url, MONTSEL_LOAD_DOTENV: '0' },
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		});
		return { code: 0, out };
	} catch (error) {
		const failure = error as { status?: number; stdout?: string; stderr?: string };
		return {
			code: failure.status ?? -1,
			out: `${failure.stdout ?? ''}${failure.stderr ?? ''}`
		};
	}
}

const candidate = JSON.parse(readFileSync(CANDIDATE_FILE, 'utf8')) as {
	record?: { slug?: string; document_id?: string };
	scope?: { sector_slug?: string; sector?: string; industry?: string };
};
const sectorSlug = candidate.scope?.sector_slug ?? candidate.record?.slug;
const recordSlug = candidate.record?.slug;
assert(sectorSlug, 'The candidate names no sector slug.');
assert(recordSlug, 'The candidate names no record slug.');

const pool = new Pool({ connectionString: url, max: 2 });

try {
	const scalar = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
		const { rows } = await pool.query(sql, params);
		return Object.values(rows[0] ?? {})[0] as T;
	};

	// 1. A fresh database, built from the engine's own migrations. Applying them
	// in file order is what the runner does; the drizzle journal is not needed to
	// prove the import.
	const existing = await scalar<number>(
		`SELECT count(*)::int FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
	);
	assert(existing === 0, `The verification database is not empty (${existing} tables). Use a fresh one.`);

	const migrationsDir = join(ENGINE_DIR, 'src', 'migrations');
	const migrations = readdirSync(migrationsDir)
		.filter((name) => name.endsWith('.sql'))
		.sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));
	assert(migrations.length > 0, 'No engine migrations found.');

	for (const file of migrations) {
		const sql = readFileSync(join(migrationsDir, file), 'utf8');
		await pool.query('BEGIN');
		try {
			await pool.query(sql);
			await pool.query('COMMIT');
		} catch (error) {
			await pool.query('ROLLBACK');
			throw new Error(
				`Engine migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// 2. The sector taxonomy row the import refuses without.
	await pool.query(`INSERT INTO "sectors" ("slug", "name") VALUES ($1, $2)`, [
		sectorSlug,
		candidate.scope?.sector ?? sectorSlug
	]);

	// 3. Import the real candidate file.
	const imported = engine(['seed-sector-intelligence', `--file=${CANDIDATE_FILE}`]);
	assert(
		imported.code === 0,
		`The import failed (exit ${imported.code}):\n${imported.out.trim()}`
	);
	assert(
		/created|reused/.test(imported.out),
		`The import printed no outcome:\n${imported.out.trim()}`
	);

	const version = await pool.query<{
		id: number;
		documentStatus: string;
		deploymentStatus: string;
		evidenceStrength: string;
		approvedAt: string | null;
		reviewer: string | null;
		sourceHash: string;
	}>(
		`SELECT v."id", v."document_status" AS "documentStatus",
		        v."deployment_status" AS "deploymentStatus",
		        v."evidence_strength" AS "evidenceStrength",
		        v."approved_at" AS "approvedAt", v."reviewer",
		        v."source_hash" AS "sourceHash"
		 FROM "sector_intelligence_versions" v
		 JOIN "sector_intelligence_records" r ON r."id" = v."sector_intelligence_record_id"
		 WHERE r."slug" = $1
		 ORDER BY v."id"`,
		[recordSlug]
	);
	assert(version.rows.length === 1, `Expected one version, found ${version.rows.length}.`);
	const row = version.rows[0]!;

	// 4. An import never makes anything live.
	assert(row.approvedAt === null, 'The imported version was already approved.');
	assert(row.reviewer === null, 'The imported version already carries a reviewer.');
	assert(
		(await scalar<number>(
			`SELECT count(*)::int FROM "sector_intelligence_records" WHERE "slug" = $1 AND "active_version_id" IS NOT NULL`,
			[recordSlug]
		)) === 0,
		'The import set an active version.'
	);

	// 5. Context items compiled, because an approved version with none adds
	// nothing to a report.
	const contextItems = await scalar<number>(
		`SELECT count(*)::int FROM "sector_context_items" WHERE "sector_intelligence_version_id" = $1`,
		[row.id]
	);
	assert(contextItems > 0, 'The import produced no context items.');
	assert(
		(await scalar<number>(
			`SELECT count(*)::int FROM "sector_intelligence_applicability" WHERE "sector_intelligence_version_id" = $1`,
			[row.id]
		)) > 0,
		'The import produced no applicability rules, so approval must fail.'
	);

	// 6. Re-running the same file is a no-op, not a duplicate.
	const repeated = engine(['seed-sector-intelligence', `--file=${CANDIDATE_FILE}`]);
	assert(repeated.code === 0, `The repeat import failed:\n${repeated.out.trim()}`);
	assert(
		(await scalar<number>(
			`SELECT count(*)::int FROM "sector_intelligence_versions" v
			 JOIN "sector_intelligence_records" r ON r."id" = v."sector_intelligence_record_id"
			 WHERE r."slug" = $1`,
			[recordSlug]
		)) === 1,
		'Re-importing the same file created a second version.'
	);

	// 7. The approval gate's verdict on this file.
	//
	// Importability and approvability are different questions, and the operator
	// needs both answers. A file that imports cleanly but cannot be approved is
	// not a failure of the import — it is a candidate that is not ready, and the
	// gate says why. Exit 0 means both; exit 2 means the import is sound and the
	// approval was refused.
	const approved = engine([
		'sector-intelligence',
		'approve',
		`--slug=${recordSlug}`,
		`--version=${row.id}`,
		'--reviewer=disposable-proof'
	]);

	if (approved.code !== 0) {
		const reason = approved.out.trim().split('\n').filter(Boolean).pop() ?? '(no reason given)';
		console.log('Sector synthesis import verified on the disposable database:');
		console.log(`  file      ${CANDIDATE_FILE.split('/').slice(-3).join('/')}`);
		console.log(`  sector    ${sectorSlug} → record ${recordSlug}`);
		console.log(`  version   ${row.id} (${row.documentStatus}, ${row.deploymentStatus}, ${row.evidenceStrength})`);
		console.log(`  hash      ${row.sourceHash.slice(0, 16)}…`);
		console.log(`  context   ${contextItems} items compiled`);
		console.log('  unapproved on import, and re-import is a no-op');
		console.log('');
		console.log('  IMPORT SOUND — APPROVAL REFUSED');
		console.log(`  ${reason}`);
		console.log('');
		console.log('  The file can be imported. It cannot be approved as it stands, so it');
		console.log('  cannot feed a report. Fix the candidate, then re-run this proof.');
		process.exitCode = 2;
	} else {
		const after = await pool.query<{
			approvedAt: string | null;
			reviewer: string | null;
			activeVersionId: number | null;
		}>(
			`SELECT v."approved_at" AS "approvedAt", v."reviewer",
			        r."active_version_id" AS "activeVersionId"
			 FROM "sector_intelligence_versions" v
			 JOIN "sector_intelligence_records" r ON r."id" = v."sector_intelligence_record_id"
			 WHERE r."slug" = $1 AND v."id" = $2`,
			[recordSlug, row.id]
		);
		const final = after.rows[0]!;
		assert(final.approvedAt !== null, 'Approval did not record a timestamp.');
		assert(final.reviewer === 'disposable-proof', `Approval recorded reviewer ${final.reviewer}.`);
		assert(final.activeVersionId === row.id, 'Approval did not move the active version.');

		console.log('Sector synthesis import verified on the disposable database:');
		console.log(`  file      ${CANDIDATE_FILE.split('/').slice(-3).join('/')}`);
		console.log(`  sector    ${sectorSlug} → record ${recordSlug}`);
		console.log(`  version   ${row.id} (${row.documentStatus}, ${row.deploymentStatus}, ${row.evidenceStrength})`);
		console.log(`  hash      ${row.sourceHash.slice(0, 16)}…`);
		console.log(`  context   ${contextItems} items compiled`);
		console.log('  unapproved on import, and re-import is a no-op');
		console.log(`  approved  reviewer recorded, active version ${final.activeVersionId}`);
		console.log('');
		console.log('  IMPORT SOUND — APPROVAL ACCEPTED. This sector can be sold into.');
	}
} finally {
	await pool.end();
}
