import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findSharedOutput } from '#lib/modules/products/server/repository.js';
import { getProduct } from '#lib/modules/products/shared/registry.js';
import { readSharedReport } from '#lib/modules/diagnostic/server/report.js';

export const load: PageServerLoad = async ({ params }) => {
	const shared = await findSharedOutput(params.shareSlug);
	// A missing or unshared slug is a plain miss; it never reveals whether the record exists.
	if (!shared) error(404, 'This shared output is not available.');

	// The body is optional: a shared record without stored bytes keeps showing
	// metadata only, exactly as before.
	const report = await readSharedReport(params.shareSlug);

	return {
		shared: {
			...shared,
			productName: getProduct(shared.productKey)?.name ?? 'Montsel',
			report: report
				? {
						versionNumber: report.versionNumber,
						contentHash: report.contentHash,
						contentHtml: report.contentHtml
					}
				: null
		}
	};
};
