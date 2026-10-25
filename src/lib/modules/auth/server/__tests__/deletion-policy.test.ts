import { configureAuthIntegrations } from '../integrations';
import { billingAuthPolicies } from '#lib/app/billing-auth-policy.server.js';
const configureTestIntegrations = () => configureAuthIntegrations({
  ...billingAuthPolicies,
  assertNoRetainedMemberships: mocks.membershipGuard,
  organizationHooks: {}, additionalPlugins: () => [], getDashboardSystemHealth: async () => null,
});
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';
import { admin } from 'better-auth/plugins/admin';
const mocks = vi.hoisted(() => ({ query: vi.fn(), membershipGuard: vi.fn(), env: { PUBLIC_CREEM_ENABLED: true } }));
vi.mock('#lib/platform/database/db.js', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('#lib/platform/config/server.server.js', () => ({ getServerEnv: async () => ({ AUTH_ORGANIZATION_PLUGIN: false }), publicEnv: mocks.env }));
vi.mock('#lib/platform/config/index.js', () => ({ getServerEnv: async () => ({ AUTH_ORGANIZATION_PLUGIN: false }), publicEnv: mocks.env }));
import { loadDeletionEligibility, assertCanDeleteAccount, subscriptionPreventsDeletion, accountDeletionPolicyPlugin } from '../deletion-policy';

const user = { id: 'test-user', role: 'user' };
const past = new Date(Date.now() - 10000);
const future = new Date(Date.now() + 100000);

describe('account deletion policy', () => {
	beforeEach(() => { configureTestIntegrations(); vi.clearAllMocks(); mocks.env.PUBLIC_CREEM_ENABLED = true; mocks.query.mockResolvedValue({ rows: [] }); });
	it('blocks multi-role administrators before querying billing', async () => {
		expect(await loadDeletionEligibility({ ...user, role: 'user, admin' })).toMatchObject({ allowed: false, reason: 'admin' });
		expect(mocks.query).not.toHaveBeenCalled();
	});
	it.each(['active', 'trialing', 'unpaid', 'past_due', 'paused', 'scheduled_cancel', 'unknown'])('blocks a %s subscription even after its recorded period', (status) => {
		expect(subscriptionPreventsDeletion({ status, periodEnd: past })).toBe(true);
	});
	it.each(['canceled', 'expired'])('allows %s only when the period is known and ended', (status) => {
		expect(subscriptionPreventsDeletion({ status, periodEnd: past })).toBe(false);
		expect(subscriptionPreventsDeletion({ status, periodEnd: future })).toBe(true);
		expect(subscriptionPreventsDeletion({ status, periodEnd: null })).toBe(true);
		expect(subscriptionPreventsDeletion({ status, periodEnd: 'invalid' })).toBe(true);
	});
	it('checks every subscription and blocks an older active record', async () => {
		mocks.query.mockResolvedValue({ rows: [{ status: 'canceled', periodEnd: past }, { status: 'active', periodEnd: future }] });
		expect(await loadDeletionEligibility(user)).toMatchObject({ allowed: false, reason: 'subscription' });
		expect(mocks.query).toHaveBeenCalledWith(expect.not.stringContaining('LIMIT'), [user.id]);
	});
	it('preserves retained membership protection before checking subscriptions', async () => {
		mocks.membershipGuard.mockRejectedValueOnce(new Error('Retained organization membership'));
		await expect(assertCanDeleteAccount(user)).rejects.toThrow('Retained organization membership');
		expect(mocks.query).not.toHaveBeenCalled();
	});
	it('allows an account with no subscriptions', async () => {
		expect(await loadDeletionEligibility(user)).toEqual({ allowed: true, reason: null, message: null });
	});
	it('fails closed when billing cannot be checked', async () => {
		mocks.query.mockRejectedValue(new Error('database unavailable'));
		expect(await loadDeletionEligibility(user)).toMatchObject({ allowed: false, reason: 'unavailable' });
		await expect(assertCanDeleteAccount(user)).rejects.toMatchObject({ status: 'SERVICE_UNAVAILABLE' });
	});
	it('does not require a billing schema for installations without billing', async () => {
		mocks.env.PUBLIC_CREEM_ENABLED = false;
		mocks.query.mockRejectedValue(Object.assign(new Error('table missing'), { code: '42P01' }));
		expect(await loadDeletionEligibility(user)).toMatchObject({ allowed: true });
		expect(mocks.query).toHaveBeenCalledOnce();
	});
	it('still checks existing subscriptions when the billing feature is disabled', async () => {
		mocks.env.PUBLIC_CREEM_ENABLED = false;
		mocks.query.mockResolvedValue({ rows: [{ status: 'active', periodEnd: future }] });
		expect(await loadDeletionEligibility(user)).toMatchObject({ allowed: false, reason: 'subscription' });
	});
	it('blocks a missing schema when billing is enabled', async () => {
		mocks.query.mockRejectedValue(Object.assign(new Error('table missing'), { code: '42P01' }));
		expect(await loadDeletionEligibility(user)).toMatchObject({ allowed: false, reason: 'unavailable' });
	});
	it('checks billing again on confirmation even after a previously eligible request', async () => {
		await expect(assertCanDeleteAccount(user)).resolves.toBeUndefined();
		mocks.query.mockResolvedValue({ rows: [{ status: 'active', periodEnd: future }] });
		await expect(assertCanDeleteAccount(user)).rejects.toMatchObject({ status: 'FORBIDDEN' });
	});
	it('rejects a real Better Auth deletion request before scheduling its email', async () => {
		const db = new Database(':memory:');
		const send = vi.fn();
		const auth = betterAuth({
			database: db, baseURL: 'http://localhost:3000',
			secret: 'deletion-policy-regression-test-at-least-32-characters',
			emailAndPassword: { enabled: true },
			user: { deleteUser: { enabled: true, sendDeleteAccountVerification: send } },
			plugins: [accountDeletionPolicyPlugin],
			advanced: { backgroundTasks: { handler: () => {} } }
		});
		try {
			await (await getMigrations(auth.options)).runMigrations();
			const signup = await auth.api.signUpEmail({ body: { name: 'User', email: 'deletion-test@example.com', password: 'test-password' }, asResponse: true });
			const cookie = signup.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
			mocks.query.mockResolvedValue({ rows: [{ status: 'active', periodEnd: future }] });
			const response = await auth.handler(new Request('http://localhost:3000/api/auth/delete-user', {
				method: 'POST', headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: '{}'
			}));
			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({ code: 'ACCOUNT_DELETION_BLOCKED' });
			expect(send).not.toHaveBeenCalled();
		} finally { db.close(); }
	});
	it.each(['unauthorised', 'subscription', 'administrator', 'eligible'] as const)('protects admin removal: %s', async (scenario) => {
		const db = new Database(':memory:');
		const auth = betterAuth({
			database: db, baseURL: 'http://localhost:3000',
			secret: 'admin-deletion-regression-test-at-least-32-characters',
			emailAndPassword: { enabled: true }, plugins: [admin(), accountDeletionPolicyPlugin]
		});
		try {
			await (await getMigrations(auth.options)).runMigrations();
			const signup = async (email: string) => auth.api.signUpEmail({ body: { name: 'User', email, password: 'test-password' }, asResponse: true });
			const requester = await signup('requester@example.com');
			const requesterId = (await requester.clone().json()).user.id;
			const target = await signup('target@example.com');
			const targetId = (await target.json()).user.id;
			const context = await auth.$context;
			if (scenario !== 'unauthorised') await context.internalAdapter.updateUser(requesterId, { role: 'admin' });
			if (scenario === 'administrator') await context.internalAdapter.updateUser(targetId, { role: 'admin' });
			mocks.query.mockResolvedValue({ rows: scenario === 'eligible' ? [] : [{ status: 'active', periodEnd: future }] });
			const cookie = requester.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
			const response = await auth.handler(new Request('http://localhost:3000/api/auth/admin/remove-user', {
				method: 'POST', headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ userId: targetId })
			}));
			if (scenario === 'eligible') {
				expect(response.status).toBe(200);
				expect(await context.internalAdapter.findUserById(targetId)).toBeNull();
				return;
			}
			expect(response.status).toBe(403);
			if (scenario === 'unauthorised') {
				expect(mocks.query).not.toHaveBeenCalled();
				expect(await response.json()).not.toMatchObject({ code: 'ACCOUNT_DELETION_BLOCKED' });
			} else {
				expect(await response.json()).toMatchObject({ code: 'ACCOUNT_DELETION_BLOCKED' });
			}
			expect(await context.internalAdapter.findUserById(targetId)).not.toBeNull();
			expect(await context.internalAdapter.findCredentialAccount(targetId)).not.toBeNull();
		} finally { db.close(); }
	});
});
