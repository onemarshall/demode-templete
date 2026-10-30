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
import { findStartPayment } from '../payments.js';

function identity(sql: string) {
	if (sql.includes('FROM "brand"'))
		return {
			rows: [
				{
					id: 'brand-a',
					organisationId: 'org-a',
					name: 'Acme',
					slug: 'acme',
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
	return null;
}

function withEntitlement(row: Record<string, unknown> | null) {
	mocks.query.mockImplementation(async (sql: string) => {
		const known = identity(sql);
		if (known) return known;
		if (sql.includes('FROM "product_entitlement"'))
			return { rows: row ? [row] : [] };
		return { rows: [] };
	});
}

async function context() {
	return requireBrandAccess('user-a', 'brand-a', 'brand:read');
}

beforeEach(() => {
	vi.clearAllMocks();
	withEntitlement(null);
});

describe('start payment gate', () => {
	it('returns the activated purchase behind a purchase entitlement', async () => {
		withEntitlement({
			entitlementId: 'ent-a',
			purchaseId: 'pur-a',
			source: 'purchase'
		});
		expect(await findStartPayment(await context(), 'diagnostic.signal')).toEqual({
			entitlementId: 'ent-a',
			purchaseId: 'pur-a'
		});
	});

	it('refuses a purchase entitlement with no activated purchase', async () => {
		withEntitlement({
			entitlementId: 'ent-a',
			purchaseId: null,
			source: 'purchase'
		});
		expect(await findStartPayment(await context(), 'diagnostic.signal')).toBeNull();
	});

	it('allows an explicit grant without a purchase', async () => {
		withEntitlement({
			entitlementId: 'ent-grant',
			purchaseId: null,
			source: 'grant'
		});
		expect(await findStartPayment(await context(), 'diagnostic.signal')).toEqual({
			entitlementId: 'ent-grant',
			purchaseId: null
		});
	});

	it('returns null when no entitlement exists', async () => {
		withEntitlement(null);
		expect(await findStartPayment(await context(), 'diagnostic.signal')).toBeNull();
	});
});
