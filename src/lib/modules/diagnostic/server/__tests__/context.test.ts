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
import { buildEngineEnvelope, findBrandEngineRef } from '../context.js';

const brand = {
	id: 'brand-a',
	organisationId: 'org-a',
	name: 'Hestia',
	slug: 'hestia',
	createdBy: 'user-a',
	status: 'active'
};

const assignment = {
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
};

function route(rows: { envelope?: unknown[]; engineRef?: unknown[] }): void {
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "diagnostic_engagement"')) return { rows: rows.envelope ?? [] };
		if (sql.includes('FROM "brand"')) return { rows: [brand] };
		if (sql.includes('FROM "brand_member"')) return { rows: [assignment] };
		if (sql.includes('FROM "brand_engine_ref"')) return { rows: rows.engineRef ?? [] };
		return { rows: [] };
	});
}

async function context() {
	return requireBrandAccess('user-a', 'brand-a', 'brand:read');
}

beforeEach(() => {
	vi.clearAllMocks();
	route({});
});

describe('buildEngineEnvelope', () => {
	it('rejects a forged context', async () => {
		const forged = { userId: 'user-a', organisationId: 'org-a', brandId: 'brand-a' } as never;
		await expect(buildEngineEnvelope(forged, 'eng_a')).rejects.toThrow(BrandAccessError);
		expect(mocks.query).not.toHaveBeenCalledWith(
			expect.stringContaining('diagnostic_engagement'),
			expect.anything()
		);
	});

	it('refuses when the brand has no engine identity', async () => {
		const ctx = await context();
		route({
			envelope: [
				{ engagementId: 'eng_a', dataClassification: 'client_confidential', engineBrandSlug: null }
			]
		});
		await expect(buildEngineEnvelope(ctx, 'eng_a')).rejects.toThrow(/no engine identity/);
	});

	it('refuses an engagement belonging to another brand', async () => {
		const ctx = await context();
		route({ envelope: [] });
		await expect(buildEngineEnvelope(ctx, 'eng_other')).rejects.toThrow(/Engagement unavailable/);
		const [, params] = mocks.query.mock.calls.at(-1) as [string, unknown[]];
		expect(params).toEqual(['eng_other', 'brand-a', 'org-a']);
	});

	it('carries only the three facts the engine is allowed to receive', async () => {
		const ctx = await context();
		route({
			envelope: [
				{ engagementId: 'eng_a', dataClassification: 'client_confidential', engineBrandSlug: 'hestia' }
			]
		});
		expect(await buildEngineEnvelope(ctx, 'eng_a')).toEqual({
			engineBrandRef: 'hestia',
			engagementRef: 'eng_a',
			dataClassification: 'client_confidential'
		});
	});
});

describe('findBrandEngineRef', () => {
	it('returns the mapped engine brand for the context brand', async () => {
		const ctx = await context();
		route({ engineRef: [{ engineBrandId: 2, engineBrandSlug: 'hestia' }] });
		expect(await findBrandEngineRef(ctx)).toEqual({ engineBrandId: 2, engineBrandSlug: 'hestia' });
	});

	it('returns null when the brand is unmapped', async () => {
		const ctx = await context();
		route({ engineRef: [] });
		expect(await findBrandEngineRef(ctx)).toBeNull();
	});
});
