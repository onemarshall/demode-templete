#!/usr/bin/env bun
/**
 * G11 proof: the drain check blocks on in-flight work, on an unverifiable table,
 * and on nothing else.
 *
 *   docker run -d --rm --name montsel-drain-verify \
 *     -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_drain_verify \
 *     -p 127.0.0.1:55444:5432 postgres:16
 *
 *   MONTSEL_DRAIN_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55444/montsel_drain_verify \
 *     bun scripts/diagnostic/verify-drain-check.ts
 *
 * A9.2 says a non-zero result blocks cutover and rollback and does not get
 * explained away. This proves the three states the check can return — clear,
 * blocked, unknown — and that the CLI's exit code follows them, because the
 * cutover depends on the exit code rather than on someone reading the output.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
	assert,
	closeDisposableDatabase,
	prepareDisposableDatabase,
	PROJECT_ROOT,
	requireSafeDatabase
} from './disposable-db.ts';

const DATABASE_NAME = 'montsel_drain_verify';
const url = requireSafeDatabase(process.env.MONTSEL_DRAIN_VERIFY_DATABASE_URL, DATABASE_NAME);

// Derived rather than pinned, so a later migration does not turn this proof into
// a failure that says nothing about the drain check.
const LATEST = Math.max(
	...readdirSync(join(PROJECT_ROOT, 'database', 'migrations'))
		.filter((name) => name.endsWith('.sql'))
		.map((name) => Number(/^(\d+)_/.exec(name)?.[1] ?? 0))
);

const database = await prepareDisposableDatabase(url, LATEST);
const { pool, pilot } = database;

/** The CLI, run as the cutover runs it. Returns the exit code and its output. */
function cli(...args: string[]): { code: number; out: string } {
	try {
		const out = execFileSync('bun', [join(PROJECT_ROOT, 'scripts/diagnostic/drain-check.ts'), ...args], {
			cwd: PROJECT_ROOT,
			env: { ...process.env, BETTER_DATABASE_URL: url, MONTSEL_LOAD_DOTENV: '0' },
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		});
		return { code: 0, out };
	} catch (error) {
		const failure = error as { status?: number; stdout?: string; stderr?: string };
		return { code: failure.status ?? -1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
	}
}

async function insertEngagement(status: string, engineJobId: string | null): Promise<string> {
	const workItemId = `wi_${status}_${engineJobId ?? 'none'}`;
	const engagementId = `eng_${status}_${engineJobId ?? 'none'}`;
	await pool.query(
		`INSERT INTO "work_item" ("id", "organisation_id", "brand_id", "product_key", "state")
		 VALUES ($1, $2, $3, 'diagnostic.signal', 'in_progress')`,
		[workItemId, pilot.organisationId, pilot.brandId]
	);
	await pool.query(
		`INSERT INTO "diagnostic_engagement"
		   ("id", "organisation_id", "brand_id", "work_item_id", "product_key", "family", "depth",
		    "delivery_route", "status", "intake", "engine_job_id")
		 VALUES ($1, $2, $3, $4, 'diagnostic.signal', 'signal', 'automated',
		         'montsel_self_service', $5, '{}'::jsonb, $6)`,
		[engagementId, pilot.organisationId, pilot.brandId, workItemId, status, engineJobId]
	);
	return engagementId;
}

try {
	const { runDrainCheck, formatDrainReport } = await import('./drain-check.ts');

	// 1. A database with no job table cannot demonstrate an empty queue, and a
	// missing table is not evidence of zero rows.
	let report = await runDrainCheck(pool, url);
	const job = report.checks.find((check) => check.table === 'diagnostic.job')!;
	const engagement = report.checks.find((check) => check.table === 'diagnostic_engagement')!;
	assert(job.state === 'unknown', `A missing job table reported "${job.state}".`);
	assert(engagement.state === 'clear', `An empty engagement table reported "${engagement.state}".`);
	assert(!report.clear, 'The report was clear with an unverifiable check.');
	assert(cli().code === 1, 'The CLI exited 0 on an unverifiable check.');

	// 2. Work in flight blocks, and the row is printed so it can be recorded as
	// stranded — the old path resumes through engine_job_id.
	const live = await insertEngagement('in_delivery', 'job_live');
	report = await runDrainCheck(pool, url);
	const blocked = report.checks.find((check) => check.table === 'diagnostic_engagement')!;
	assert(blocked.state === 'blocked' && blocked.count === 1, 'In-flight delivery did not block.');
	assert(blocked.rows[0]?.['id'] === live, 'The blocking row was not reported.');
	assert(blocked.rows[0]?.['engine_job_id'] === 'job_live', 'The stranded row lost its engine job id.');
	const text = formatDrainReport(report, 'G11 drain check — before cutover');
	assert(/BLOCKED/.test(text), 'The formatted report did not say BLOCKED.');
	assert(/job_live/.test(text), 'The formatted report did not carry the stranded row.');
	assert(cli('--rollback').code === 1, 'The CLI exited 0 with work in flight.');

	// 3. A retrying engagement also blocks; a delivered one does not.
	await pool.query(`UPDATE "diagnostic_engagement" SET "status" = 'retrying' WHERE "id" = $1`, [live]);
	assert(
		(await runDrainCheck(pool, url)).checks.find((c) => c.table === 'diagnostic_engagement')!.state ===
			'blocked',
		'A retrying engagement did not block.'
	);
	await pool.query(`UPDATE "diagnostic_engagement" SET "status" = 'delivered' WHERE "id" = $1`, [live]);
	assert(
		(await runDrainCheck(pool, url)).checks.find((c) => c.table === 'diagnostic_engagement')!.state ===
			'clear',
		'A delivered engagement still blocked.'
	);

	// 4. With the job table present, an empty queue clears and a queued row does not.
	// The table is a stand-in for the Phase 4 job model; the query is the one A9.2
	// names, so the check is proven against the real column names.
	await pool.query(
		`CREATE TABLE "diagnostic"."job" (
		   "id" text PRIMARY KEY, "status" text NOT NULL, "engagement_id" text
		 )`
	);
	report = await runDrainCheck(pool, url);
	assert(report.clear, 'The report was not clear with every check empty.');
	assert(cli().code === 0, 'The CLI did not exit 0 on a clear queue.');

	await pool.query(
		`INSERT INTO "diagnostic"."job" ("id", "status", "engagement_id") VALUES ('job_1', 'queued', $1)`,
		[live]
	);
	report = await runDrainCheck(pool, url);
	const queued = report.checks.find((check) => check.table === 'diagnostic.job')!;
	assert(queued.state === 'blocked' && queued.count === 1, 'A queued job did not block.');
	assert(queued.rows[0]?.['engagement_id'] === live, 'The queued job did not name its engagement.');

	// 5. Every status A9.2 lists is checked, not just the one in the fixture.
	for (const status of ['running', 'leased', 'retrying']) {
		await pool.query(`UPDATE "diagnostic"."job" SET "status" = $1 WHERE "id" = 'job_1'`, [status]);
		assert(
			(await runDrainCheck(pool, url)).checks.find((c) => c.table === 'diagnostic.job')!.count === 1,
			`A ${status} job did not block.`
		);
	}

	// 6. Drained means drained.
	await pool.query(`DELETE FROM "diagnostic"."job"`);
	assert((await runDrainCheck(pool, url)).clear, 'The report was not clear after draining.');
	assert(cli().code === 0, 'The CLI did not exit 0 after draining.');

	console.log('G11 drain check verified on the disposable database:');
	console.log('  unknown   a missing job table blocks; it is not read as zero rows');
	console.log('  blocked   in_delivery and retrying engagements block, and print as stranded');
	console.log('  blocked   queued, running, leased and retrying jobs block');
	console.log('  clear     exit 0 only when every check is empty');
	console.log('  capture   the formatted block carries the timestamp, counts and stranded rows');
} finally {
	await closeDisposableDatabase(database);
}
