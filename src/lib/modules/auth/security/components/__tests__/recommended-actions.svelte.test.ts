import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import RecommendedActionsPanel from '../triage/RecommendedActionsPanel.svelte';
import { DEFAULT_ACTION_FILTER } from '../triage/derive';
import type { RecommendedActionItem } from '../triage/types';

const items: RecommendedActionItem[] = Array.from({ length: 5 }, (_, i) => ({ id: `review-${i}`, title: `Review observation ${i}`, reason: 'An unfamiliar sign-in needs context.', severity: 'high', status: 'new', source: 'threat_feed', sourceLabel: 'Recorded event', detectedAt: Date.now(), primaryActionLabel: 'Review' }));
const props = { filter: DEFAULT_ACTION_FILTER, availableSources: [] as const, availableStatuses: [] as const, onFilterChange: vi.fn(), onResetFilters: vi.fn(), onPrimaryAction: vi.fn() };

describe('the next security action', () => {
	it('leads with three reviews and opens the selected observation without acknowledgement controls', async () => {
		const onPrimaryAction = vi.fn();
		render(RecommendedActionsPanel, { ...props, items, visibleItems: items, onPrimaryAction });
		expect(document.querySelectorAll('ol > li')).toHaveLength(3);
		expect(document.body.textContent).not.toContain('Acknowledge');
		await page.getByRole('button', { name: 'Review evidence' }).nth(1).click();
		expect(onPrimaryAction).toHaveBeenCalledWith(items[1]);
		await page.getByRole('button', { name: 'View all 5 reviews' }).click();
		expect(document.querySelectorAll('ol > li')).toHaveLength(5);
	});
	it('distinguishes an empty queue from an empty filter result', () => {
		render(RecommendedActionsPanel, { ...props, items: [], visibleItems: [] });
		expect(document.body.textContent).toContain('No recommended reviews in the available records');
		expect(document.body.textContent).not.toContain('No reviews match these filters');
	});
	it('makes filtered-out reviews recoverable', async () => {
		const onResetFilters = vi.fn();
		render(RecommendedActionsPanel, { ...props, items, visibleItems: [], onResetFilters });
		expect(document.body.textContent).toContain('No reviews match these filters');
		await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
		expect(onResetFilters).toHaveBeenCalledOnce();
	});
});
