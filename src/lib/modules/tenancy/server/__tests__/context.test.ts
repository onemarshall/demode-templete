import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), findMembership: vi.fn() }));
vi.mock('#lib/platform/database/db.js', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('../better-auth-adapter.js', () => ({ findMembership: mocks.findMembership }));

import { assertOperationAction, requireBrandAccess } from '../context.js';
import { requireAction } from '../repositories.js';
import { BrandAccessError } from '../errors.js';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findMembership.mockResolvedValue({ id: 'member-1' });
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "brand"')) {
			return { rows: [{ id: 'brand-1', organisationId: 'org-1', name: 'Brand', slug: 'brand', createdBy: 'owner', status: 'active' }] };
		}
		if (sql.includes('FROM "brand_member"')) {
			return { rows: [{ id: 'assignment-1', brandId: 'brand-1', userId: 'user-1', role: 'brand_admin', status: 'active', expiresAt: null, grantSource: 'managed', grantedBy: 'owner', provisioningId: null, createdAt: new Date(), updatedAt: new Date() }] };
		}
		return { rows: [] };
	});
});

describe('brand operation context', () => {
	it('mints a frozen runtime-branded context scoped to the requested action', async () => {
		const context = await requireBrandAccess('user-1', 'brand-1', 'brand:read');
		expect(Object.isFrozen(context)).toBe(true);
		expect(context.authorizedAction).toBe('brand:read');
		expect(() => assertOperationAction(context, 'brand:read')).not.toThrow();
		expect(() => requireAction(context, 'brand:update')).toThrow(BrandAccessError);
	});

	it('rejects an object forged with a TypeScript cast', () => {
		const forged = { userId: 'user-1', organisationId: 'org-1', brandId: 'brand-1', brandSlug: 'brand', brandRole: 'brand_admin', authorizedAction: 'audit:read' };
		expect(() => assertOperationAction(forged as never, 'audit:read')).toThrow(BrandAccessError);
	});

	it('re-resolves brand, membership, and assignment on every operation', async () => {
		await requireBrandAccess('user-1', 'brand-1', 'brand:read');
		await requireBrandAccess('user-1', 'brand-1', 'brand:read');
		expect(mocks.query).toHaveBeenCalledTimes(4);
		expect(mocks.findMembership).toHaveBeenCalledTimes(2);
	});

	it('fails closed when the current membership has been revoked', async () => {
		mocks.findMembership.mockResolvedValue(null);
		await expect(requireBrandAccess('user-1', 'brand-1', 'brand:read')).rejects.toThrow(BrandAccessError);
		expect(mocks.query).toHaveBeenCalledTimes(1);
	});
});
