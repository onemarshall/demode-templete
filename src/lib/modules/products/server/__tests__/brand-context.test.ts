import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect, type Cookies } from '@sveltejs/kit';

const state = vi.hoisted(() => ({
	authorised: new Map<string, string>(),
	preference: { lastOrganisationId: null as string | null, lastBrandId: null as string | null },
	organisations: [] as unknown[]
}));

vi.mock('#lib/modules/tenancy/server/request.js', () => ({
	requireTenancySession: async () => ({ user: { id: 'user-a', email: 'a@example.com' } })
}));

vi.mock('#lib/modules/tenancy/server/context.js', async () => {
	const { BrandAccessError } = await import('#lib/modules/tenancy/server/errors.js');
	return {
		requireBrandAccess: async (userId: string, brandId: string) => {
			const organisationId = state.authorised.get(brandId);
			if (!organisationId) throw new BrandAccessError();
			return {
				userId,
				organisationId,
				brandId,
				brandSlug: brandId,
				brandRole: 'editor',
				authorizedAction: 'brand:read'
			};
		}
	};
});

vi.mock('#lib/modules/tenancy/server/resolution.js', () => ({
	getBrandPreference: async () => state.preference,
	listSwitcherContext: async () => state.organisations,
	setBrandPreference: async () => {}
}));

import { activateBrand, resolveActiveBrand, routeOf, ACTIVE_BRAND_COOKIE } from '../brand-context.js';

function cookies(value?: string) {
	const set = vi.fn();
	const jar = {
		get: (name: string) => (name === ACTIVE_BRAND_COOKIE ? value : undefined),
		set
	};
	return { cookies: jar as unknown as Cookies, set };
}

function event(cookieValue?: string) {
	const jar = cookies(cookieValue);
	return {
		event: {
			request: new Request('https://montsel.test/app'),
			url: new URL('https://montsel.test/app/diagnostic'),
			cookies: jar.cookies
		},
		set: jar.set
	};
}

const organisations = [
	{
		organisationId: 'org-a',
		organisationName: 'Acme',
		organisationSlug: 'acme',
		role: 'owner',
		brands: [{ brandId: 'brand-a', brandName: 'Acme Studio', brandSlug: 'acme-studio', role: 'editor' }]
	}
];

beforeEach(() => {
	state.authorised = new Map([
		['brand-a', 'org-a'],
		['brand-b', 'org-a']
	]);
	state.preference = { lastOrganisationId: null, lastBrandId: null };
	state.organisations = organisations;
});

describe('active brand resolution', () => {
	it('uses the cookie brand when the user still has access', async () => {
		const { event: requestEvent, set } = event('brand-b');
		const resolved = await resolveActiveBrand(requestEvent);
		expect(resolved.ctx.brandId).toBe('brand-b');
		expect(set).not.toHaveBeenCalled();
	});

	it('ignores a stale cookie and falls back to the saved preference', async () => {
		state.preference = { lastOrganisationId: 'org-a', lastBrandId: 'brand-b' };
		const { event: requestEvent, set } = event('brand-revoked');
		const resolved = await resolveActiveBrand(requestEvent);
		expect(resolved.ctx.brandId).toBe('brand-b');
		expect(set).toHaveBeenCalledWith(ACTIVE_BRAND_COOKIE, 'brand-b', expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
	});

	it('falls back to the first assigned brand when there is no cookie or preference', async () => {
		const { event: requestEvent } = event(undefined);
		const resolved = await resolveActiveBrand(requestEvent);
		expect(resolved.ctx.brandId).toBe('brand-a');
	});

	it('sends a user with no authorised brand to brand setup instead of an empty shell', async () => {
		state.authorised = new Map();
		const { event: requestEvent } = event(undefined);
		try {
			await resolveActiveBrand(requestEvent);
			expect.unreachable('expected a redirect');
		} catch (cause) {
			expect(isRedirect(cause)).toBe(true);
			if (isRedirect(cause)) {
				expect(cause.status).toBe(303);
				expect(cause.location).toBe('/organisations?next=%2Fapp%2Fdiagnostic');
			}
		}
	});
});

describe('brand switching', () => {
	it('re-validates access before setting the cookie', async () => {
		const { event: requestEvent, set } = event('brand-a');
		await expect(activateBrand(requestEvent, 'brand-not-mine')).rejects.toThrow();
		expect(set).not.toHaveBeenCalled();
	});

	it('sets an httpOnly cookie for an authorised brand', async () => {
		const { event: requestEvent, set } = event('brand-a');
		const ctx = await activateBrand(requestEvent, 'brand-b');
		expect(ctx.brandId).toBe('brand-b');
		expect(set).toHaveBeenCalledWith(
			ACTIVE_BRAND_COOKIE,
			'brand-b',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});
});

describe('route metadata', () => {
	it('resolves organisation and brand display names from the switcher context', async () => {
		const { event: requestEvent } = event('brand-a');
		const resolved = await resolveActiveBrand(requestEvent);
		expect(routeOf(resolved.ctx, organisations)).toEqual({
			organisation: { id: 'org-a', name: 'Acme', slug: 'acme' },
			brand: { id: 'brand-a', name: 'Acme Studio', slug: 'brand-a' }
		});
	});
});
