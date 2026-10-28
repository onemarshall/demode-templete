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

import { requireBrandAccess, type OperationContext } from '#lib/modules/tenancy/server/context.js';
import { BrandAccessError } from '#lib/modules/tenancy/server/errors.js';
import {
	countBrandOutputs,
	findBrandOutput,
	listBrandEntitlements,
	listBrandOutputs,
	listBrandWorkItems,
	listPendingApprovals
} from '../repository.js';

const brandRow = {
	id: 'brand-a',
	organisationId: 'org-a',
	name: 'Acme',
	slug: 'acme',
	createdBy: 'user-a',
	status: 'active'
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "brand"')) return { rows: [brandRow] };
		if (sql.includes('FROM "brand_member"')) {
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
		}
		return { rows: [] };
	});
});

async function context(): Promise<OperationContext> {
	return requireBrandAccess('user-a', 'brand-a', 'brand:read');
}

function lastCall(): [string, unknown[]] {
	const call = mocks.query.mock.calls.at(-1) as [string, unknown[]];
	return [call[0], call[1]];
}

describe('context-required product repositories', () => {
	it('rejects a context that was not issued by requireBrandAccess', async () => {
		const forged = { userId: 'user-a', organisationId: 'org-a', brandId: 'brand-a' } as never;
		await expect(listBrandEntitlements(forged)).rejects.toThrow(BrandAccessError);
		expect(mocks.query).not.toHaveBeenCalledWith(expect.stringContaining('product_entitlement'), expect.anything());
	});

	it('scopes entitlement reads to both the brand and its organisation', async () => {
		const ctx = await context();
		await listBrandEntitlements(ctx);
		const [sql, params] = lastCall();
		expect(sql).toContain('"brand_id" = $1 AND "organisation_id" = $2');
		expect(sql).toContain('"status" = \'active\'');
		expect(params).toEqual(['brand-a', 'org-a']);
	});

	it('returns only live entitlements and drops unknown product keys', async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"')) return { rows: [brandRow] };
			if (sql.includes('FROM "brand_member"')) {
				return { rows: [{ id: 'a', brandId: 'brand-a', userId: 'user-a', role: 'brand_admin', status: 'active', expiresAt: null }] };
			}
			return {
				rows: [
					{ productKey: 'diagnostic.signal', status: 'active', effectiveFrom: new Date('2026-01-01'), effectiveTo: null },
					{ productKey: 'legacy.removed_product', status: 'active', effectiveFrom: new Date('2026-01-01'), effectiveTo: null }
				]
			};
		});
		const ctx = await context();
		const entitlements = await listBrandEntitlements(ctx);
		expect(entitlements.map((entry) => entry.productKey)).toEqual(['diagnostic.signal']);
	});

	it('scopes work item reads to the context brand', async () => {
		const ctx = await context();
		await listBrandWorkItems(ctx);
		const [sql, params] = lastCall();
		expect(sql).toContain('FROM "work_item"');
		expect(params).toEqual(['brand-a', 'org-a']);
	});

	it('passes the brand scope alongside the family and search filters', async () => {
		const ctx = await context();
		await listBrandOutputs(ctx, { family: 'tool', search: 'contract', sort: 'title' });
		const [sql, params] = lastCall();
		expect(sql).toContain('o."brand_id" = $1 AND o."organisation_id" = $2');
		expect(sql).toContain('ORDER BY o."title" ASC');
		expect(params).toEqual(['brand-a', 'org-a', null, 'tool', 'contract', 50]);
	});

	it('looks an output up by id, brand and organisation together', async () => {
		const ctx = await context();
		await findBrandOutput(ctx, 'output-1');
		const [sql, params] = lastCall();
		expect(sql).toContain('"id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3');
		expect(params).toEqual(['output-1', 'brand-a', 'org-a']);
	});

	it('returns null for an output that is not in the context brand', async () => {
		const ctx = await context();
		expect(await findBrandOutput(ctx, 'other-brand-output')).toBeNull();
	});

	it('counts outputs per family inside the brand only', async () => {
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"')) return { rows: [brandRow] };
			if (sql.includes('FROM "brand_member"')) {
				return { rows: [{ id: 'a', brandId: 'brand-a', userId: 'user-a', role: 'brand_admin', status: 'active', expiresAt: null }] };
			}
			return {
				rows: [
					{ family: 'diagnostic', count: 2 },
					{ family: 'tool', count: 1 }
				]
			};
		});
		const ctx = await context();
		const counts = await countBrandOutputs(ctx);
		expect(counts).toEqual({ diagnostic: 2, strategy: 0, tool: 1 });
		const [sql, params] = lastCall();
		expect(sql).toContain('GROUP BY p."family"');
		expect(params).toEqual(['brand-a', 'org-a']);
	});

	it('returns only pending approvals for the context brand', async () => {
		const ctx = await context();
		await listPendingApprovals(ctx);
		const [sql, params] = lastCall();
		expect(sql).toContain('"state" = \'requested\'');
		expect(params).toEqual(['brand-a', 'org-a']);
	});
});
