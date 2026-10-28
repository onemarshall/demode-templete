import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { findBrandOutput } from '#lib/modules/products/server/repository.js';

/**
 * Download is only offered when an output carries a downloadable file.
 * No file storage is attached to outputs yet, so this refuses rather than
 * serving an empty or invented file.
 */
export const GET: RequestHandler = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const output = await findBrandOutput(ctx, event.params.documentId);
	if (!output || !output.canDownload) error(404, 'Document unavailable');
	error(404, 'No file is attached to this output.');
};
