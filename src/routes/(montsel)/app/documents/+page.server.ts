import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import {
	countBrandOutputs,
	listBrandOutputs,
	type OutputFilter
} from '#lib/modules/products/server/repository.js';
import { isProductKey, type ProductFamily } from '#lib/modules/products/shared/registry.js';
import { listDraftIdsForOutputs } from '#lib/modules/visual-contract/server/repository.js';
import { paths } from '#lib/modules/visual-contract/server/flow.js';

const FAMILIES: ProductFamily[] = ['diagnostic', 'strategy', 'tool'];
const SORTS: NonNullable<OutputFilter['sort']>[] = ['newest', 'oldest', 'title'];
const VISUAL_CONTRACT = '/app/tools/visual-contract';

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

	// Visual Contract outputs open on their generated page; every other output
	// still opens its Documents record because no product view exists for it yet.
	const openDrafts = await listDraftIdsForOutputs(
		ctx,
		documents
			.filter((document) => document.productKey === 'tool.visual_contract')
			.map((document) => document.id)
	);
	const documentsWithPaths = documents.map((document) => {
		const draftId = openDrafts.get(document.id);
		return {
			...document,
			openPath: draftId
				? paths(VISUAL_CONTRACT, draftId).generated
				: `/app/documents/${document.id}`
		};
	});

	const total = counts.diagnostic + counts.strategy + counts.tool;
	// The empty-state CTA comes from what the user can actually open, not a fixed guess.
	const available = products.find(
		(entry) => (entry.access === 'owned' || entry.access === 'free') && entry.product.lifecycle === 'available'
	);

	return {
		documents: documentsWithPaths,
		counts,
		total,
		filters: { family: family ?? null, productKey: productKey ?? null, search, sort },
		emptyAction: available
			? { label: `Open ${available.product.name}`, href: available.product.route }
			: { label: 'Browse tools', href: '/app/tools' }
	};
};
