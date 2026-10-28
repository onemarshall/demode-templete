import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { getProduct, isProductKey } from '#lib/modules/products/shared/registry.js';

/**
 * Destination for a product's primary action while its workflow is not built.
 * The spec keeps deep workflows out of scope, so this page states that plainly
 * instead of imitating an assessment.
 */
export const load: PageServerLoad = async (event) => {
	if (!isProductKey(event.params.productKey)) error(404, 'Product unavailable');
	const product = getProduct(event.params.productKey)!;

	// Visual Contract has a real workflow. Send stale links and bookmarks there
	// rather than showing "not open yet" for a tool that is open.
	if (product.key === 'tool.visual_contract') redirect(303, '/app/tools/visual-contract');

	const { ctx } = await resolveActiveBrand(event);
	const { products } = await resolveBrandProducts(ctx);
	const entry = products.find((candidate) => candidate.product.key === product.key);
	if (!entry || (entry.access !== 'owned' && entry.access !== 'free')) {
		error(404, 'Product unavailable');
	}

	return { product, entry };
};
