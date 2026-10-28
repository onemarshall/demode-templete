import type { Actions, PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { listBrandOutputs } from '#lib/modules/products/server/repository.js';
import { listBrandDrafts } from '#lib/modules/visual-contract/server/repository.js';
import { resumePath, startBrandDraft } from '#lib/modules/visual-contract/server/flow.js';

const BASE = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const { ctx, session } = await resolveActiveBrand(event);
	const [{ products }, outputs, drafts] = await Promise.all([
		resolveBrandProducts(ctx),
		listBrandOutputs(ctx, { productKey: 'tool.visual_contract' }),
		listBrandDrafts(ctx, session.user.id)
	]);

	const entry = products.find((product) => product.product.key === 'tool.visual_contract') ?? null;
	return {
		entry,
		contracts: outputs,
		// Only drafts that belong to this brand. A guest draft can never appear here.
		drafts: drafts
			.filter((draft) => draft.status !== 'generated')
			.map((draft) => ({
				id: draft.id,
				title: draft.projectContext.projectName?.trim() || 'Untitled contract',
				updatedAt: draft.updatedAt,
				href: resumePath(BASE, draft.id, draft.choices, false)
			}))
	};
};

export const actions: Actions = {
	start: async (event) => startBrandDraft(event, BASE)
};
