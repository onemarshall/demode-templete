import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import BrandSwitcher from '../BrandSwitcher.svelte';

describe('brand switcher', () => {
	it('shows each organisation and links only to its assigned brands', async () => {
		render(BrandSwitcher, {
			props: {
				organisations: [
					{
						organisationId: 'org-a',
						organisationName: 'Acme',
						organisationSlug: 'acme',
						brands: [{ brandId: 'brand-a', brandName: 'Brand One', brandSlug: 'brand-one', role: 'editor' }]
					},
					{
						organisationId: 'org-b',
						organisationName: 'Client Co',
						organisationSlug: 'client-co',
						brands: [{ brandId: 'brand-b', brandName: 'Studio', brandSlug: 'studio', role: 'viewer' }]
					}
				]
			}
		});

		await expect.element(page.getByRole('navigation', { name: 'Organisations and brands' })).toBeInTheDocument();
		await page.getByText('Switch brand').click();
		await expect.element(page.getByRole('link', { name: 'Brand One' })).toHaveAttribute('href', '/o/acme/brand-one');
		await expect.element(page.getByRole('link', { name: 'Studio' })).toHaveAttribute('href', '/o/client-co/studio');
		await expect.element(page.getByRole('link', { name: 'Client Co' })).toHaveAttribute('href', '/o/client-co/settings');
	});

	it('explains when an organisation has no assigned brand', async () => {
		render(BrandSwitcher, {
			props: {
				organisations: [{ organisationId: 'org-a', organisationName: 'Acme', organisationSlug: 'acme', brands: [] }]
			}
		});
		await page.getByText('Switch brand').click();
		await expect.element(page.getByText('No assigned brands')).toBeInTheDocument();
	});
});
