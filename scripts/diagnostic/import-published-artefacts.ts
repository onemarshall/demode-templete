#!/usr/bin/env bun
/**
 * Import the three published Diagnostic artefacts into one pilot brand.
 *
 * Phase 1, Step 1 of the integration plan. Read-only with respect to the
 * engine: this reads the bytes the engine already published and never calls
 * it. Each artefact's SHA-256 is checked against the engine's recorded
 * `report_publications.content_hash` before anything is written.
 *
 *   bun scripts/diagnostic/import-published-artefacts.ts \
 *     --brand=<brandId> --source-root=<dir> [--dry-run] [--manifest=<file>]
 *
 * `--source-root` is where the artefact files live. The repository default is
 * the gitignored `.local-state/diagnostic-import/`, so delivered client bytes
 * never enter git. The organisation is read from the brand row, never supplied:
 * a brand belongs to exactly one organisation, and that is the tenancy pair.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import * as dotenv from 'dotenv';
import { configureDatabase, getDB } from '../../src/lib/platform/database/db.ts';
import { importPublishedArtefact } from '../../src/lib/modules/diagnostic/server/import.ts';

dotenv.config();

interface ArtefactEntry {
	name: string;
	productKey: string;
	title: string;
	file: string;
	contentHash: string;
	enginePublicationRef: string;
}

const args = new Map(
	process.argv
		.slice(2)
		.filter((argument) => argument.startsWith('--'))
		.map((argument) => {
			const [key, ...rest] = argument.replace(/^--/, '').split('=');
			return [key, rest.join('=')];
		}),
);

const brandId = args.get('brand');
if (!brandId) throw new Error('Pass --brand=<brandId>. This script never guesses the pilot brand.');

const manifestPath = resolve(args.get('manifest') ?? join(import.meta.dir, 'hestia-artefacts.json'));
const sourceRoot = resolve(args.get('source-root') ?? join(import.meta.dir, '..', '..', '.local-state', 'diagnostic-import'));
const dryRun = args.has('dry-run');

const databaseUrl = process.env.BETTER_DATABASE_URL;
if (!databaseUrl) throw new Error('BETTER_DATABASE_URL is required');
if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))
	throw new Error('BETTER_DATABASE_URL must be a PostgreSQL connection');

const entries = JSON.parse(readFileSync(manifestPath, 'utf8')) as ArtefactEntry[];

/** Stable ids: re-running the import targets the same rows instead of creating new ones. */
const stableId = (prefix: string, value: string, length: number): string =>
	`${prefix}${createHash('sha256').update(value).digest('hex').slice(0, length)}`;

configureDatabase(databaseUrl);

const { rows } = await (await getDB()).query<{
	organisationId: string;
	name: string;
	slug: string;
}>(
	`SELECT "organisation_id" AS "organisationId", "name", "slug" FROM "brand" WHERE "id" = $1`,
	[brandId],
);
const brand = rows[0];
if (!brand) throw new Error(`No brand with id=${brandId}.`);
console.log(`Pilot brand: ${brand.name} (${brand.slug}) in organisation ${brand.organisationId}`);

for (const entry of entries) {
	const artefactPath = join(sourceRoot, entry.file);
	if (dryRun) {
		const bytes = readFileSync(artefactPath);
		const actual = createHash('sha256').update(bytes).digest('hex');
		if (actual !== entry.contentHash)
			throw new Error(`${entry.name}: hash mismatch (expected ${entry.contentHash}, found ${actual}).`);
		console.log(`dry run ${entry.name}: ${bytes.length} bytes, hash verified`);
		continue;
	}
	const result = await importPublishedArtefact({
		organisationId: brand.organisationId,
		brandId,
		outputId: stableId('output_', entry.enginePublicationRef, 32),
		productKey: entry.productKey as never,
		title: entry.title,
		artefactPath,
		expectedContentHash: entry.contentHash,
		enginePublicationRef: entry.enginePublicationRef,
		shareSlug: stableId('', `share:${entry.enginePublicationRef}`, 24),
	});
	console.log(
		`${result.status} ${entry.name}: output ${result.outputId} v${result.versionNumber} ${result.contentHash.slice(0, 12)}…`,
	);
}

await (await getDB()).end();
