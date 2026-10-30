#!/usr/bin/env bun
/**
 * G11 — is the queue drained?
 *
 *   BETTER_DATABASE_URL=... bun scripts/diagnostic/drain-check.ts
 *   BETTER_DATABASE_URL=... bun scripts/diagnostic/drain-check.ts --out migration-log.md
 *
 * A9.2 requires this immediately before cutover **and** immediately before any
 * rollback, with the output captured. A non-zero result blocks; it does not get
 * explained away. So does an unverifiable one: a table that does not exist cannot
 * demonstrate an empty queue, and treating "no such table" as "zero rows" is how
 * a cutover proceeds over live work.
 *
 * When an engagement is in flight the script prints the rows, because A9.2
 * requires them recorded as **stranded** — the old path resolves work through
 * `engine_job_id`, and an engagement without one is work the rollback cannot
 * resume.
 *
 * Exit codes: 0 clear, 1 blocked or unverifiable, 2 the check could not run.
 */

import { appendFileSync } from 'node:fs';
import { Pool } from 'pg';

export type CheckState = 'clear' | 'blocked' | 'unknown';

export interface DrainCheck {
	/** What the query looks at, in the words the migration log will use. */
	label: string;
	table: string;
	statuses: readonly string[];
	state: CheckState;
	count: number | null;
	/** The rows that block, when there are any. */
	rows: Array<Record<string, unknown>>;
	detail?: string;
}

export interface DrainReport {
	at: string;
	database: string;
	checks: DrainCheck[];
	/** True only when every check is `clear`. */
	clear: boolean;
}

const CHECKS = [
	{
		label: 'diagnostic job queue',
		table: 'diagnostic.job',
		statuses: ['queued', 'running', 'leased', 'retrying'] as const
	},
	{
		label: 'engagement delivery',
		table: 'diagnostic_engagement',
		statuses: ['in_delivery', 'retrying'] as const
	}
];

/** The database as named in the URL, without credentials. */
function databaseName(url: string): string {
	try {
		const parsed = new URL(url);
		return `${parsed.hostname}${parsed.pathname}`;
	} catch {
		return '(unparseable URL)';
	}
}

export async function runDrainCheck(pool: Pool, databaseUrl: string): Promise<DrainReport> {
	const checks: DrainCheck[] = [];

	for (const check of CHECKS) {
		const statuses = check.statuses;
		const exists = await pool.query<{ exists: boolean }>(
			`SELECT to_regclass($1) IS NOT NULL AS exists`,
			[check.table]
		);
		if (!exists.rows[0]?.exists) {
			checks.push({
				label: check.label,
				table: check.table,
				statuses,
				state: 'unknown',
				count: null,
				rows: [],
				detail: `${check.table} does not exist, so an empty queue cannot be shown.`
			});
			continue;
		}

		const placeholders = statuses.map((_, i) => `$${i + 1}`).join(', ');
		const { rows } = await pool.query<{ n: string }>(
			`SELECT count(*)::text AS n FROM ${check.table} WHERE "status" IN (${placeholders})`,
			[...statuses]
		);
		const count = Number(rows[0]?.n ?? 0);

		let detailRows: Array<Record<string, unknown>> = [];
		if (count > 0) {
			// The rows that block, so they can be recorded as stranded. The job
			// table has no engine_job_id of its own; the engagement is the row the
			// old path resumes.
			const columns =
				check.table === 'diagnostic_engagement'
					? `"id", "status", "engine_job_id", "product_key"`
					: `"id", "status", "engagement_id"`;
			const detail = await pool.query(
				`SELECT ${columns} FROM ${check.table} WHERE "status" IN (${placeholders}) ORDER BY "id" LIMIT 50`,
				[...statuses]
			);
			detailRows = detail.rows as Array<Record<string, unknown>>;
		}

		checks.push({
			label: check.label,
			table: check.table,
			statuses,
			state: count === 0 ? 'clear' : 'blocked',
			count,
			rows: detailRows
		});
	}

	return {
		at: new Date().toISOString(),
		database: databaseName(databaseUrl),
		checks,
		clear: checks.every((check) => check.state === 'clear')
	};
}

/** The block a human pastes into the migration log. */
export function formatDrainReport(report: DrainReport, heading: string): string {
	const lines: string[] = [];
	lines.push(`### ${heading}`);
	lines.push('');
	lines.push(`Captured ${report.at} against \`${report.database}\`.`);
	lines.push('');
	lines.push('| Check | Table | Statuses | Count | Result |');
	lines.push('|---|---|---|---|---|');
	for (const check of report.checks) {
		lines.push(
			`| ${check.label} | \`${check.table}\` | ${check.statuses.join(', ')} | ${check.count ?? '—'} | ${check.state} |`
		);
	}
	lines.push('');
	if (report.clear) {
		lines.push('**Result: clear.** No automated work is in flight.');
		return lines.join('\n');
	}
	lines.push('**Result: BLOCKED.** Cutover and rollback are refused until this is clear.');
	for (const check of report.checks) {
		if (check.detail) lines.push(`\n- ${check.table}: ${check.detail}`);
		for (const row of check.rows) lines.push(`\n- stranded \`${JSON.stringify(row)}\``);
	}
	return lines.join('\n');
}

async function main(): Promise<void> {
	const databaseUrl = process.env.BETTER_DATABASE_URL || process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('BETTER_DATABASE_URL (or DATABASE_URL) is required');

	const outIndex = process.argv.indexOf('--out');
	const out = outIndex > -1 ? process.argv[outIndex + 1] : undefined;
	const heading = process.argv.includes('--rollback') ? 'G11 drain check — before rollback' : 'G11 drain check — before cutover';

	const pool = new Pool({ connectionString: databaseUrl, max: 1 });
	try {
		const report = await runDrainCheck(pool, databaseUrl);
		const text = formatDrainReport(report, heading);
		console.log(text);
		if (out) appendFileSync(out, `\n${text}\n`);
		if (!report.clear) process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 2;
	});
}
