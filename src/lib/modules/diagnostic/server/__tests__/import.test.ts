import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
	readFile: vi.fn(),
	query: vi.fn(),
	release: vi.fn()
}));

vi.mock('node:fs/promises', () => ({ readFile: mocks.readFile }));
vi.mock('#lib/platform/database/db.js', () => ({
	getDB: async () => ({ connect: async () => ({ query: mocks.query, release: mocks.release }) })
}));

import { contentHash, importPublishedArtefact } from '../import.js';

const BYTES = '# Hestia Signal\n\nA reading.\n';
const HASH = createHash('sha256').update(BYTES).digest('hex');

const baseInput = {
	organisationId: 'org-a',
	brandId: 'brand-a',
	outputId: 'output_a',
	productKey: 'diagnostic.signal' as const,
	title: 'Hestia — Signal reading',
	artefactPath: '/tmp/artefact.md',
	expectedContentHash: HASH,
	enginePublicationRef: 'run-1',
	shareSlug: 'slug-a'
};

interface QueryResult {
	rows: unknown[];
}

/** Minimal SQL router so each test states only the rows its step needs. */
function respond(handlers: {
	existingOutput?: { organisationId: string; brandId: string; productKey: string } | null;
	duplicate?: { outputId: string; versionNumber: number } | null;
	nextVersion?: number;
}): void {
	mocks.query.mockImplementation(async (sql: string): Promise<QueryResult> => {
		if (sql.includes('FROM "output" WHERE "id"'))
			return { rows: handlers.existingOutput ? [handlers.existingOutput] : [] };
		if (sql.includes('FROM "output_version" WHERE "content_hash"'))
			return { rows: handlers.duplicate ? [handlers.duplicate] : [] };
		if (sql.includes('COALESCE(MAX'))
			return { rows: [{ versionNumber: handlers.nextVersion ?? 1 }] };
		return { rows: [] };
	});
}

function executed(sqlFragment: string): boolean {
	return mocks.query.mock.calls.some(([sql]) => String(sql).includes(sqlFragment));
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readFile.mockResolvedValue(Buffer.from(BYTES));
});

describe('importPublishedArtefact', () => {
	it('refuses bytes that do not match the recorded hash without touching the database', async () => {
		await expect(
			importPublishedArtefact({ ...baseInput, expectedContentHash: 'f'.repeat(64) }),
		).rejects.toThrow(/does not match its recorded hash/);
		// Verification happens before a connection is opened, so nothing can be written.
		expect(mocks.query).not.toHaveBeenCalled();
	});

	it('stores the verified bytes as version one for a new output', async () => {
		respond({ existingOutput: null, duplicate: null, nextVersion: 1 });
		const result = await importPublishedArtefact(baseInput);

		expect(result).toEqual({
			status: 'imported',
			outputId: 'output_a',
			versionNumber: 1,
			contentHash: HASH
		});
		expect(executed('INSERT INTO "output"')).toBe(true);
		expect(executed('INSERT INTO "output_version"')).toBe(true);
		const insert = mocks.query.mock.calls.find(([sql]) =>
			String(sql).includes('INSERT INTO "output_version"'),
		);
		expect(insert?.[1]).toContain(HASH);
		expect(insert?.[1]).toContain(BYTES);
	});

	it('treats the same bytes at the same output as unchanged instead of a new version', async () => {
		respond({
			existingOutput: { organisationId: 'org-a', brandId: 'brand-a', productKey: 'diagnostic.signal' },
			duplicate: { outputId: 'output_a', versionNumber: 1 }
		});
		const result = await importPublishedArtefact(baseInput);

		expect(result.status).toBe('unchanged');
		expect(executed('INSERT INTO "output_version"')).toBe(false);
	});

	it('refuses bytes already stored against a different output', async () => {
		respond({
			existingOutput: { organisationId: 'org-a', brandId: 'brand-a', productKey: 'diagnostic.signal' },
			duplicate: { outputId: 'output_other', versionNumber: 1 }
		});

		await expect(importPublishedArtefact(baseInput)).rejects.toThrow(
			/already stored against output output_other/,
		);
		expect(executed('INSERT INTO "output_version"')).toBe(false);
	});

	it('refuses to reuse an output id that belongs to another brand', async () => {
		respond({
			existingOutput: { organisationId: 'org-b', brandId: 'brand-b', productKey: 'diagnostic.signal' }
		});

		await expect(importPublishedArtefact(baseInput)).rejects.toThrow(
			/already belongs to another brand or product/,
		);
		expect(executed('INSERT INTO "output"')).toBe(false);
	});

	it('rejects an unknown product key before reading anything', async () => {
		await expect(
			importPublishedArtefact({ ...baseInput, productKey: 'diagnostic.nope' as never }),
		).rejects.toThrow(/Unknown product key/);
		expect(mocks.readFile).not.toHaveBeenCalled();
	});

	it('records the provider and model that produced the bytes', async () => {
		respond({ existingOutput: null, duplicate: null, nextVersion: 1 });
		await importPublishedArtefact({
			...baseInput,
			provenance: { provider: 'openai', model: 'gpt-6.1-sol' }
		});

		const insert = mocks.query.mock.calls.find(([sql]) =>
			String(sql).includes('INSERT INTO "output_version"'),
		);
		expect(insert?.[1]).toContain('openai');
		expect(insert?.[1]).toContain('gpt-6.1-sol');
	});

	it('stores no provenance when the caller cannot know it, and still imports', async () => {
		// Read-compatibility: the previous release ignores these columns, and the
		// engine's contract does not expose per-run provenance yet.
		respond({ existingOutput: null, duplicate: null, nextVersion: 1 });
		const result = await importPublishedArtefact(baseInput);

		expect(result.status).toBe('imported');
		const insert = mocks.query.mock.calls.find(([sql]) =>
			String(sql).includes('INSERT INTO "output_version"'),
		);
		expect(insert?.[1].slice(-2)).toEqual([null, null]);
	});

	it('refuses half a provenance record instead of storing an unknown model', async () => {
		respond({ existingOutput: null, duplicate: null, nextVersion: 1 });
		await expect(
			importPublishedArtefact({
				...baseInput,
				provenance: { provider: 'openai', model: '  ' }
			}),
		).rejects.toThrow(/provenance\.model must be non-empty/);
		expect(executed('INSERT INTO "output_version"')).toBe(false);
	});

	it('stores a section as structure alongside its markdown anchor', async () => {
		respond({ existingOutput: null, duplicate: null, nextVersion: 1 });
		await importPublishedArtefact({
			...baseInput,
			sections: [
				{
					key: 'coverage',
					heading: 'What was reviewed',
					order: 1,
					structuredData: { kind: 'coverage', reviewed: 12, omitted: 2 }
				}
			]
		});

		const section = mocks.query.mock.calls.find(([sql]) =>
			String(sql).includes('INSERT INTO "output_version_section"'),
		);
		expect(section?.[1]).toContain(JSON.stringify({ kind: 'coverage', reviewed: 12, omitted: 2 }));
	});
});

describe('contentHash', () => {
	it('hashes the exact bytes, so a line-ending change is a different report', () => {
		expect(contentHash(BYTES)).toBe(HASH);
		expect(contentHash(BYTES.replace('\n', '\r\n'))).not.toBe(HASH);
	});
});
