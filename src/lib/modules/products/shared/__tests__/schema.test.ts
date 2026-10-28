import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCTS, PRODUCT_KEYS } from '../registry.js';

const sql = readFileSync(
	join(process.cwd(), 'database', 'migrations', '0009_montsel_products.sql'),
	'utf8'
);

const SEED = /^\t\('([a-z._]+)', '(diagnostic|strategy|tool)', '(free|paid)', '(planned|available|retired)'\)[,;]?$/gm;

function seededProducts() {
	return [...sql.matchAll(SEED)].map((match) => ({
		key: match[1],
		family: match[2],
		pricingMode: match[3],
		lifecycle: match[4]
	}));
}

describe('product schema consistency', () => {
	it('seeds every registry key exactly once', () => {
		const seeded = seededProducts().map((row) => row.key);
		expect([...seeded].sort()).toEqual([...PRODUCT_KEYS].sort());
	});

	it('keeps registry metadata and the database seed in step', () => {
		const seeded = seededProducts();
		for (const product of PRODUCTS) {
			expect(seeded.find((row) => row.key === product.key)).toEqual({
				key: product.key,
				family: product.family,
				pricingMode: product.pricingMode,
				lifecycle: product.lifecycle
			});
		}
	});

	it('anchors entitlement, work and output rows to the product table', () => {
		for (const table of ['product_entitlement', 'work_item', 'output']) {
			expect(sql).toMatch(
				new RegExp(`CREATE TABLE "${table}"[\\s\\S]*?"product_key" text NOT NULL REFERENCES "product"`)
			);
		}
	});

	it('requires a shareable output to carry a slug and forbids downloading a web page', () => {
		expect(sql).toContain('CHECK (NOT "can_share" OR "share_slug" IS NOT NULL)');
		expect(sql).toContain(`CHECK (NOT "can_download" OR "format" IN ('report', 'document'))`);
	});
});
