import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ProjectActions from '../project-actions.svelte';

/**
 * Regression guard for a real bug: putting `class` after `{...props}` on the
 * child anchor replaced the menu item's own sizing, so "Open" rendered several
 * times taller than "Delete".
 *
 * The guard compares the two items' class lists rather than their heights. This
 * environment does not load the compiled stylesheet, so every utility class is
 * inert: the anchor renders inline at 18px and the item as a 28px block, and a
 * height comparison fails on that alone while telling you nothing about the bug.
 * Identical class lists are the property that survives into a styled page, and a
 * class added after the spread breaks them immediately.
 */
describe('project actions menu', () => {
	it('gives Open the same item classes as Delete, so the row height matches', async () => {
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

		// The child snippet replaces the item element, so the anchor *is* the item
		// and its sizing arrives through `props`.
		expect(menuItems).toContain(link);
		expect((link as HTMLElement).className).toBe((deleteItem as HTMLElement).className);
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
