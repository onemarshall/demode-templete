/**
 * Published artefact → `output` + `output_version` (plan Workstream 5).
 *
 * This is an ingestion boundary, not a user operation: an operator imports
 * bytes the engine already published, so there is no brand context to brand.
 * Tenancy is still enforced, by the caller naming an explicit
 * `(organisationId, brandId)` pair and by the composite foreign keys that
 * refuse any pair the `brand` table does not own.
 *
 * Two refusals are deliberate:
 *
 * - A hash mismatch writes nothing. The engine's `content_hash` is the receipt
 *   the client holds; an import that accepted different bytes would deliver a
 *   report the engine never published.
 * - Identical bytes never land twice. `output_version_content_hash_unique`
 *   makes that a database rule, and this function turns the collision into a
 *   readable refusal instead of a constraint error.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDB } from '#lib/platform/database/db.js';
import { isProductKey, type ProductKey } from '#lib/modules/products/shared/registry.js';

const CONTENT_HASH = /^[a-f0-9]{64}$/;

export interface ArtefactImport {
	organisationId: string;
	brandId: string;
	/** Stable per delivered artefact so a re-run targets the same output. */
	outputId: string;
	productKey: ProductKey;
	title: string;
	/** The engine's published file. Read only; this function never writes it. */
	artefactPath: string;
	/** `report_publications.content_hash` recorded by the engine. */
	expectedContentHash: string;
	/** The engine production run's public id, for lineage. */
	enginePublicationRef?: string | null;
	/** Present makes the output shareable at `/share/<slug>`. */
	shareSlug?: string | null;
}

export type ArtefactImportResult =
	| { status: 'imported'; outputId: string; versionNumber: number; contentHash: string }
	| { status: 'unchanged'; outputId: string; versionNumber: number; contentHash: string };

export function contentHash(bytes: string | Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function required(value: string, field: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${field} must be non-empty.`);
	return trimmed;
}

export async function importPublishedArtefact(input: ArtefactImport): Promise<ArtefactImportResult> {
	const organisationId = required(input.organisationId, 'organisationId');
	const brandId = required(input.brandId, 'brandId');
	const outputId = required(input.outputId, 'outputId');
	const title = required(input.title, 'title');
	const expectedContentHash = required(input.expectedContentHash, 'expectedContentHash');
	if (!isProductKey(input.productKey))
		throw new Error(`Unknown product key: ${String(input.productKey)}`);
	if (!CONTENT_HASH.test(expectedContentHash))
		throw new Error('expectedContentHash must be 64 lowercase hex characters.');

	// Read and verify before touching the database: a mismatch is not a partial import.
	const bytes = await readFile(input.artefactPath);
	const actualContentHash = contentHash(bytes);
	if (actualContentHash !== expectedContentHash)
		throw new Error(
			`Artefact content does not match its recorded hash (expected ${expectedContentHash}, found ${actualContentHash}). Nothing was imported.`,
		);
	const content = bytes.toString('utf8');

	const db = await getDB();
	const client = await db.connect();
	try {
		await client.query('BEGIN');

		const existing = await client.query<{
			organisationId: string;
			brandId: string;
			productKey: string;
		}>(
			`SELECT "organisation_id" AS "organisationId", "brand_id" AS "brandId",
			        "product_key" AS "productKey"
			 FROM "output" WHERE "id" = $1`,
			[outputId],
		);
		const output = existing.rows[0];
		if (output) {
			if (
				output.organisationId !== organisationId ||
				output.brandId !== brandId ||
				output.productKey !== input.productKey
			)
				throw new Error(
					`Output ${outputId} already belongs to another brand or product; refusing to reuse its id.`,
				);
		} else {
			await client.query(
				`INSERT INTO "output" ("id", "organisation_id", "brand_id", "product_key",
				                       "title", "format", "share_slug", "can_view", "can_share", "can_download")
				 VALUES ($1, $2, $3, $4, $5, 'report', $6, true, $7, true)`,
				[outputId, organisationId, brandId, input.productKey, title, input.shareSlug ?? null, Boolean(input.shareSlug)],
			);
		}

		const duplicate = await client.query<{ outputId: string; versionNumber: number }>(
			`SELECT "output_id" AS "outputId", "version_number" AS "versionNumber"
			 FROM "output_version" WHERE "content_hash" = $1`,
			[expectedContentHash],
		);
		const stored = duplicate.rows[0];
		if (stored) {
			if (stored.outputId !== outputId)
				throw new Error(
					`These bytes are already stored against output ${stored.outputId}; refusing to duplicate a delivered version.`,
				);
			await client.query('COMMIT');
			return { status: 'unchanged', outputId, versionNumber: stored.versionNumber, contentHash: expectedContentHash };
		}

		const next = await client.query<{ versionNumber: number }>(
			`SELECT COALESCE(MAX("version_number"), 0) + 1 AS "versionNumber"
			 FROM "output_version" WHERE "output_id" = $1`,
			[outputId],
		);
		const versionNumber = next.rows[0]?.versionNumber ?? 1;
		await client.query(
			`INSERT INTO "output_version" ("id", "organisation_id", "brand_id", "output_id",
			                               "version_number", "content_markdown", "content_hash", "engine_publication_ref")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				crypto.randomUUID(),
				organisationId,
				brandId,
				outputId,
				versionNumber,
				content,
				expectedContentHash,
				input.enginePublicationRef ?? null
			],
		);
		await client.query('COMMIT');
		return { status: 'imported', outputId, versionNumber, contentHash: expectedContentHash };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
