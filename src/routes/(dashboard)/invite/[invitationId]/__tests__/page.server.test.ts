import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	requireTenancySession: vi.fn(),
	recipientInvitation: vi.fn(),
	acceptInvitation: vi.fn(),
	rejectInvitation: vi.fn(),
	reconcileAcceptedInvitation: vi.fn(),
	retryProvisioning: vi.fn(),
	actionFailure: vi.fn((cause: unknown) => ({ failure: cause }))
}));

vi.mock('#lib/server/brand/request.js', () => ({
	requireTenancySession: mocks.requireTenancySession,
	actionFailure: mocks.actionFailure
}));
vi.mock('#lib/server/brand/management.js', () => ({ recipientInvitation: mocks.recipientInvitation }));
vi.mock('#lib/server/brand/organization-api.js', () => ({
	organizationApi: () => ({ acceptInvitation: mocks.acceptInvitation, rejectInvitation: mocks.rejectInvitation })
}));
vi.mock('#lib/server/brand/provisioning.js', () => ({
	reconcileAcceptedInvitation: mocks.reconcileAcceptedInvitation,
	retryProvisioning: mocks.retryProvisioning
}));

import { actions } from '../+page.server';

const user = { id: 'session-user', email: 'recipient@example.test', emailVerified: true };

function event(invitationId = 'route-invitation', form = new FormData()) {
	const headers = new Headers({ cookie: 'session=the-request-session' });
	return {
		params: { invitationId },
		request: new Request(`https://app.example.test/invite/${invitationId}`, { method: 'POST', headers, body: form }),
		url: new URL(`https://app.example.test/invite/${invitationId}`)
	};
}

describe('invitation acceptance and recovery routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireTenancySession.mockResolvedValue({ user, session: { createdAt: new Date() } });
		mocks.recipientInvitation.mockResolvedValue({
			invitationId: 'server-authorized-invitation',
			provisioningId: 'provisioning-1',
			status: 'pending',
			state: 'pending_acceptance'
		});
	});

	it('accepts only the invitation resolved for the signed-in recipient and forwards request headers', async () => {
		const request = event('route-invitation', new FormData());
		await actions.accept(request as never);
		expect(mocks.requireTenancySession).toHaveBeenCalledWith(request);
		expect(mocks.recipientInvitation).toHaveBeenCalledWith(user, 'route-invitation');
		expect(mocks.acceptInvitation).toHaveBeenCalledWith({
			headers: request.request.headers,
			body: { invitationId: 'server-authorized-invitation' }
		});
	});

	it('retries through the authenticated recovery path with the exact request headers', async () => {
		mocks.recipientInvitation.mockResolvedValueOnce({
			invitationId: 'server-authorized-invitation',
			provisioningId: 'provisioning-1',
			status: 'accepted',
			state: 'retry_pending'
		});
		const request = event();
		await actions.retry(request as never);
		expect(mocks.retryProvisioning).toHaveBeenCalledWith({
			provisioningId: 'provisioning-1',
			actorUserId: 'session-user',
			headers: request.request.headers
		});
	});

	it('reconciles an accepted invitation that has not yet bound its recipient', async () => {
		mocks.recipientInvitation.mockResolvedValueOnce({
			invitationId: 'server-authorized-invitation',
			provisioningId: 'provisioning-1',
			status: 'accepted',
			state: 'pending_acceptance'
		});
		await actions.retry(event() as never);
		expect(mocks.reconcileAcceptedInvitation).toHaveBeenCalledWith('server-authorized-invitation', 'session-user');
		expect(mocks.retryProvisioning).not.toHaveBeenCalled();
	});

	it('does not accept an invitation when recipient lookup fails', async () => {
		mocks.recipientInvitation.mockRejectedValueOnce(new Error('not the intended recipient'));
		await actions.accept(event() as never);
		expect(mocks.acceptInvitation).not.toHaveBeenCalled();
		expect(mocks.actionFailure).toHaveBeenCalled();
	});
});
