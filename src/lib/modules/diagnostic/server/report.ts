/**
 * Read a stored report body.
 *
 * The bytes come from `output_version`, scoped by the branded `OperationContext`
 * exactly as `products/server/repository` scopes output metadata. A version row
 * belonging to another brand is a miss, never a disclosure.
 *
 * `readSharedReport` is the one deliberate exception, matching
 * `findSharedOutput`: a share slug is a capability the owner granted, so the
 * read is keyed by the slug and still refuses anything not marked shareable.
 */

import { getDB } from '#lib/platform/database/db.js';
import { assertOperationContext, type OperationContext } from '#lib/modules/tenancy/server/context.js';
import type { OutputFormat, ProductKey } from '#lib/modules/products/shared/registry.js';
import { isProductKey } from '#lib/modules/products/shared/registry.js';
import { renderDocumentMarkdown } from '#lib/platform/markdown/document-markdown.js';

const iso = (value: Date | string): string =>
	value instanceof Date ? value.toISOString() : value;

export interface OutputReport {
	outputId: string;
	versionNumber: number;
	contentHash: string;
	contentMarkdown: string;
	contentHtml: string;
	createdAt: string;
}

export interface SharedOutputReport extends OutputReport {
	title: string;
	productKey: ProductKey;
	format: OutputFormat;
	outputCreatedAt: string;
}

interface VersionRow {
	outputId: string;
	versionNumber: number;
	contentHash: string;
	contentMarkdown: string;
	createdAt: Date | string;
}

const toReport = (row: VersionRow): OutputReport => ({
	outputId: row.outputId,
	versionNumber: row.versionNumber,
	contentHash: row.contentHash,
	contentMarkdown: row.contentMarkdown,
	contentHtml: renderDocumentMarkdown(row.contentMarkdown),
	createdAt: iso(row.createdAt)
});

const VERSION_COLUMNS = `v."output_id" AS "outputId", v."version_number" AS "versionNumber",
	        v."content_hash" AS "contentHash", v."content_markdown" AS "contentMarkdown",
	        v."created_at" AS "createdAt"`;

/** The latest delivered version of one output in the context brand. */
export async function readOutputReport(
	ctx: OperationContext,
	outputId: string,
): Promise<OutputReport | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<VersionRow>(
		`SELECT ${VERSION_COLUMNS}
		 FROM "output_version" v
		 JOIN "output" o ON o."id" = v."output_id"
		                AND o."organisation_id" = v."organisation_id"
		                AND o."brand_id" = v."brand_id"
		 WHERE v."output_id" = $1 AND v."brand_id" = $2 AND v."organisation_id" = $3
		 ORDER BY v."version_number" DESC
		 LIMIT 1`,
		[outputId, ctx.brandId, ctx.organisationId],
	);
	const row = rows[0];
	return row ? toReport(row) : null;
}

/** The latest delivered version behind a share slug. No tenancy: the slug is the capability. */
export async function readSharedReport(shareSlug: string): Promise<SharedOutputReport | null> {
	const db = await getDB();
	const { rows } = await db.query<
		VersionRow & { title: string; productKey: string; format: OutputFormat; outputCreatedAt: Date | string }
	>(
		`SELECT ${VERSION_COLUMNS},
		        o."title", o."product_key" AS "productKey", o."format",
		        o."created_at" AS "outputCreatedAt"
		 FROM "output" o
		 JOIN "output_version" v ON v."output_id" = o."id"
		                       AND v."organisation_id" = o."organisation_id"
		                       AND v."brand_id" = o."brand_id"
		 WHERE o."share_slug" = $1 AND o."can_share" = true
		 ORDER BY v."version_number" DESC
		 LIMIT 1`,
		[shareSlug],
	);
	const row = rows[0];
	if (!row || !isProductKey(row.productKey)) return null;
	return {
		...toReport(row),
		title: row.title,
		productKey: row.productKey as ProductKey,
		format: row.format,
		outputCreatedAt: iso(row.outputCreatedAt)
	};
}
