import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import {
	countBrandOutputs,
	listBrandOutputs,
	type OutputFilter
} from '#lib/modules/products/server/repository.js';
import { isProductKey, type ProductFamily } from '#lib/modules/products/shared/registry.js';

const FAMILIES: ProductFamily[] = ['diagnostic', 'strategy', 'tool'];
const SORTS: NonNullable<OutputFilter['sort']>[] = ['newest', 'oldest', 'title'];

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const params = event.url.searchParams;

	const familyParam = params.get('family');
	const family = FAMILIES.find((candidate) => candidate === familyParam);
	const productParam = params.get('product');
	const productKey = productParam && isProductKey(productParam) ? productParam : undefined;
	const sortParam = params.get('sort');
	const sort = SORTS.find((candidate) => candidate === sortParam) ?? 'newest';
	const search = (params.get('q') ?? '').slice(0, 100);

	const [{ products }, documents, counts] = await Promise.all([
		resolveBrandProducts(ctx),
		listBrandOutputs(ctx, { family, productKey, search, sort, limit: 100 }),
		countBrandOutputs(ctx)
	]);

	const total = counts.diagnostic + counts.strategy + counts.tool;
	// The empty-state CTA comes from what the user can actually open, not a fixed guess.
	const available = products.find(
		(entry) => (entry.access === 'owned' || entry.access === 'free') && entry.product.lifecycle === 'available'
	);

	return {
		documents,
		counts,
		total,
		filters: { family: family ?? null, productKey: productKey ?? null, search, sort },
		emptyAction: available
			? { label: `Open ${available.product.name}`, href: available.product.route }
			: { label: 'Browse tools', href: '/app/tools' }
	};
};
