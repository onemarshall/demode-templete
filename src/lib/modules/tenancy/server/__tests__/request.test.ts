import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const { getSession, getServerEnv, requireBrandAccess, resolveRouteBrand } = vi.hoisted(() => ({
	getSession: vi.fn(),
	getServerEnv: vi.fn(),
	requireBrandAccess: vi.fn(),
	resolveRouteBrand: vi.fn()
}));

vi.mock('#lib/modules/auth/server/config.js', () => ({ auth: { api: { getSession } } }));
vi.mock('#lib/platform/config/server.server.js', () => ({ getServerEnv }));
vi.mock('#lib/platform/config/index.js', () => ({ getServerEnv }));
vi.mock('../context.js', () => ({ requireBrandAccess }));
vi.mock('../resolution.js', () => ({ resolveRouteBrand }));
vi.mock('../errors.js', () => ({ isBrandAccessError: vi.fn(() => false) }));

import { requireTenancySession, brandRequest } from '../request.js';

function event(params: Record<string, string>, path = '/o/acme/brand'): RequestEvent {
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
		requireBrandAccess.mockReset();
		resolveRouteBrand.mockReset();
	});

	it('checks the feature gate before reading a session', async () => {
		getServerEnv.mockResolvedValue({ AUTH_ORGANIZATION_PLUGIN: false });
		await expect(requireTenancySession(event({}))).rejects.toMatchObject({ status: 404 });
		expect(getSession).not.toHaveBeenCalled();
	});

	it('binds authentication to the request headers and redirects anonymous users back to their path', async () => {
		const request = event({}, '/o/acme/brand');
		getSession.mockResolvedValueOnce(null);
		await expect(requireTenancySession(request)).rejects.toMatchObject({
			status: 303,
			location: '/auth/sign-in?redirectTo=%2Fo%2Facme%2Fbrand%3Fview%3Dhome'
		});
		expect(getSession).toHaveBeenCalledWith({ headers: request.request.headers });
	});

	it('uses each tab route as immutable brand context instead of the active organisation preference', async () => {
		getSession.mockResolvedValue({ user: { id: 'signed-in-user' }, session: { activeOrganizationId: 'org-one' } });
		resolveRouteBrand.mockImplementation(async (organisationSlug: string, brandSlug: string) => ({
			organisation: { id: organisationSlug === 'acme' ? 'org-one' : 'org-two', slug: organisationSlug },
			brand: { id: brandSlug === 'brand' ? 'brand-one' : 'brand-two', slug: brandSlug }
		}));
		requireBrandAccess.mockImplementation(async (_userId: string, brandId: string, action: string) => ({
			userId: 'signed-in-user',
			organisationId: brandId === 'brand-one' ? 'org-one' : 'org-two',
			brandId,
			action
		}));

		const firstTab = await brandRequest(event({ organisationSlug: 'acme', brandSlug: 'brand' }), 'brand:read');
		const secondTab = await brandRequest(event({ organisationSlug: 'client', brandSlug: 'studio' }), 'brand:update');

		expect(resolveRouteBrand.mock.calls).toEqual([
			['acme', 'brand'],
			['client', 'studio']
		]);
		expect(requireBrandAccess.mock.calls).toEqual([
			['signed-in-user', 'brand-one', 'brand:read'],
			['signed-in-user', 'brand-two', 'brand:update']
		]);
		expect(firstTab.ctx.brandId).toBe('brand-one');
		expect(secondTab.ctx.brandId).toBe('brand-two');
	});

	it('hides an organisation/brand slug mismatch without checking access to the other brand', async () => {
		getSession.mockResolvedValue({ user: { id: 'signed-in-user' }, session: {} });
		resolveRouteBrand.mockResolvedValue(null);
		await expect(
			brandRequest(event({ organisationSlug: 'wrong-org', brandSlug: 'brand' }), 'brand:read')
		).rejects.toMatchObject({ status: 404 });
		expect(requireBrandAccess).not.toHaveBeenCalled();
	});
});
