import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import NavigationPreloadHarness from './NavigationPreloadHarness.svelte';

describe('navigation preloads', () => {
	it('renders the account menu after preloading and navigating with the configured strategy', async () => {
		render(NavigationPreloadHarness);
		await page.getByRole('button', { name: 'Preload' }).click();
		await page.getByRole('button', { name: 'Navigate' }).click();
		await expect.element(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
		await page.getByRole('button', { name: 'Account menu' }).click();
		await expect.element(page.getByRole('menuitem', { name: 'Billing' })).toBeVisible();
	});
});
