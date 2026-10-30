import { describe, expect, it } from 'vitest';
import {
	areaSummaries,
	buildProductAccess,
	librarySections,
	primaryForFamily,
	selectCurrentWork,
	unownedProducts,
	type EntitlementRecord,
	type WorkItemView
} from '../access.js';
import { requireProduct } from '../registry.js';

const active = (productKey: EntitlementRecord['productKey']): EntitlementRecord => ({
	productKey,
	status: 'active',
	effectiveFrom: '2026-01-01T00:00:00.000Z',
	effectiveTo: null
});

const work = (overrides: Partial<WorkItemView> = {}): WorkItemView => ({
	id: 'work-1',
	productKey: 'diagnostic.signal',
	title: null,
	state: 'in_progress',
	currentStepKey: null,
	currentStepLabel: 'Market read',
	stepsCompleted: 1,
	stepsTotal: 4,
	resumePath: '/app/workflow/diagnostic.signal?step=2',
	startedAt: '2026-10-01T00:00:00.000Z',
	lastActivityAt: '2026-10-02T00:00:00.000Z',
	completedAt: null,
	...overrides
});

describe('access state', () => {
	it('treats a free tool as available without an entitlement row', () => {
		const entry = buildProductAccess(requireProduct('tool.visual_contract'), undefined, []);
		expect(entry.access).toBe('free');
		expect(entry.action).toEqual({
			kind: 'start',
			label: 'Start Visual Contract',
			href: '/app/tools/visual-contract'
		});
	});

	it('requires a live entitlement for a paid product', () => {
		expect(buildProductAccess(requireProduct('diagnostic.signal'), undefined, []).access).toBe(
			'not_owned'
		);
		expect(
			buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), [])
				.access
		).toBe('owned');
	});

	it('keeps an unbuilt product restricted even when an entitlement row exists', () => {
		const entry = buildProductAccess(
			requireProduct('tool.think_act_decide'),
			active('tool.think_act_decide'),
			[]
		);
		expect(entry.access).toBe('restricted');
		expect(entry.action).toEqual({ kind: 'unavailable', label: 'Not yet available', href: null });
	});

	it('offers Learn more instead of an action for an unowned product', () => {
		const entry = buildProductAccess(requireProduct('diagnostic.gap'), undefined, []);
		expect(entry.action).toEqual({
			kind: 'learn',
			label: 'Learn more',
			href: '/auth/pricing'
		});
	});
});

describe('primary action', () => {
	it('continues from the persisted resume path', () => {
		const entry = buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), [
			work()
		]);
		expect(entry.action).toEqual({
			kind: 'continue',
			label: 'Continue',
			href: '/app/workflow/diagnostic.signal?step=2'
		});
	});

	it('names a pending decision rather than implying approval', () => {
		const entry = buildProductAccess(requireProduct('strategy'), active('strategy'), [
			work({ productKey: 'strategy', state: 'awaiting_decision', resumePath: null })
		]);
		expect(entry.action.label).toBe('Review decision');
		expect(entry.action.href).toBe('/app/workflow/strategy');
	});

	it('routes completed work to its results', () => {
		const entry = buildProductAccess(requireProduct('strategy'), active('strategy'), [
			work({ productKey: 'strategy', state: 'completed', completedAt: '2026-10-03T00:00:00.000Z' })
		]);
		expect(entry.action).toEqual({
			kind: 'view',
			label: 'View results',
			href: '/app/documents?product=strategy'
		});
	});

	it('starts a product that is owned but has no work', () => {
		const entry = buildProductAccess(requireProduct('strategy'), active('strategy'), []);
		expect(entry.action).toEqual({
			kind: 'start',
			label: 'Start Strategy',
			href: '/app/workflow/strategy'
		});
	});
});

describe('current work selection', () => {
	it('prefers a pending decision over other active work and ignores completed work', () => {
		const chosen = selectCurrentWork([
			work({ id: 'a', state: 'completed' }),
			work({ id: 'b', state: 'in_progress' }),
			work({ id: 'c', state: 'awaiting_decision' })
		]);
		expect(chosen?.id).toBe('c');
	});

	it('returns null when a brand has no work at all', () => {
		expect(selectCurrentWork([])).toBeNull();
	});
});

describe('tools library sections', () => {
	const access = [
		buildProductAccess(requireProduct('tool.visual_contract'), undefined, []),
		buildProductAccess(requireProduct('tool.think_act_decide'), active('tool.think_act_decide'), []),
		buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), []),
		buildProductAccess(requireProduct('strategy'), undefined, [])
	];

	it('never lists a planned product as usable', () => {
		const sections = librarySections(access);
		expect(sections.owned).toEqual([]);
		expect(sections.free.map((entry) => entry.product.key)).toEqual(['tool.visual_contract']);
		expect(sections.optional).toEqual([]);
	});

	it('excludes diagnostics and strategy from the tools library', () => {
		const keys = librarySections(access).free.map((entry) => entry.product.key);
		expect(keys).not.toContain('diagnostic.signal');
		expect(keys).not.toContain('strategy');
	});

	it('orders owned paid tools by recent activity', () => {
		// No paid tool is released today, so the ordering contract is exercised
		// with available descriptors built from the same registry shape.
		const older = buildProductAccess(
			{ ...requireProduct('tool.think_act_decide'), lifecycle: 'available' },
			active('tool.think_act_decide'),
			[work({ productKey: 'tool.think_act_decide', lastActivityAt: '2026-09-01T00:00:00.000Z' })]
		);
		const newer = buildProductAccess(
			{
				...requireProduct('tool.visual_contract'),
				pricingMode: 'paid',
				lifecycle: 'available'
			},
			active('tool.visual_contract'),
			[work({ productKey: 'tool.visual_contract', lastActivityAt: '2026-10-01T00:00:00.000Z' })]
		);
		const sections = librarySections([older, newer]);
		expect(sections.owned.map((entry) => entry.product.key)).toEqual([
			'tool.visual_contract',
			'tool.think_act_decide'
		]);
		expect(sections.optional).toEqual([]);
	});
});

describe('dashboard area summaries', () => {
	it('describes an unowned area without offering a purchase it cannot fulfil', () => {
		const access = [buildProductAccess(requireProduct('diagnostic.signal'), undefined, [])];
		const diagnostic = areaSummaries(access).find((area) => area.family === 'diagnostic');
		expect(diagnostic?.status).toBe('Not purchased');
		expect(diagnostic?.action).toEqual({
			kind: 'learn',
			label: 'Explore Diagnostic',
			href: '/app/diagnostic'
		});
	});

	it('reports the owned product and its next action', () => {
		const access = [
			buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), [])
		];
		const diagnostic = areaSummaries(access).find((area) => area.family === 'diagnostic');
		expect(diagnostic?.status).toBe('Signal purchased');
		expect(diagnostic?.action.label).toBe('Start Signal');
	});

	it('prefers active work over another owned product in the same area', () => {
		const access = [
			buildProductAccess(requireProduct('diagnostic.gap'), active('diagnostic.gap'), []),
			buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), [work()])
		];
		expect(primaryForFamily(access, 'diagnostic')?.product.key).toBe('diagnostic.signal');
	});
});

describe('optional discovery', () => {
	it('lists only available unowned products', () => {
		const access = [
			buildProductAccess(requireProduct('diagnostic.gap'), undefined, []),
			buildProductAccess(requireProduct('diagnostic.signal'), active('diagnostic.signal'), []),
			buildProductAccess(requireProduct('tool.think_act_decide'), undefined, [])
		];
		expect(unownedProducts(access).map((entry) => entry.product.key)).toEqual(['diagnostic.gap']);
	});
});
