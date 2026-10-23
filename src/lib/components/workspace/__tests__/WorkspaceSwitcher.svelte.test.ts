import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorkspaceSwitcher from '../WorkspaceSwitcher.svelte';

describe('workspace switcher', () => {
	it('shows each organisation and links only to its assigned workspaces', async () => {
		render(WorkspaceSwitcher, {
			props: {
				organisations: [
					{
						organisationId: 'org-a',
						organisationName: 'Acme',
						organisationSlug: 'acme',
						workspaces: [{ workspaceId: 'workspace-a', workspaceName: 'Brand One', workspaceSlug: 'brand-one', role: 'editor' }]
					},
					{
						organisationId: 'org-b',
						organisationName: 'Client Co',
						organisationSlug: 'client-co',
						workspaces: [{ workspaceId: 'workspace-b', workspaceName: 'Studio', workspaceSlug: 'studio', role: 'viewer' }]
					}
				]
			}
		});

		await expect.element(page.getByRole('navigation', { name: 'Organisations and workspaces' })).toBeInTheDocument();
		await page.getByText('Switch workspace').click();
		await expect.element(page.getByRole('link', { name: 'Brand One' })).toHaveAttribute('href', '/o/acme/w/brand-one');
		await expect.element(page.getByRole('link', { name: 'Studio' })).toHaveAttribute('href', '/o/client-co/w/studio');
		await expect.element(page.getByRole('link', { name: 'Client Co' })).toHaveAttribute('href', '/o/client-co/settings');
	});

	it('explains when an organisation has no assigned workspace', async () => {
		render(WorkspaceSwitcher, {
			props: {
				organisations: [{ organisationId: 'org-a', organisationName: 'Acme', organisationSlug: 'acme', workspaces: [] }]
			}
		});
		await page.getByText('Switch workspace').click();
		await expect.element(page.getByText('No assigned workspaces')).toBeInTheDocument();
	});
});
