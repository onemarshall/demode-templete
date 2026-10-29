import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));

vi.mock('#lib/platform/database/db.js', () => ({
	getDB: async () => ({
		query: mocks.query,
		connect: async () => ({ query: mocks.query, release: mocks.release })
	})
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
import {
	deriveWorkItemId,
	getEngagement,
	listEngagements,
	startEngagement
} from '../engagement.js';

const intake = {
	subjectUrl: 'https://www.hestia.org',
	commissionedDecision: 'Whether the public surface reads as a coherent multi-service charity.',
	decisionOwner: 'Managing director',
	intendedReader: 'Referrer or commissioner',
	decisionTiming: 'Before autumn planning',
	declaredScope: ['homepage', 'services']
};

const engagementRow = {
	id: 'eng_a',
	workItemId: 'wi_a',
	productKey: 'diagnostic.signal',
	family: 'signal',
	depth: 'automated',
	deliveryRoute: 'montsel_self_service',
	status: 'enquired',
	intake,
	dataClassification: 'client_confidential',
	engineRunRef: null,
	commissionedDecision: intake.commissionedDecision,
	decisionOwner: intake.decisionOwner,
	intendedReader: intake.intendedReader,
	decisionTiming: intake.decisionTiming,
	currency: null,
	amountMinor: null,
	createdAt: new Date('2026-10-29T00:00:00Z'),
	updatedAt: new Date('2026-10-29T00:00:00Z')
};

function brandRows(): void {
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "brand"'))
			return {
				rows: [
					{
						id: 'brand-a',
						organisationId: 'org-a',
						name: 'Hestia',
						slug: 'hestia',
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
		return { rows: [] };
	});
}

async function context() {
	return requireBrandAccess('user-a', 'brand-a', 'brand:read');
}

beforeEach(() => {
	vi.clearAllMocks();
	brandRows();
});

describe('deriveWorkItemId', () => {
	it('is stable across key order and distinguishes different intake', () => {
		const reordered = {
			decisionTiming: intake.decisionTiming,
			decisionOwner: intake.decisionOwner,
			subjectUrl: intake.subjectUrl,
			intendedReader: intake.intendedReader,
			commissionedDecision: intake.commissionedDecision,
			declaredScope: intake.declaredScope
		};
		expect(deriveWorkItemId('brand-a', 'diagnostic.signal', intake)).toBe(
			deriveWorkItemId('brand-a', 'diagnostic.signal', reordered)
		);
		expect(deriveWorkItemId('brand-a', 'diagnostic.signal', intake)).not.toBe(
			deriveWorkItemId('brand-a', 'diagnostic.signal', { ...intake, subjectUrl: 'https://other.org' })
		);
		expect(deriveWorkItemId('brand-b', 'diagnostic.signal', intake)).not.toBe(
			deriveWorkItemId('brand-a', 'diagnostic.signal', intake)
		);
	});
});

describe('startEngagement', () => {
	it('rejects a forged context before querying', async () => {
		const forged = { userId: 'user-a', organisationId: 'org-a', brandId: 'brand-a' } as never;
		await expect(startEngagement(forged, { productKey: 'diagnostic.signal', intake })).rejects.toThrow(
			BrandAccessError
		);
		expect(mocks.query).not.toHaveBeenCalledWith(
			expect.stringContaining('diagnostic_engagement'),
			expect.anything()
		);
	});

	it('refuses a variant that has no intake yet', async () => {
		const ctx = await context();
		await expect(startEngagement(ctx, { productKey: 'diagnostic.gap', intake })).rejects.toThrow(
			/Unknown diagnostic variant/
		);
	});

	it('refuses an intake the engine could not use', async () => {
		const ctx = await context();
		await expect(
			startEngagement(ctx, {
				productKey: 'diagnostic.signal',
				intake: { ...intake, subjectUrl: 'not-a-url' }
			})
		).rejects.toThrow();
	});

	it('creates the work item and the engagement in one transaction', async () => {
		const ctx = await context();
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"'))
				return {
					rows: [
						{
							id: 'brand-a',
							organisationId: 'org-a',
							name: 'Hestia',
							slug: 'hestia',
							createdBy: 'user-a',
							status: 'active'
						}
					]
				};
			if (sql.includes('FROM "brand_member"'))
				return {
					rows: [
						{
							id: 'a',
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
			if (sql.includes('FROM "diagnostic_engagement"') && sql.includes('FOR UPDATE'))
				return { rows: [] };
			if (sql.includes('INSERT INTO "diagnostic_engagement"')) return { rows: [engagementRow] };
			return { rows: [] };
		});

		const result = await startEngagement(ctx, { productKey: 'diagnostic.signal', intake });
		expect(result.status).toBe('started');
		expect(result.engagement.status).toBe('enquired');
		expect(result.engagement.deliveryRoute).toBe('montsel_self_service');
		expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO "work_item"'))).toBe(
			true
		);
		expect(mocks.query.mock.calls.some(([sql]) => String(sql) === 'COMMIT')).toBe(true);
	});

	it('resumes the existing engagement for an identical intake', async () => {
		const ctx = await context();
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"'))
				return {
					rows: [
						{
							id: 'brand-a',
							organisationId: 'org-a',
							name: 'Hestia',
							slug: 'hestia',
							createdBy: 'user-a',
							status: 'active'
						}
					]
				};
			if (sql.includes('FROM "brand_member"'))
				return {
					rows: [
						{
							id: 'a',
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
			if (sql.includes('FROM "diagnostic_engagement"')) return { rows: [engagementRow] };
			return { rows: [] };
		});

		const result = await startEngagement(ctx, { productKey: 'diagnostic.signal', intake });
		expect(result.status).toBe('resumed');
		expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO "work_item"'))).toBe(
			false
		);
	});
});

describe('reads', () => {
	it('scopes every query to the context brand and organisation', async () => {
		const ctx = await context();
		mocks.query.mockImplementation(async (sql: string) => {
			if (sql.includes('FROM "brand"'))
				return {
					rows: [
						{
							id: 'brand-a',
							organisationId: 'org-a',
							name: 'Hestia',
							slug: 'hestia',
							createdBy: 'user-a',
							status: 'active'
						}
					]
				};
			if (sql.includes('FROM "brand_member"'))
				return {
					rows: [
						{
							id: 'a',
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
			return { rows: [] };
		});

		expect(await getEngagement(ctx, 'eng_a')).toBeNull();
		const [, params] = mocks.query.mock.calls.at(-1) as [string, unknown[]];
		expect(params).toEqual(['eng_a', 'brand-a', 'org-a']);

		await listEngagements(ctx);
		const [, listParams] = mocks.query.mock.calls.at(-1) as [string, unknown[]];
		expect(listParams).toEqual(['brand-a', 'org-a', 50]);
	});
});
