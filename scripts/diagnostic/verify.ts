#!/usr/bin/env bun
/**
 * One command for every disposable-database proof.
 *
 *   bun run verify                     list what can be verified
 *   bun run verify all                 run every proof that needs no argument
 *   bun run verify schemas             the schema container
 *   bun run verify drain               the G11 queue-drain check
 *   bun run verify engagement          the engagement model and envelope
 *   bun run verify import              published report import
 *   bun run verify sector-import --candidate=<file.json>
 *   bun run verify sectors             every sector synthesis in the research tree
 *
 * Each proof needs a throwaway Postgres on loopback. This starts one, waits for
 * it to accept connections, runs the proof, and removes it again. `--keep` leaves
 * the container running so a failure can be inspected.
 *
 * Nothing here may reach the operator's own database: every proof declares the
 * database name it expects, and `disposable-db.ts` refuses anything else or
 * anything not on loopback.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { RESEARCH_DIR, compileSynthesis } from './engine.ts';
import { PROJECT_ROOT } from './disposable-db.ts';

interface Proof {
	/** What this proof establishes, in the words the operator would use. */
	about: string;
	script: string;
	database: string;
	env: string;
	port: number;
	/** Proofs that need an argument are not run by `all`. */
	needs?: string;
	/** Run as a Vitest project instead of a Bun script. */
	vitest?: { file: string; project: string };
}

const PROOFS: Record<string, Proof> = {
	schemas: {
		about: 'the diagnostic and content schemas exist and cannot shadow an app table',
		script: 'verify-schemas.ts',
		database: 'montsel_schema_verify',
		env: 'MONTSEL_SCHEMA_VERIFY_DATABASE_URL',
		port: 55443
	},
	drain: {
		about: 'the G11 drain check blocks on in-flight work and exits on it',
		script: 'verify-drain-check.ts',
		database: 'montsel_drain_verify',
		env: 'MONTSEL_DRAIN_VERIFY_DATABASE_URL',
		port: 55444
	},
	engagement: {
		about: 'the engagement model, payment gate and engine envelope',
		script: 'verify-engagement.ts',
		database: 'montsel_diagnostic_engagement_verify',
		env: 'MONTSEL_ENGAGEMENT_VERIFY_DATABASE_URL',
		port: 55441
	},
	import: {
		about: 'published report bytes import against their recorded hash',
		script: 'verify-import.ts',
		database: 'montsel_diagnostic_import_verify',
		env: 'MONTSEL_IMPORT_VERIFY_DATABASE_URL',
		port: 55440
	},
	'sector-import': {
		about: 'a sector synthesis imports and the approval gate accepts it',
		script: 'verify-sector-import.ts',
		database: 'montsel_sector_import_verify',
		env: 'MONTSEL_SECTOR_IMPORT_VERIFY_DATABASE_URL',
		port: 55445,
		needs: '--candidate=<file.json>'
	},
	signal: {
		about: 'the Signal delivery lifecycle against a fake engine',
		script: '',
		database: 'montsel_signal_delivery_verify',
		env: 'MONTSEL_SIGNAL_VERIFY_DATABASE_URL',
		port: 55442,
		vitest: {
			file: 'src/lib/modules/diagnostic/server/__tests__/diagnostic-delivery.integration.test.ts',
			project: 'server'
		}
	}
};

const IMAGE = 'postgres:16';
const PASSWORD = 'verify';

function dockerAvailable(): boolean {
	const result = spawnSync('docker', ['info'], { stdio: 'ignore' });
	return result.status === 0;
}

function containerName(proof: string): string {
	return `montsel-verify-${proof}`;
}

function url(proof: Proof): string {
	return `postgresql://postgres:${PASSWORD}@127.0.0.1:${proof.port}/${proof.database}`;
}

/** Remove a stale container from an earlier interrupted run. */
function clearContainer(name: string): void {
	spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
}

function psql(container: string, sql: string): number | null {
	const result = spawnSync(
		'docker',
		['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', sql],
		{ encoding: 'utf8' }
	);
	return result.status === 0 ? 0 : null;
}

function startContainer(name: string, proof: Proof): string {
	clearContainer(name);
	const run = spawnSync(
		'docker',
		[
			'run', '-d', '--rm', '--name', name,
			'-e', `POSTGRES_PASSWORD=${PASSWORD}`,
			'-e', `POSTGRES_DB=${proof.database}`,
			'-p', `127.0.0.1:${proof.port}:5432`,
			IMAGE
		],
		{ encoding: 'utf8' }
	);
	if (run.status !== 0) {
		throw new Error(`Could not start ${IMAGE}: ${run.stderr.trim()}`);
	}

	// `pg_isready` answers during the image's own init, which restarts once. A
	// successful `SELECT 1` twice in a row is the only reliable signal.
	let ready = 0;
	for (let attempt = 0; attempt < 60 && ready < 2; attempt++) {
		if (psql(name, 'SELECT 1') === 0) ready++;
		else ready = 0;
		if (ready < 2) Bun.sleepSync(500);
	}
	if (ready < 2) {
		clearContainer(name);
		throw new Error(`Postgres did not become ready on port ${proof.port}.`);
	}
	return name;
}

function stopContainer(name: string): void {
	spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
}

/**
 * Empty the database between proofs.
 *
 * `CREATE DATABASE` cannot run inside a transaction block, so the drop and the
 * create are separate invocations — sending both in one `psql -c` silently
 * leaves the database missing.
 */
function resetDatabase(container: string, database: string): void {
	const psqlRun = (sql: string): void => {
		spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', sql], {
			stdio: 'ignore'
		});
	};
	psqlRun(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
	psqlRun(`CREATE DATABASE "${database}"`);
}

interface ProofResult {
	code: number;
	out: string;
}

function runProof(proof: Proof, env: Record<string, string> = {}): ProofResult {
	const databaseUrl = url(proof);
	if (proof.vitest) {
		const result = spawnSync(
			'bunx',
			['vitest', 'run', proof.vitest.file, '--project', proof.vitest.project],
			{
				cwd: PROJECT_ROOT,
				env: { ...process.env, [proof.env]: databaseUrl, ...env },
				encoding: 'utf8'
			}
		);
		return { code: result.status ?? -1, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
	}

	const result = spawnSync('bun', [join(PROJECT_ROOT, 'scripts/diagnostic', proof.script)], {
		cwd: PROJECT_ROOT,
		env: { ...process.env, [proof.env]: databaseUrl, ...env },
		encoding: 'utf8'
	});
	return { code: result.status ?? -1, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function arg(name: string): string | undefined {
	const prefix = `--${name}=`;
	const found = process.argv.find((value) => value.startsWith(prefix));
	return found?.slice(prefix.length);
}

function list(): void {
	console.log('Disposable-database proofs. Each one starts its own Postgres.\n');
	const width = Math.max(...Object.keys(PROOFS).map((key) => key.length));
	for (const [key, proof] of Object.entries(PROOFS)) {
		const suffix = proof.needs ? ` ${proof.needs}` : '';
		console.log(`  ${key.padEnd(width)}  ${proof.about}`);
		console.log(`  ${' '.repeat(width)}  bun run verify ${key}${suffix}\n`);
	}
	console.log('  all'.padEnd(width + 2) + '  every proof that needs no argument');
	console.log('  sectors'.padEnd(width + 2) + '  every sector synthesis in the research tree\n');
}

/** Run one named proof, managing the container. */
async function run(name: string, options: { keep: boolean }): Promise<number> {
	const proof = PROOFS[name];
	if (!proof) throw new Error(`Unknown proof "${name}". Run \`bun run verify\` to list them.`);
	if (proof.needs && !arg('candidate')) {
		throw new Error(`\`${name}\` needs ${proof.needs}.`);
	}

	const container = startContainer(containerName(name), proof);
	try {
		console.log(`\n▸ ${name} — ${proof.about}\n`);
		const result = runProof(
			proof,
			arg('candidate') ? { MONTSEL_CANDIDATE_FILE: arg('candidate')! } : {}
		);
		process.stdout.write(result.out);
		return result.code;
	} finally {
		if (options.keep) console.log(`\n  kept ${container} on port ${proof.port}`);
		else stopContainer(container);
	}
}

interface SynthesisFile {
	path: string;
	slug: string;
}

/**
 * Every sector synthesis in the research tree, canonical or otherwise.
 *
 * Retained copies under `history/`, `archive/` and the `validation/` dry runs are
 * excluded: they are not candidate sectors, and counting them would report a
 * coverage figure nobody can act on. A canonical file that fails to compile is
 * still reported, because that is a real sector with a broken document.
 */
function syntheses(): { files: SynthesisFile[]; excluded: number } {
	const found: SynthesisFile[] = [];
	let excluded = 0;
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (/(^|\/)(history|archive|validation)(\/|$)/.test(path)) {
					excluded++;
					continue;
				}
				walk(path);
			} else if (entry.name === 'Sector-Intelligence-Synthesis.md') {
				const text = readFileSync(path, 'utf8');
				const slug =
					/^\s*slug:\s*"?([a-z0-9-]+)"?/m.exec(text)?.[1] ?? basename(dirname(path));
				found.push({ path, slug });
			}
		}
	};
	if (existsSync(join(RESEARCH_DIR, 'industries'))) walk(join(RESEARCH_DIR, 'industries'));
	return { files: found.sort((a, b) => a.slug.localeCompare(b.slug)), excluded };
}

/**
 * Coverage across every synthesis: which files can be imported *and* approved.
 *
 * Compiling and importing each file is the only honest answer — the approval gate
 * reads the document's own deployment status and evidence strength, so a file can
 * look finished and still be refused.
 */
async function sectors(options: { keep: boolean }): Promise<number> {
	const proof = PROOFS['sector-import']!;
	const { files, excluded } = syntheses();
	if (files.length === 0) throw new Error(`No Sector-Intelligence-Synthesis.md under ${RESEARCH_DIR}.`);

	const container = startContainer(containerName('sector-import'), proof);
	const work = mkdtempSync(join(tmpdir(), 'montsel-sectors-'));
	const rows: Array<{ slug: string; verdict: string; detail: string }> = [];

	try {
		console.log(`\n▸ sectors — ${files.length} syntheses under ${RESEARCH_DIR}`);
		console.log(`  ${excluded} retained copy directories (history/archive/validation) excluded\n`);
		for (const file of files) {
			const compiled = join(work, `${file.slug}.json`);
			const compile = compileSynthesis(file.path, compiled);
			if (compile.code !== 0 || !existsSync(compiled)) {
				rows.push({
					slug: file.slug,
					verdict: 'COMPILE FAILED',
					detail: compile.out.trim().split('\n').filter(Boolean).pop() ?? ''
				});
				continue;
			}

			// Each proof insists on an empty database, so reset between files.
			resetDatabase(container, proof.database);

			const result = runProof(proof, { MONTSEL_CANDIDATE_FILE: compiled });
			if (result.code === 0)
				rows.push({ slug: file.slug, verdict: 'APPROVABLE', detail: '' });
			else if (result.code === 2)
				rows.push({
					slug: file.slug,
					verdict: 'REFUSED',
					detail: result.out.split('\n').map((line) => line.trim())
						.filter((line) => /is not approved|must be|has no|blocks approval|not evidence-governed/.test(line))
						.pop() ?? ''
				});
			else
				rows.push({
					slug: file.slug,
					verdict: 'IMPORT FAILED',
					detail:
						result.out
							.split('\n')
							.map((line) => line.trim())
							.filter((line) => line && !/^Bun v/.test(line) && !/^\$ /.test(line))
							.pop() ?? ''
				});
		}

		const width = Math.max(...rows.map((row) => row.slug.length));
		for (const row of rows) console.log(`  ${row.slug.padEnd(width)}  ${row.verdict.padEnd(13)}  ${row.detail}`);
		// Two canonical files can claim the same slug; the coverage figure is per
		// sector, not per file.
		const bySlug = new Map<string, string>();
		for (const row of rows) {
			const existing = bySlug.get(row.slug);
			if (existing !== 'APPROVABLE') bySlug.set(row.slug, row.verdict);
		}
		const duplicates = [...bySlug.keys()].filter(
			(slug) => rows.filter((row) => row.slug === slug).length > 1
		);
		const approvable = [...bySlug.values()].filter((verdict) => verdict === 'APPROVABLE').length;
		console.log(`\n  ${approvable}/${bySlug.size} sectors can be imported and approved.`);
		if (duplicates.length)
			console.log(`  ${duplicates.length} slug(s) have more than one file: ${duplicates.join(', ')}`);
		console.log('  The rest cannot feed a report until the candidate is fixed.\n');
		return approvable === bySlug.size ? 0 : 2;
	} finally {
		rmSync(work, { recursive: true, force: true });
		if (options.keep) console.log(`  kept ${container} on port ${proof.port}`);
		else stopContainer(container);
	}
}

async function main(): Promise<void> {
	if (!dockerAvailable()) {
		console.error('Docker is not available. These proofs need a throwaway Postgres container.');
		process.exitCode = 2;
		return;
	}

	const keep = process.argv.includes('--keep');
	const target = process.argv.slice(2).find((value) => !value.startsWith('-'));

	if (!target) {
		list();
		return;
	}

	if (target === 'sectors') {
		process.exitCode = await sectors({ keep });
		return;
	}

	if (target === 'all') {
		let failed = 0;
		for (const name of Object.keys(PROOFS)) {
			if (PROOFS[name]!.needs) continue;
			const code = await run(name, { keep });
			if (code !== 0) {
				failed++;
				console.error(`\n✗ ${name} exited ${code}`);
			}
		}
		process.exitCode = failed === 0 ? 0 : 1;
		return;
	}

	process.exitCode = await run(target, { keep });
}

main().catch((error) => {
	console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
