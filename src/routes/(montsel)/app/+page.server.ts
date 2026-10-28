import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { listBrandOutputs } from '#lib/modules/products/server/repository.js';
import { activeWork, areaSummaries } from '#lib/modules/products/shared/access.js';

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const [{ products }, documents] = await Promise.all([
		resolveBrandProducts(ctx),
		listBrandOutputs(ctx, { limit: 5 })
	]);

	// "Returning" means the brand has real activity, never a seeded placeholder.
	const returning = products.some((entry) => entry.projects.length > 0) || documents.length > 0;

	return {
		areas: areaSummaries(products),
		work: activeWork(products),
		documents,
		returning,
		visualContract:
			products.find((entry) => entry.product.key === 'tool.visual_contract') ?? null
	};
};
