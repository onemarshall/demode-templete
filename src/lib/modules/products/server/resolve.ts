/**
 * Brand product access resolution.
 *
 * Combines the code-owned registry with the brand's live entitlement and work
 * rows. Runs after `requireBrandAccess`, so the context is already authorised.
 */

import type { OperationContext } from '#lib/modules/tenancy/server/context.js';
import { PRODUCTS } from '../shared/registry.js';
import { buildProductAccess, type EntitlementRecord, type ProductAccess } from '../shared/access.js';
import { listBrandEntitlements, listBrandWorkItems } from './repository.js';

export interface BrandProductState {
	products: ProductAccess[];
	entitlements: EntitlementRecord[];
}

export async function resolveBrandProducts(ctx: OperationContext): Promise<BrandProductState> {
	const [entitlements, workItems] = await Promise.all([
		listBrandEntitlements(ctx),
		listBrandWorkItems(ctx),
	]);
	const byKey = new Map(entitlements.map((entitlement) => [entitlement.productKey, entitlement]));
	return {
		entitlements,
		products: PRODUCTS.map((product) =>
			buildProductAccess(product, byKey.get(product.key), workItems),
		),
	};
}
