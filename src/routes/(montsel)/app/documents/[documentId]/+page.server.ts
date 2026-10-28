import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { findBrandOutput } from '#lib/modules/products/server/repository.js';
import { getProduct } from '#lib/modules/products/shared/registry.js';

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const output = await findBrandOutput(ctx, event.params.documentId);
	// Another brand's output is indistinguishable from a missing one (§6).
	if (!output) error(404, 'Document unavailable');
	return {
		output,
		productName: getProduct(output.productKey)?.name ?? 'Montsel'
	};
};
