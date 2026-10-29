import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('#lib/platform/database/db.js', () => ({
	getDB: async () => ({ query: mocks.query })
}));
vi.mock('#lib/modules/tenancy/server/better-auth-adapter.js', () => ({
	findMembership: async (userId: string, organisationId: string) => ({
		id: `member-${organisationId}`,
		organizationId: organisationId,
		userId,
		role: 'owner',
		createdAt: new Date()
	}),
	getPersonalOrganisationOwner: async () => null
}));

import { requireBrandAccess } from '#lib/modules/tenancy/server/context.js';
import { BrandAccessError } from '#lib/modules/tenancy/server/errors.js';
import { readOutputReport, readSharedReport } from '../report.js';

const versionRow = {
	outputId: 'output_a',
	versionNumber: 2,
	contentHash: 'a'.repeat(64),
	contentMarkdown: '# Reading\n\nBody.',
	createdAt: new Date('2026-10-01T00:00:00Z')
};

function brandRows(): void {
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "brand"'))
			return {
				rows: [
					{
						id: 'brand-a',
						organisationId: 'org-a',
						name: 'Pilot',
						slug: 'pilot',
						createdBy: 'user-a',
						status: 'active'
					}
				]
			};
		if (sql.includes('FROM "brand_member"'))
			return {
				rows: [
					{
						id: 'assignment-a',
						brandId: 'brand-a',
						userId: 'user-a',
						role: 'brand_admin',
						status: 'active',
						expiresAt: null,
						grantSource: 'backfill',
						grantedBy: null,
						provisioningId: null,
						createdAt: new Date(),
						updatedAt: new Date()
					}
				]
			};
		if (sql.includes('FROM "output_version"')) return { rows: [versionRow] };
		return { rows: [] };
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	brandRows();
});

describe('readOutputReport', () => {
	it('rejects a context that was not issued by requireBrandAccess', async () => {
		const forged = { userId: 'user-a', organisationId: 'org-a', brandId: 'brand-a' } as never;
		await expect(readOutputReport(forged, 'output_a')).rejects.toThrow(BrandAccessError);
		expect(mocks.query).not.toHaveBeenCalledWith(
			expect.stringContaining('FROM "output_version"'),
			expect.anything(),
		);
	});

	it('constrains both brand and organisation and renders the stored markdown', async () => {
		const ctx = await requireBrandAccess('user-a', 'brand-a', 'brand:read');
		const report = await readOutputReport(ctx, 'output_a');

		expect(report).not.toBeNull();
		expect(report?.versionNumber).toBe(2);
		expect(report?.contentHtml).toContain('<h1>Reading</h1>');
		const [, params] = mocks.query.mock.calls.at(-1) as [string, unknown[]];
		expect(params).toEqual(['output_a', 'brand-a', 'org-a']);
	});

	it('returns null when the version belongs to another brand', async () => {
		const ctx = await requireBrandAccess('user-a', 'brand-a', 'brand:read');
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"'))
				return {
					rows: [
						{
							id: 'brand-a',
							organisationId: 'org-a',
							name: 'Pilot',
							slug: 'pilot',
							createdBy: 'user-a',
							status: 'active'
						}
					]
				};
			if (sql.includes('FROM "brand_member"')) return { rows: [{ id: 'a', brandId: 'brand-a', userId: 'user-a', role: 'brand_admin', status: 'active', expiresAt: null, grantSource: 'backfill', grantedBy: null, provisioningId: null, createdAt: new Date(), updatedAt: new Date() }] };
			return { rows: [] };
		});

		expect(await readOutputReport(ctx, 'output_a')).toBeNull();
	});
});

describe('readSharedReport', () => {
	it('requires can_share and resolves a known product key', async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "output"'))
				return {
					rows: [
						{
							...versionRow,
							title: 'Hestia — Signal reading',
							productKey: 'diagnostic.signal',
							format: 'report',
							outputCreatedAt: new Date('2026-09-30T00:00:00Z')
						}
					]
				};
			return { rows: [] };
		});

		const report = await readSharedReport('slug-a');
		expect(report?.title).toBe('Hestia — Signal reading');
		const [sql] = mocks.query.mock.calls.at(-1) as [string, unknown[]];
		expect(sql).toContain('"can_share" = true');
	});

	it('returns null for an unknown slug', async () => {
		mocks.query.mockResolvedValue({ rows: [] });
		expect(await readSharedReport('missing')).toBeNull();
	});
});
