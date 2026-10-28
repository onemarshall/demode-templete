import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findSharedOutput } from '#lib/modules/products/server/repository.js';
import { getProduct } from '#lib/modules/products/shared/registry.js';

export const load: PageServerLoad = async ({ params }) => {
	const shared = await findSharedOutput(params.shareSlug);
	// A missing or unshared slug is a plain miss; it never reveals whether the record exists.
	if (!shared) error(404, 'This shared output is not available.');
	return {
		shared: { ...shared, productName: getProduct(shared.productKey)?.name ?? 'Montsel' }
	};
};
