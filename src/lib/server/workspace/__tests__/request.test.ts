import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const { getSession, getServerEnv, requireWorkspaceAccess, resolveRouteWorkspace } = vi.hoisted(() => ({
	getSession: vi.fn(),
	getServerEnv: vi.fn(),
	requireWorkspaceAccess: vi.fn(),
	resolveRouteWorkspace: vi.fn()
}));

vi.mock('#lib/auth.js', () => ({ auth: { api: { getSession } } }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ getServerEnv }));
vi.mock('../context.js', () => ({ requireWorkspaceAccess }));
vi.mock('../resolution.js', () => ({ resolveRouteWorkspace }));
vi.mock('../errors.js', () => ({ isWorkspaceAccessError: vi.fn(() => false) }));

import { requireTenancySession, workspaceRequest } from '../request.js';

function event(params: Record<string, string>, path = '/o/acme/w/brand'): RequestEvent {
	const headers = new Headers({ cookie: 'session=bound-session' });
	return {
		request: new Request(`https://app.example.test${path}`, { headers }),
		url: new URL(`https://app.example.test${path}?view=home`),
		params,
		locals: { activeOrganizationId: 'attacker-selected-org' }
	} as unknown as RequestEvent;
}

describe('tenancy request boundary', () => {
	beforeEach(() => {
		getSession.mockReset();
		getServerEnv.mockReset().mockResolvedValue({ AUTH_ORGANIZATION_PLUGIN: true });
		requireWorkspaceAccess.mockReset();
		resolveRouteWorkspace.mockReset();
	});

	it('checks the feature gate before reading a session', async () => {
		getServerEnv.mockResolvedValue({ AUTH_ORGANIZATION_PLUGIN: false });
		await expect(requireTenancySession(event({}))).rejects.toMatchObject({ status: 404 });
		expect(getSession).not.toHaveBeenCalled();
	});

	it('binds authentication to the request headers and redirects anonymous users back to their path', async () => {
		const request = event({}, '/o/acme/w/brand');
		getSession.mockResolvedValueOnce(null);
		await expect(requireTenancySession(request)).rejects.toMatchObject({
			status: 303,
			location: '/auth/sign-in?redirectTo=%2Fo%2Facme%2Fw%2Fbrand%3Fview%3Dhome'
		});
		expect(getSession).toHaveBeenCalledWith({ headers: request.request.headers });
	});

	it('uses each tab route as immutable workspace context instead of the active organisation preference', async () => {
		getSession.mockResolvedValue({ user: { id: 'signed-in-user' }, session: { activeOrganizationId: 'org-one' } });
		resolveRouteWorkspace.mockImplementation(async (organisationSlug: string, workspaceSlug: string) => ({
			organisation: { id: organisationSlug === 'acme' ? 'org-one' : 'org-two', slug: organisationSlug },
			workspace: { id: workspaceSlug === 'brand' ? 'workspace-one' : 'workspace-two', slug: workspaceSlug }
		}));
		requireWorkspaceAccess.mockImplementation(async (_userId: string, workspaceId: string, action: string) => ({
			userId: 'signed-in-user',
			organisationId: workspaceId === 'workspace-one' ? 'org-one' : 'org-two',
			workspaceId,
			action
		}));

		const firstTab = await workspaceRequest(event({ organisationSlug: 'acme', workspaceSlug: 'brand' }), 'workspace:read');
		const secondTab = await workspaceRequest(event({ organisationSlug: 'client', workspaceSlug: 'studio' }), 'workspace:update');

		expect(resolveRouteWorkspace.mock.calls).toEqual([
			['acme', 'brand'],
			['client', 'studio']
		]);
		expect(requireWorkspaceAccess.mock.calls).toEqual([
			['signed-in-user', 'workspace-one', 'workspace:read'],
			['signed-in-user', 'workspace-two', 'workspace:update']
		]);
		expect(firstTab.ctx.workspaceId).toBe('workspace-one');
		expect(secondTab.ctx.workspaceId).toBe('workspace-two');
	});

	it('hides an organisation/workspace slug mismatch without checking access to the other workspace', async () => {
		getSession.mockResolvedValue({ user: { id: 'signed-in-user' }, session: {} });
		resolveRouteWorkspace.mockResolvedValue(null);
		await expect(
			workspaceRequest(event({ organisationSlug: 'wrong-org', workspaceSlug: 'brand' }), 'workspace:read')
		).rejects.toMatchObject({ status: 404 });
		expect(requireWorkspaceAccess).not.toHaveBeenCalled();
	});
});
