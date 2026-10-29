import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { findBrandOutput } from '#lib/modules/products/server/repository.js';
import { readOutputReport } from '#lib/modules/diagnostic/server/report.js';

/** `Report — v2` → `report-v2.md`. Never derived from stored HTML or a client value. */
function fileName(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return `${slug || 'report'}.md`;
}

/**
 * Serve the stored bytes exactly as imported, with the hash the engine recorded.
 * The client can verify what it received against the receipt.
 */
export const GET: RequestHandler = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	const output = await findBrandOutput(ctx, event.params.documentId);
	if (!output || !output.canDownload) error(404, 'Document unavailable');

	const report = await readOutputReport(ctx, output.id);
	if (!report) error(404, 'No file is attached to this output.');

	return new Response(report.contentMarkdown, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'content-disposition': `attachment; filename="${fileName(output.title)}"`,
			'x-content-sha256': report.contentHash,
			'cache-control': 'private, no-store'
		}
	});
};
