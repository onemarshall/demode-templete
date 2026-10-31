#!/usr/bin/env bun
/**
 * Import every approvable sector synthesis, and approve it.
 *
 *   bun run import-sectors --target=<database-url> --reviewer=<name> [--dry-run]
 *   bun run import-sectors --target=<database-url> --reviewer=<name> --allow-loopback
 *
 * This writes to a real database and approves what it writes, so it is
 * deliberately awkward to point somewhere by accident:
 *
 *   - the target must be named explicitly; there is no default and no environment
 *     variable that quietly supplies one
 *   - a loopback target is refused unless `--allow-loopback` is passed, because
 *     the engine's own `.env` points at the operator's local stack and the
 *     product rules forbid importing into it
 *   - `--dry-run` compiles and reports without touching the database
 *
 * Import and approval are separate steps in the engine, and this keeps them
 * separate: every file is imported first, then approved, so a refused approval
 * leaves an unapproved version rather than a half-approved sector. Importing can
 * never make anything live; approval is the one-way door, and the reviewer is
 * recorded.
 *
 * Retained copies under `history/`, `archive/` and `validation/` are excluded. A
 * slug with more than one canonical file is skipped rather than guessed at.
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { Pool } from 'pg';
import { RESEARCH_DIR, compileSynthesis, requireEngine, runEngine } from './engine.ts';
import { assert } from './disposable-db.ts';

interface Synthesis {
	path: string;
	slug: string;
}

function argument(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function flag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function collect(): { files: Synthesis[]; excluded: number } {
	const found: Synthesis[] = [];
	let excluded = 0;
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (/(^|\/)(history|archive|validation)(\/|$)/.test(path)) excluded++;
				else walk(path);
			} else if (entry.name === 'Sector-Intelligence-Synthesis.md') {
				const text = readFileSync(path, 'utf8');
				const slug =
					/^\s*slug:\s*"?([a-z0-9-]+)"?/m.exec(text)?.[1] ?? basename(dirname(path));
				found.push({ path, slug });
			}
		}
	};
	assert(existsSync(join(RESEARCH_DIR, 'industries')), `No industries tree under ${RESEARCH_DIR}.`);
	walk(join(RESEARCH_DIR, 'industries'));
	return { files: found.sort((a, b) => a.slug.localeCompare(b.slug)), excluded };
}

function isLoopback(url: string): boolean {
	try {
		const host = new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
		return ['localhost', '127.0.0.1', '::1'].includes(host);
	} catch {
		return false;
	}
}

const target = argument('target');
const reviewer = argument('reviewer')?.trim();
const dryRun = flag('dry-run');
const migrate = flag('migrate');

if (!target) {
	console.error(
		'--target=<database-url> is required. There is no default: this command writes and approves.'
	);
	process.exit(2);
}
if (!reviewer) {
	console.error('--reviewer=<name> is required. Approval is attributed to a person.');
	process.exit(2);
}
if (isLoopback(target) && !flag('allow-loopback')) {
	console.error(
		`Refusing to import into ${new URL(target).hostname}. That is a loopback database, and the\n` +
			"engine's own .env points at the operator's local stack. Pass --allow-loopback only if\n" +
			'this really is a disposable database you own.'
	);
	process.exit(2);
}
requireEngine();

const { files, excluded } = collect();
const bySlug = new Map<string, Synthesis[]>();
for (const file of files) {
	const list = bySlug.get(file.slug) ?? [];
	list.push(file);
	bySlug.set(file.slug, list);
}
const duplicated = [...bySlug.entries()].filter(([, list]) => list.length > 1);
const unique = [...bySlug.entries()].filter(([, list]) => list.length === 1);

const work = mkdtempSync(join(tmpdir(), 'montsel-import-sectors-'));
const pool = dryRun ? null : new Pool({ connectionString: target, max: 2 });
const rows: Array<{ slug: string; verdict: string; detail: string }> = [];

try {
	// A fresh database needs the engine's schema before anything can be imported.
	// Production already has it; `--migrate` exists for a new staging database.
	if (migrate && pool) {
		const migrationsDir = join(requireEngine(), 'src', 'migrations');
		const migrations = readdirSync(migrationsDir)
			.filter((name) => name.endsWith('.sql'))
			.sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));
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
		console.log(`  migrated  ${migrations.length} engine migrations applied\n`);

		// A sector synthesis names a sector slug, and the importer refuses one the
		// taxonomy does not hold. Seeding is part of preparing a database, not part
		// of importing into a prepared one.
		const seeded = runEngine(['seed-sectors'], target);
		assert(seeded.code === 0, `Seeding the sector taxonomy failed:\n${seeded.out.trim()}`);
		console.log(`  taxonomy  ${seeded.out.trim().split('\n').filter(Boolean).pop() ?? 'seeded'}\n`);
	}

	console.log(`\n▸ import-sectors — ${unique.length} unique sectors, ${duplicated.length} skipped\n`);
	console.log(`  target    ${dryRun ? '(dry run — nothing written)' : new URL(target).hostname + new URL(target).pathname}`);
	console.log(`  reviewer  ${reviewer}`);
	if (excluded) console.log(`  ${excluded} retained copy directories excluded\n`);

	for (const [slug, [file]] of unique) {
		const compiled = join(work, `${slug}.json`);
		const compile = compileSynthesis(file.path!, compiled);
		if (compile.code !== 0 || !existsSync(compiled)) {
			rows.push({
				slug,
				verdict: 'COMPILE FAILED',
				detail: compile.out.trim().split('\n').filter(Boolean).pop() ?? ''
			});
			continue;
		}
		if (dryRun) {
			rows.push({ slug, verdict: 'COMPILED', detail: '' });
			continue;
		}

		const imported = runEngine(['seed-sector-intelligence', `--file=${compiled}`], target);
		if (imported.code !== 0) {
			rows.push({
				slug,
				verdict: 'IMPORT FAILED',
				detail: imported.out.trim().split('\n').filter(Boolean).pop() ?? ''
			});
			continue;
		}

		// The version id is in the importer's own receipt line.
		const versionId = /version=(\d+)/.exec(imported.out)?.[1];
		if (!versionId) {
			rows.push({ slug, verdict: 'IMPORT FAILED', detail: 'no version id in the receipt' });
			continue;
		}

		const approved = runEngine(
			['sector-intelligence', 'approve', `--slug=${slug}`, `--version=${versionId}`, `--reviewer=${reviewer}`],
			target
		);
		if (approved.code !== 0) {
			rows.push({
				slug,
				verdict: 'REFUSED',
				detail: approved.out.trim().split('\n').filter(Boolean).pop() ?? ''
			});
			continue;
		}
		rows.push({ slug, verdict: 'APPROVED', detail: `version ${versionId}` });
	}

	const width = Math.max(...rows.map((row) => row.slug.length), 4);
	for (const row of rows) console.log(`  ${row.slug.padEnd(width)}  ${row.verdict.padEnd(13)}  ${row.detail}`);
	for (const [slug, list] of duplicated)
		console.log(`  ${slug.padEnd(width)}  SKIPPED       ${list.length} canonical files; reconcile before importing`);

	const approved = rows.filter((row) => row.verdict === 'APPROVED').length;
	const refused = rows.filter((row) => row.verdict === 'REFUSED').length;
	const failed = rows.filter((row) => /FAILED/.test(row.verdict)).length;

	console.log(`\n  ${approved} approved, ${refused} refused, ${failed} failed, ${duplicated.length} skipped.`);

	if (pool) {
		// Read the result back rather than trusting the exit codes.
		const { rows: live } = await pool.query<{ n: string }>(
			`SELECT count(DISTINCT r."id")::text AS n
			 FROM "sector_intelligence_records" r
			 JOIN "sector_intelligence_versions" v ON v."id" = r."active_version_id"
			 WHERE v."approved_at" IS NOT NULL`
		);
		console.log(`  ${live[0]?.n ?? 0} sectors now have an approved active version.\n`);
	}

	process.exitCode = failed > 0 ? 1 : refused > 0 ? 2 : 0;
} finally {
	rmSync(work, { recursive: true, force: true });
	await pool?.end();
}
