import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../app.css';
import OrganisationsPage from '../organisations/+page.svelte';
import OrganisationSettingsPage from '../o/[organisationSlug]/settings/+page.svelte';
import WorkspacePage from '../o/[organisationSlug]/w/[workspaceSlug]/+page.svelte';
import InvitationPage from '../invite/[invitationId]/+page.svelte';

const organisationId = 'org-internal-1';
const workspaceId = 'workspace-internal-1';
const userId = 'user-internal-1';
const invitationId = 'invitation-internal-1';

describe('Montsel screens', () => {
	it('shows the organisations and assigned workspace navigation without exposing database IDs', async () => {
		render(OrganisationsPage, {
			props: {
				data: {
					user: { id: userId },
					preference: { lastWorkspaceId: workspaceId },
					organisations: [{
						organisationId,
						organisationName: 'Acme Studio',
						organisationSlug: 'acme-studio',
						workspaces: [{ workspaceId, workspaceName: 'Brand One', workspaceSlug: 'brand-one', role: 'editor' }]
					}]
				}
			} as never
		});

		await expect.element(page.getByRole('heading', { name: 'Your organisations' })).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Brand One' })).toHaveAttribute('href', '/o/acme-studio/w/brand-one');
		await expect.element(page.getByRole('link', { name: 'Organisation settings' })).toHaveAttribute('href', '/o/acme-studio/settings');
		await expect.element(page.getByText(organisationId, { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText(workspaceId, { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText(userId, { exact: true })).not.toBeInTheDocument();
	});

	it('shows the owner controls and workspace setup status without rendering internal IDs', async () => {
		render(OrganisationSettingsPage, {
			props: {
				data: {
					user: { id: userId },
					organisation: { id: organisationId, name: 'Acme Studio', slug: 'acme-studio' },
					role: 'owner',
					manager: true,
					workspaces: [{ id: workspaceId, name: 'Brand One', status: 'active' }],
					members: [{ userId, name: 'Avery Owner', email: 'avery@example.test', role: 'owner', emailVerified: true }],
					invitations: [{ id: 'provisioning-internal-1', invitationId, email: 'new@example.test', state: 'retry_pending', attempts: 2 }]
				}
			} as never
		});

		await expect.element(page.getByRole('heading', { name: 'Acme Studio' })).toBeInTheDocument();
		await expect.element(page.getByText('Grant workspace access', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Retry setup' })).toBeInTheDocument();
		await expect.element(page.getByText(organisationId, { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText(workspaceId, { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText(userId, { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText(invitationId, { exact: true })).not.toBeInTheDocument();
	});

	it('keeps grant controls hidden for an organisation admin and invitation controls hidden for a workspace viewer', async () => {
		render(OrganisationSettingsPage, {
			props: {
				data: {
					user: { id: userId },
					organisation: { id: organisationId, name: 'Acme Studio', slug: 'acme-studio' },
					role: 'admin',
					manager: true,
					workspaces: [],
					members: [],
					invitations: []
				}
			} as never
		});
		await expect.element(page.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
		await expect.element(page.getByText('Grant workspace access', { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Transfer ownership' })).not.toBeInTheDocument();

		render(WorkspacePage, {
			props: {
				data: {
					route: {
						organisation: { id: organisationId, name: 'Acme Studio', slug: 'acme-studio' },
						workspace: { id: workspaceId, name: 'Brand One', slug: 'brand-one' }
					},
					role: 'viewer',
					manager: false,
					canInvite: false,
					members: [],
					audit: [],
					availableMembers: []
				}
			} as never
		});
		await expect.element(page.getByRole('heading', { name: 'Brand One' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Update member access' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Save name' })).not.toBeInTheDocument();
	});

	it('shows recipient actions for a verified pending invitation without exposing its ID', async () => {
		render(InvitationPage, {
			props: {
				data: {
					invitation: {
						invitationId,
						organisationName: 'Acme Studio',
						status: 'pending',
						state: 'pending_acceptance',
						expiresAt: new Date('2026-11-01T12:00:00.000Z')
					},
					emailVerified: true
				}
			} as never
		});

		await expect.element(page.getByText('Join Acme Studio', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Accept invitation' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
		await expect.element(page.getByText(invitationId, { exact: true })).not.toBeInTheDocument();
	});
});
