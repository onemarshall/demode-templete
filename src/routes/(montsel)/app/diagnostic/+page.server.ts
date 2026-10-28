import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { listBrandOutputs } from '#lib/modules/products/server/repository.js';
import type { PrimaryAction, WorkItemView } from '#lib/modules/products/shared/access.js';

const FULL_STAGES = ['diagnostic.signal', 'diagnostic.gap', 'diagnostic.direction'] as const;

/** A stage of the owned Full Diagnostic journey, not a separate purchase (§5.2). */
function stageAction(work: WorkItemView | null, workflowPath: string): PrimaryAction {
	if (!work || work.state === 'not_started') {
		return { kind: 'start', label: 'Start', href: work?.resumePath ?? workflowPath };
	}
	if (work.state === 'completed') {
		return {
			kind: 'view',
			label: 'View',
			href: `/app/documents?product=${encodeURIComponent(work.productKey)}`
		};
	}
	return { kind: 'continue', label: 'Continue', href: work.resumePath ?? workflowPath };
}

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const [{ products }, outputs] = await Promise.all([
		resolveBrandProducts(ctx),
		listBrandOutputs(ctx, { limit: 50 })
	]);

	const diagnostic = products.filter((entry) => entry.product.family === 'diagnostic');
	const full = diagnostic.find((entry) => entry.product.key === 'diagnostic.full') ?? null;
	const owned = diagnostic.filter(
		(entry) => entry.access === 'owned' && entry.product.key !== 'diagnostic.full'
	);
	const fullOwned = full?.access === 'owned';

	return {
		fullOwned,
		owned,
		// Unowned diagnostics are optional discovery, never action buttons.
		unowned: diagnostic.filter((entry) => entry.access === 'not_owned'),
		stages: fullOwned
			? FULL_STAGES.map((key) => {
					const entry = diagnostic.find((candidate) => candidate.product.key === key);
					return {
						key,
						name: entry?.product.name ?? key,
						work: entry?.work ?? null,
						action: stageAction(entry?.work ?? null, full?.product.workflowPath ?? '/app/diagnostic')
					};
				})
			: [],
		report: outputs.find((output) => output.productKey === 'diagnostic.full') ?? null
	};
};
