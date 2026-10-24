import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	brandRequest: vi.fn(),
	formText: vi.fn((form: FormData, key: string) => String(form.get(key) ?? '').trim()),
	actionFailure: vi.fn((cause: unknown) => ({ failure: cause })),
	createBrandInvitation: vi.fn(),
	grantBrandAssignment: vi.fn(),
	revokeBrandAssignment: vi.fn(),
	updateBrandMetadata: vi.fn(),
	setBrandPreference: vi.fn()
}));

vi.mock('#lib/auth/index.js', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ getServerEnv: vi.fn(async () => ({ AUTH_ORGANIZATION_PLUGIN: true })) }));
vi.mock('#lib/server/brand/request.js', () => ({
	brandRequest: mocks.brandRequest,
	formText: mocks.formText,
	actionFailure: mocks.actionFailure
}));
vi.mock('#lib/server/brand/repositories.js', () => ({
	listBrandMembers: vi.fn(),
	grantBrandAssignment: mocks.grantBrandAssignment,
	revokeBrandAssignment: mocks.revokeBrandAssignment,
	updateBrandMetadata: mocks.updateBrandMetadata
}));
vi.mock('#lib/server/brand/invitations.js', () => ({ createBrandInvitation: mocks.createBrandInvitation }));
vi.mock('#lib/server/brand/audit.js', () => ({ listBrandAuditEvents: vi.fn() }));
vi.mock('#lib/server/brand/context.js', () => ({ requireBrandAccess: vi.fn() }));
vi.mock('#lib/server/brand/resolution.js', () => ({ setBrandPreference: mocks.setBrandPreference }));

import { actions } from '../+page.server';

const context = {
	userId: 'session-user',
	organisationId: 'route-org',
	brandId: 'route-brand',
	brandRole: 'brand_admin'
};

function event(form: FormData) {
	const headers = new Headers({ cookie: 'session=route-session' });
	return {
		params: { organisationSlug: 'acme', brandSlug: 'brand' },
		request: new Request('https://app.example.test/o/acme/brand', { method: 'POST', headers, body: form }),
		url: new URL('https://app.example.test/o/acme/brand')
	};
}

describe('brand route actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.brandRequest.mockResolvedValue({ ctx: context });
		mocks.createBrandInvitation.mockResolvedValue({ emailDelivered: true });
	});

	it('derives invitation actor, organisation and brand from the authorised route context', async () => {
		const form = new FormData();
		form.set('email', 'invitee@example.test');
		form.set('role', 'editor');
		form.set('inviterUserId', 'forged-actor');
		form.set('organisationId', 'forged-org');
		form.set('brandId', 'forged-brand');
		const request = event(form);

		await actions.invite(request as never);
		expect(mocks.brandRequest).toHaveBeenCalledWith(request, 'brand_members:manage');
		expect(mocks.createBrandInvitation).toHaveBeenCalledWith({
			inviterUserId: 'session-user',
			organisationId: 'route-org',
			email: 'invitee@example.test',
			assignments: [{ brandId: 'route-brand', role: 'editor' }],
			headers: request.request.headers
		});
	});

	it('rejects a forged organisation role before calling the invitation service', async () => {
		const form = new FormData();
		form.set('email', 'invitee@example.test');
		form.set('role', 'owner');
		await actions.invite(event(form) as never);
		expect(mocks.createBrandInvitation).not.toHaveBeenCalled();
	});
});
