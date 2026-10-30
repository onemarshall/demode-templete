import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));

vi.mock('#lib/platform/database/db.js', () => ({
	getDB: async () => ({
		query: mocks.query,
		connect: async () => ({ query: mocks.query, release: mocks.release })
	})
}));
vi.mock('#lib/modules/tenancy/server/better-auth-adapter.js', () => ({
	findMembership: async (userId: string, organisationId: string) => ({
		id: `member-${organisationId}`,
		organizationId: organisationId,
		userId,
		role: 'owner',
		createdAt: new Date()
	}),
	getPersonalOrganisationOwner: async () => null
}));

import { requireBrandAccess } from '#lib/modules/tenancy/server/context.js';
import { createThread } from '../comments.js';

function mockRoute(route: string) {
	mocks.query.mockImplementation(async (sql: string) => {
		if (sql.includes('FROM "brand"'))
			return {
				rows: [
					{
						id: 'brand-a',
						organisationId: 'org-a',
						name: 'Acme',
						slug: 'acme',
						createdBy: 'user-a',
						status: 'active'
					}
				]
			};
		if (sql.includes('FROM "brand_member"'))
			return {
				rows: [
					{
						id: 'a',
						brandId: 'brand-a',
						userId: 'user-a',
						role: 'brand_admin',
						status: 'active',
						expiresAt: null,
						grantSource: 'backfill',
						grantedBy: null,
						provisioningId: null,
						createdAt: new Date(),
						updatedAt: new Date()
					}
				]
			};
		if (sql.includes('FROM "diagnostic_engagement"'))
			return { rows: [{ deliveryRoute: route }] };
		return { rows: [] };
	});
}

async function context() {
	return requireBrandAccess('user-a', 'brand-a', 'brand:read');
}

beforeEach(() => {
	vi.clearAllMocks();
	mockRoute('montsel_self_service');
});

describe('report conversation rules', () => {
	it('refuses a Montsel question at the repository boundary', async () => {
		await expect(
			createThread(await context(), {
				outputId: 'out_run-1',
				outputVersionId: 'v1',
				kind: 'question',
				body: 'Why does this finding say that?'
			})
		).rejects.toThrow(/corrections and explanations only/);
	});

	it('refuses a Montsel revision request at the repository boundary', async () => {
		await expect(
			createThread(await context(), {
				outputId: 'out_run-1',
				outputVersionId: 'v1',
				kind: 'revision_request',
				body: 'Please change the finding.'
			})
		).rejects.toThrow(/corrections and explanations only/);
	});

	it('accepts a Montsel correction', async () => {
		const id = await createThread(await context(), {
			outputId: 'out_run-1',
			outputVersionId: 'v1',
			kind: 'correction',
			body: 'The services page was captured from the old site.'
		});
		expect(id).toMatch(/^thr_/);
	});

	it('accepts a Langfell question', async () => {
		mockRoute('langfell_consultancy');
		const id = await createThread(await context(), {
			outputId: 'out_run-2',
			outputVersionId: 'v2',
			kind: 'question',
			body: 'What did you weigh against this recommendation?'
		});
		expect(id).toMatch(/^thr_/);
	});
});
