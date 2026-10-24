import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	requireTenancySession: vi.fn(),
	formText: vi.fn((form: FormData, key: string) => String(form.get(key) ?? '').trim()),
	actionFailure: vi.fn((cause: unknown) => ({ failure: cause })),
	organisationSettings: vi.fn(),
	grantAdministrativeAssignment: vi.fn(),
	transferOwnership: vi.fn(),
	removeOrganisationMember: vi.fn(),
	retryProvisioning: vi.fn()
}));

vi.mock('#lib/server/brand/request.js', () => ({
	requireTenancySession: mocks.requireTenancySession,
	formText: mocks.formText,
	actionFailure: mocks.actionFailure
}));
vi.mock('#lib/server/brand/management.js', () => ({ organisationSettings: mocks.organisationSettings }));
vi.mock('#lib/server/brand/brands.js', () => ({ createBrand: vi.fn(), archiveBrand: vi.fn() }));
vi.mock('#lib/server/brand/repositories.js', () => ({
	grantAdministrativeAssignment: mocks.grantAdministrativeAssignment,
	listBrandMembers: vi.fn(),
	revokeBrandAssignment: vi.fn(),
	updateBrandMetadata: vi.fn()
}));
vi.mock('#lib/server/brand/lifecycle.js', () => ({
	transferOwnership: mocks.transferOwnership,
	removeOrganisationMember: mocks.removeOrganisationMember
}));
vi.mock('#lib/server/brand/invitations.js', () => ({ resendInvitationEmail: vi.fn(), cancelBrandInvitation: vi.fn() }));
vi.mock('#lib/server/brand/provisioning.js', () => ({ retryProvisioning: mocks.retryProvisioning }));

import { actions } from '../+page.server';

const user = { id: 'authenticated-user', email: 'owner@example.test' };
const organisation = { id: 'session-org', slug: 'acme', name: 'Acme' };

function event(form: FormData) {
	const headers = new Headers({ cookie: 'session=request-bound' });
	return {
		params: { organisationSlug: 'acme' },
		request: new Request('https://app.example.test/o/acme/settings', { method: 'POST', headers, body: form }),
		url: new URL('https://app.example.test/o/acme/settings')
	};
}

describe('organisation settings actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireTenancySession.mockResolvedValue({ user, session: { createdAt: new Date() } });
		mocks.organisationSettings.mockResolvedValue({
			organisation,
			invitations: [{ id: 'provisioning-1' }],
			brands: []
		});
	});

	it('uses the authenticated actor and organisation slug, not submitted actor identifiers', async () => {
		const form = new FormData();
		form.set('actorUserId', 'forged-user');
		form.set('organisationId', 'forged-org');
		form.set('brandId', 'selected-brand');
		form.set('targetUserId', 'intended-target');
		form.set('role', 'brand_admin');
		form.set('reason', 'Explicit owner grant');

		await actions.grant(event(form) as never);
		expect(mocks.organisationSettings).toHaveBeenCalledWith('authenticated-user', 'acme');
		expect(mocks.grantAdministrativeAssignment).toHaveBeenCalledWith({
			actorUserId: 'authenticated-user',
			organisationId: 'session-org',
			brandId: 'selected-brand',
			targetUserId: 'intended-target',
			role: 'brand_admin',
			reason: 'Explicit owner grant'
		});
	});

	it('rejects an organisation role submitted as a brand role', async () => {
		const form = new FormData();
		form.set('brandId', 'selected-brand');
		form.set('targetUserId', 'intended-target');
		form.set('role', 'owner');
		form.set('reason', 'attempted escalation');

		await actions.grant(event(form) as never);
		expect(mocks.grantAdministrativeAssignment).not.toHaveBeenCalled();
	});

	it('retries only an invitation listed for this organisation and forwards request headers', async () => {
		const form = new FormData();
		form.set('provisioningId', 'provisioning-1');
		const request = event(form);
		await actions.retry(request as never);
		expect(mocks.retryProvisioning).toHaveBeenCalledWith({
			provisioningId: 'provisioning-1',
			actorUserId: 'authenticated-user',
			headers: request.request.headers
		});

		mocks.organisationSettings.mockResolvedValueOnce({ organisation, invitations: [], brands: [] });
		await actions.retry(event(form) as never);
		expect(mocks.retryProvisioning).toHaveBeenCalledTimes(1);
	});
});
