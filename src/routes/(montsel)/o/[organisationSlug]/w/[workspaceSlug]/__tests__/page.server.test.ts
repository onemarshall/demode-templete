import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	workspaceRequest: vi.fn(),
	formText: vi.fn((form: FormData, key: string) => String(form.get(key) ?? '').trim()),
	actionFailure: vi.fn((cause: unknown) => ({ failure: cause })),
	createWorkspaceInvitation: vi.fn(),
	grantWorkspaceAssignment: vi.fn(),
	revokeWorkspaceAssignment: vi.fn(),
	updateWorkspaceMetadata: vi.fn(),
	setWorkspacePreference: vi.fn()
}));

vi.mock('#lib/auth.js', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ getServerEnv: vi.fn(async () => ({ AUTH_ORGANIZATION_PLUGIN: true })) }));
vi.mock('#lib/server/workspace/request.js', () => ({
	workspaceRequest: mocks.workspaceRequest,
	formText: mocks.formText,
	actionFailure: mocks.actionFailure
}));
vi.mock('#lib/server/workspace/repositories.js', () => ({
	listWorkspaceMembers: vi.fn(),
	grantWorkspaceAssignment: mocks.grantWorkspaceAssignment,
	revokeWorkspaceAssignment: mocks.revokeWorkspaceAssignment,
	updateWorkspaceMetadata: mocks.updateWorkspaceMetadata
}));
vi.mock('#lib/server/workspace/invitations.js', () => ({ createWorkspaceInvitation: mocks.createWorkspaceInvitation }));
vi.mock('#lib/server/workspace/audit.js', () => ({ listWorkspaceAuditEvents: vi.fn() }));
vi.mock('#lib/server/workspace/context.js', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('#lib/server/workspace/resolution.js', () => ({ setWorkspacePreference: mocks.setWorkspacePreference }));

import { actions } from '../+page.server';

const context = {
	userId: 'session-user',
	organisationId: 'route-org',
	workspaceId: 'route-workspace',
	workspaceRole: 'workspace_admin'
};

function event(form: FormData) {
	const headers = new Headers({ cookie: 'session=route-session' });
	return {
		params: { organisationSlug: 'acme', workspaceSlug: 'brand' },
		request: new Request('https://app.example.test/o/acme/w/brand', { method: 'POST', headers, body: form }),
		url: new URL('https://app.example.test/o/acme/w/brand')
	};
}

describe('workspace route actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.workspaceRequest.mockResolvedValue({ ctx: context });
		mocks.createWorkspaceInvitation.mockResolvedValue({ emailDelivered: true });
	});

	it('derives invitation actor, organisation and workspace from the authorised route context', async () => {
		const form = new FormData();
		form.set('email', 'invitee@example.test');
		form.set('role', 'editor');
		form.set('inviterUserId', 'forged-actor');
		form.set('organisationId', 'forged-org');
		form.set('workspaceId', 'forged-workspace');
		const request = event(form);

		await actions.invite(request as never);
		expect(mocks.workspaceRequest).toHaveBeenCalledWith(request, 'workspace_members:manage');
		expect(mocks.createWorkspaceInvitation).toHaveBeenCalledWith({
			inviterUserId: 'session-user',
			organisationId: 'route-org',
			email: 'invitee@example.test',
			assignments: [{ workspaceId: 'route-workspace', role: 'editor' }],
			headers: request.request.headers
		});
	});

	it('rejects a forged organisation role before calling the invitation service', async () => {
		const form = new FormData();
		form.set('email', 'invitee@example.test');
		form.set('role', 'owner');
		await actions.invite(event(form) as never);
		expect(mocks.createWorkspaceInvitation).not.toHaveBeenCalled();
	});
});
