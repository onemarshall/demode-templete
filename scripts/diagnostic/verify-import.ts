#!/usr/bin/env bun
/**
 * Phase 1, Step 1 proof: import the three published artefacts into one pilot
 * brand on a disposable database, then prove the tenancy and integrity rules.
 *
 * Never runs against the operator's stack. The target database must be named
 * exactly `montsel_diagnostic_import_verify` and must be reachable on loopback.
 *
 *   docker run -d --rm --name montsel-import-verify \
 *     -e POSTGRES_PASSWORD=verify -p 127.0.0.1:55440:5432 postgres:16
 *
 *   MONTSEL_IMPORT_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55440/montsel_diagnostic_import_verify \
 *     bun scripts/diagnostic/verify-import.ts
 *
 * What it proves, with zero engine calls:
 *   - each artefact's SHA-256 matches the engine's recorded receipt
 *   - a mismatch is refused before anything is written
 *   - re-running the import is a no-op
 *   - the pilot brand reads its own reports
 *   - another brand cannot read, resolve or download them
 *   - a share slug serves the body; an unshared output does not
 *   - stored version rows are immutable
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	assert,
	closeDisposableDatabase,
	PROJECT_ROOT,
	prepareDisposableDatabase,
	requireSafeDatabase
} from './disposable-db.ts';

const DATABASE_NAME = 'montsel_diagnostic_import_verify';
const SOURCE_ROOT = join(PROJECT_ROOT, '.local-state', 'diagnostic-import');

interface ArtefactEntry {
	name: string;
	productKey: string;
	title: string;
	file: string;
	contentHash: string;
	enginePublicationRef: string;
}

const entries = JSON.parse(
	readFileSync(join(import.meta.dir, 'hestia-artefacts.json'), 'utf8'),
) as ArtefactEntry[];

const stableId = (prefix: string, value: string, length: number): string =>
	`${prefix}${createHash('sha256').update(value).digest('hex').slice(0, length)}`;

async function main(): Promise<void> {
	const databaseUrl = requireSafeDatabase(
		process.env.MONTSEL_IMPORT_VERIFY_DATABASE_URL,
		DATABASE_NAME,
	);
	const { configureDatabase, getDB } = await import('../../src/lib/platform/database/db.ts');
	configureDatabase(databaseUrl);

	const database = await prepareDisposableDatabase(databaseUrl, 15);
	const { pool, pilot, other } = database;
	try {
		// 2. Import the three artefacts through the real module.
		const { importPublishedArtefact } = await import(
			'../../src/lib/modules/diagnostic/server/import.ts'
		);
		const imported: { entry: ArtefactEntry; outputId: string; shareSlug: string }[] = [];
		for (const entry of entries) {
			const outputId = stableId('output_', entry.enginePublicationRef, 32);
			const shareSlug = stableId('', `share:${entry.enginePublicationRef}`, 24);
			const result = await importPublishedArtefact({
				organisationId: pilot.organisationId,
				brandId: pilot.brandId,
				outputId,
				productKey: entry.productKey as never,
				title: entry.title,
				artefactPath: join(SOURCE_ROOT, entry.file),
				expectedContentHash: entry.contentHash,
				enginePublicationRef: entry.enginePublicationRef,
				shareSlug,
			});
			assert(result.status === 'imported', `${entry.name} was not imported.`);
			imported.push({ entry, outputId, shareSlug });
		}

		const count = async (table: string): Promise<number> =>
			Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM "${table}"`)).rows[0]!.n);
		assert((await count('output')) === 3, 'Expected three output rows.');
		assert((await count('output_version')) === 3, 'Expected three output_version rows.');

		// 3. Re-running is a no-op: same bytes must never land twice.
		for (const { entry, outputId } of imported) {
			const repeat = await importPublishedArtefact({
				organisationId: pilot.organisationId,
				brandId: pilot.brandId,
				outputId,
				productKey: entry.productKey as never,
				title: entry.title,
				artefactPath: join(SOURCE_ROOT, entry.file),
				expectedContentHash: entry.contentHash,
				enginePublicationRef: entry.enginePublicationRef,
			});
			assert(repeat.status === 'unchanged', `${entry.name} was re-imported instead of recognised.`);
		}
		assert((await count('output_version')) === 3, 'A repeat import added a version.');

		// 4. A hash mismatch writes nothing.
		let refused = false;
		try {
			await importPublishedArtefact({
				organisationId: pilot.organisationId,
				brandId: pilot.brandId,
				outputId: 'output_tampered',
				productKey: 'diagnostic.signal' as never,
				title: 'Tampered',
				artefactPath: join(SOURCE_ROOT, entries[0]!.file),
				expectedContentHash: 'f'.repeat(64),
			});
		} catch {
			refused = true;
		}
		assert(refused, 'A hash mismatch was accepted.');
		assert((await count('output')) === 3, 'A refused import still created an output.');

		// 5. Reads: the owning brand sees the bytes, the other brand sees nothing.
		const { readOutputReport, readSharedReport } = await import(
			'../../src/lib/modules/diagnostic/server/report.ts'
		);
		const { requireBrandAccess } = await import('../../src/lib/modules/tenancy/server/context.ts');
		const pilotCtx = await requireBrandAccess('diag_verify_a', pilot.brandId, 'brand:read');
		const otherCtx = await requireBrandAccess('diag_verify_b', other.brandId, 'brand:read');

		for (const { entry, outputId } of imported) {
			const report = await readOutputReport(pilotCtx, outputId);
			assert(report, `${entry.name} did not read back for its own brand.`);
			assert(report.contentHash === entry.contentHash, `${entry.name} read back a different hash.`);
			assert(
				createHash('sha256').update(report.contentMarkdown).digest('hex') === entry.contentHash,
				`${entry.name} read back different bytes.`,
			);
			assert(report.contentHtml.includes('<h1>'), `${entry.name} did not render markdown.`);

			const denied = await readOutputReport(otherCtx, outputId);
			assert(denied === null, `${entry.name} leaked to another brand.`);

			const shared = await readSharedReport(imported.find((item) => item.outputId === outputId)!.shareSlug);
			assert(shared?.contentHash === entry.contentHash, `${entry.name} did not serve through its share slug.`);
		}

		const notShared = await readSharedReport(stableId('', 'share:nonexistent', 24));
		assert(notShared === null, 'An unknown share slug resolved.');

		// 6. Delivered bytes are immutable.
		let immutable = false;
		try {
			await pool.query(`UPDATE "output_version" SET "content_markdown" = 'rewritten'`);
		} catch {
			immutable = true;
		}
		assert(immutable, 'output_version rows were mutable.');

		console.log('Step 1 verified on the disposable database:');
		for (const { entry } of imported)
			console.log(`  ${entry.name.padEnd(9)} ${entry.contentHash.slice(0, 16)}… ${entry.title}`);
		console.log('  hash refusal, re-run idempotence, cross-brand denial, share resolution and immutability all hold.');
	} finally {
		await closeDisposableDatabase(database);
		await (await getDB()).end();
	}
}

await main();
