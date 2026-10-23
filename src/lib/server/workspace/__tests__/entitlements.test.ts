import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), getPersonalOrganisationOwner: vi.fn() }));
vi.mock('#lib/auth/server/database/db.js', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('../better-auth-adapter.js', () => ({ getPersonalOrganisationOwner: mocks.getPersonalOrganisationOwner }));

import { isOrganisationEntitled } from '../entitlements.js';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getPersonalOrganisationOwner.mockResolvedValue('owner-1');
	mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('creem_subscription') ? [] : [] }));
});

describe('transitional subscription entitlement', () => {
	it('uses the explicit personal organisation owner mapping', async () => {
		await isOrganisationEntitled('org-1');
		expect(mocks.getPersonalOrganisationOwner).toHaveBeenCalledWith('org-1');
		expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('"referenceId" = $1'), ['owner-1']);
	});

	it('accepts an active subscription only through its future paid-through period', async () => {
		const status = 'active';
		mocks.query.mockResolvedValue({ rows: [{ status, periodEnd: new Date(Date.now() + 60_000) }] });
		expect(await isOrganisationEntitled('org-1')).toBe(true);
		mocks.query.mockResolvedValue({ rows: [{ status, periodEnd: new Date(Date.now() - 60_000) }] });
		expect(await isOrganisationEntitled('org-1')).toBe(false);
	});

	it.each(['trialing', 'scheduled_cancel', 'canceled', 'unpaid', 'paused', 'past_due', 'expired', 'unknown'])('rejects non-active %s status', async (status) => {
		mocks.query.mockResolvedValue({ rows: [{ status, periodEnd: new Date(Date.now() + 60_000) }] });
		expect(await isOrganisationEntitled('org-1')).toBe(false);
	});

	it('accepts any qualifying live row instead of letting a newer inactive row hide it', async () => {
		mocks.query.mockResolvedValue({ rows: [
			{ status: 'unpaid', periodEnd: new Date(Date.now() + 60_000) },
			{ status: 'active', periodEnd: new Date(Date.now() + 60_000) }
		] });
		expect(await isOrganisationEntitled('org-1')).toBe(true);
	});

	it('denies entitlement when the organisation has no retained personal owner', async () => {
		mocks.getPersonalOrganisationOwner.mockResolvedValue(null);
		expect(await isOrganisationEntitled('org-1')).toBe(false);
		expect(mocks.query).not.toHaveBeenCalled();
	});
});
