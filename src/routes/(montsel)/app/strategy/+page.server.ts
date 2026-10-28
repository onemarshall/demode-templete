import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import {
	listBrandOutputs,
	listPendingApprovals
} from '#lib/modules/products/server/repository.js';

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const [{ products }, outputs, approvals] = await Promise.all([
		resolveBrandProducts(ctx),
		listBrandOutputs(ctx, { limit: 50 }),
		listPendingApprovals(ctx)
	]);

	const strategy = products.find((entry) => entry.product.key === 'strategy') ?? null;
	const strategyWork = strategy?.work ?? null;

	return {
		strategy,
		outputs: outputs.filter((output) => output.productKey === 'strategy').slice(0, 5),
		pendingApproval:
			approvals.find((approval) => approval.workItemId === strategyWork?.id) ?? null,
		// Only a completed diagnostic can inform strategy work; nothing is implied otherwise.
		diagnosticFindings: products.some(
			(entry) => entry.product.family === 'diagnostic' && entry.work?.state === 'completed'
		)
	};
};
