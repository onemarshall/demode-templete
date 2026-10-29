import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { librarySections, type ProductAccess, type WorkItemView } from '#lib/modules/products/shared/access.js';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { deleteDraft, listBrandDrafts } from '#lib/modules/visual-contract/server/repository.js';
import { resumePath } from '#lib/modules/visual-contract/server/flow.js';

const VISUAL_CONTRACT = '/app/tools/visual-contract';

/**
 * Visual Contract records its own work as drafts, not `work_item` rows, so the
 * library's recent-projects panel would always read "No projects yet". Fill it
 * from the drafts that actually exist for this brand.
 */
async function withVisualContractProjects(
	products: ProductAccess[],
	ctx: Awaited<ReturnType<typeof resolveActiveBrand>>['ctx'],
	userId: string
): Promise<ProductAccess[]> {
	const drafts = await listBrandDrafts(ctx, userId);
	const projects: WorkItemView[] = drafts.map((draft) => ({
		id: draft.id,
		productKey: 'tool.visual_contract',
		title: draft.projectContext.projectName?.trim() || 'Untitled contract',
		state: draft.status === 'generated' ? 'completed' : 'in_progress',
		currentStepKey: draft.currentStep,
		currentStepLabel: null,
		stepsCompleted: 0,
		stepsTotal: 6,
		resumePath: resumePath(VISUAL_CONTRACT, draft.id, draft.choices, draft.status === 'generated'),
		startedAt: draft.createdAt,
		lastActivityAt: draft.updatedAt,
		completedAt: null
	}));

	return products.map((entry) =>
		entry.product.key === 'tool.visual_contract' ? { ...entry, projects } : entry
	);
}

export const load: PageServerLoad = async (event) => {
	const { ctx, session } = await resolveActiveBrand(event);
	const { products } = await resolveBrandProducts(ctx);
	return {
		sections: librarySections(await withVisualContractProjects(products, ctx, session.user.id))
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const actor = await brandActor(event);
		const form = await event.request.formData();
		const draftId = String(form.get('draftId') ?? '').trim();
		if (!draftId) return fail(400, { message: 'No contract was selected.' });

		const removed = await deleteDraft(actor, draftId);
		// A miss is either a wrong id or another brand's contract: same answer.
		if (!removed) return fail(404, { message: 'That contract is no longer available.' });

		return { deleted: true };
	}
};
