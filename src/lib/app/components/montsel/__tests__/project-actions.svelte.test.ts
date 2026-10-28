import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ProjectActions from '../project-actions.svelte';

/**
 * Regression guard for a real bug: putting `class` after `{...props}` on the
 * child anchor replaced the menu item's own sizing, so "Open" rendered several
 * times taller than "Delete".
 */
describe('project actions menu', () => {
	it('renders Open at the same height as Delete', async () => {
		render(ProjectActions, {
			title: 'Test',
			href: '/app/tools/visual-contract/abc',
			draftId: 'draft-1'
		});

		await page.getByRole('button', { name: /Actions for Test/ }).click();

		const link = document.querySelector('a[href="/app/tools/visual-contract/abc"]');
		expect(link).not.toBeNull();

		const menuItems = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')];
		const deleteItem = menuItems.find((item) => item.textContent?.includes('Delete'));
		expect(deleteItem).toBeDefined();

		const linkHeight = (link as HTMLElement).getBoundingClientRect().height;
		const deleteHeight = (deleteItem as HTMLElement).getBoundingClientRect().height;

		expect(linkHeight).toBeGreaterThan(0);
		expect(Math.abs(linkHeight - deleteHeight)).toBeLessThan(1);
	});

	it('keeps the item sizing classes on the link', async () => {
		render(ProjectActions, {
			title: 'Test',
			href: '/app/tools/visual-contract/xyz',
			draftId: 'draft-2'
		});

		await page.getByRole('button', { name: /Actions for Test/ }).click();

		const link = document.querySelector('a[href="/app/tools/visual-contract/xyz"]');
		const className = (link as HTMLElement).className;
		expect(className).toContain('px-1.5');
		expect(className).toContain('py-1');
		// The old bug added this, which stretched the row.
		expect(className).not.toContain('gap-2');
	});
});
