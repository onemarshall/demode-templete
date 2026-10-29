import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { findBrandOutput } from '#lib/modules/products/server/repository.js';
import { getProduct } from '#lib/modules/products/shared/registry.js';
import { listDraftIdsForOutputs } from '#lib/modules/visual-contract/server/repository.js';
import { paths } from '#lib/modules/visual-contract/server/flow.js';
import { readOutputReport } from '#lib/modules/diagnostic/server/report.js';

const VISUAL_CONTRACT = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const output = await findBrandOutput(ctx, event.params.documentId);
	// Another brand's output is indistinguishable from a missing one (§6).
	if (!output) error(404, 'Document unavailable');

	// Products that render their own output get a route to it; a Visual Contract
	// opens on the owner's generated page rather than stopping at this record.
	const draftId =
		output.productKey === 'tool.visual_contract'
			? ((await listDraftIdsForOutputs(ctx, [output.id])).get(output.id) ?? null)
			: null;

	// A delivered report carries its own bytes. Products that render elsewhere
	// leave this null and the page keeps showing metadata only.
	const report = await readOutputReport(ctx, output.id);

	return {
		output,
		productName: getProduct(output.productKey)?.name ?? 'Montsel',
		openPath: draftId ? paths(VISUAL_CONTRACT, draftId).generated : null,
		report: report
			? {
					versionNumber: report.versionNumber,
					contentHash: report.contentHash,
					contentHtml: report.contentHtml,
					createdAt: report.createdAt
				}
			: null
	};
};
