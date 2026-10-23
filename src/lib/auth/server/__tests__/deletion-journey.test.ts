import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../database/db', () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ getServerEnv: async () => ({ AUTH_ORGANIZATION_PLUGIN: false }), publicEnv: { PUBLIC_CREEM_ENABLED: false } }));

import { accountDeletionPolicyPlugin } from '../deletion-policy';

const databases: Database.Database[] = [];
const baseURL = 'http://localhost:3000';

function makeAuth(deleteTokenExpiresIn?: number) {
	const database = new Database(':memory:');
	databases.push(database);
	const sentLinks: string[] = [];
	const auth = betterAuth({
		database,
		baseURL,
		secret: 'deletion-journey-regression-test-secret-at-least-32-chars',
		emailAndPassword: { enabled: true },
		user: {
			deleteUser: {
				enabled: true,
				...(deleteTokenExpiresIn === undefined ? {} : { deleteTokenExpiresIn }),
				sendDeleteAccountVerification: async ({ url }: { url: string }) => { sentLinks.push(url); }
			}
		},
		plugins: [accountDeletionPolicyPlugin],
		advanced: { backgroundTasks: { handler: () => {} } }
	});
	return { auth, database, sentLinks };
}

type TestAuth = ReturnType<typeof makeAuth>["auth"];

async function signUp(auth: TestAuth, email: string) {
	const response = await auth.api.signUpEmail({
		body: { name: 'Journey User', email, password: 'test-password-123' },
		asResponse: true
	});
	const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
	return { cookie, user: (await response.json()).user };
}

async function requestDeletion(auth: TestAuth, cookie: string) {
	return auth.handler(new Request(`${baseURL}/api/auth/delete-user`, {
		method: 'POST',
		headers: { cookie, origin: baseURL, 'content-type': 'application/json' },
		body: '{}'
	}));
}

function confirmationRequest(url: string, cookie: string) {
	const callback = new URL(url);
	return new Request(`${baseURL}/api/auth/delete-user/callback?token=${encodeURIComponent(callback.searchParams.get('token')!)}&callbackURL=${encodeURIComponent('/auth/goodbye')}`, {
		headers: { cookie, origin: baseURL }
	});
}

afterEach(() => {
	for (const database of databases.splice(0)) database.close();
	vi.clearAllMocks();
});

beforeEach(() => {
	mocks.query.mockResolvedValue({ rows: [] });
});

describe('account deletion confirmation journey', () => {
	it('rejects an expired confirmation link and preserves the account', async () => {
		const { auth, sentLinks } = makeAuth(-1);
		await (await getMigrations(auth.options)).runMigrations();
		const owner = await signUp(auth, 'expired-deletion@example.com');
		const request = await requestDeletion(auth, owner.cookie);
		expect(request.status).toBe(200);
		expect(sentLinks).toHaveLength(1);

		const confirmation = await auth.handler(confirmationRequest(sentLinks[0]!, owner.cookie));
		expect(confirmation.status).toBe(404);
		expect(await (await auth.$context).internalAdapter.findUserById(owner.user.id)).not.toBeNull();
	});

	it('rejects confirmation by a different signed-in user and preserves both accounts', async () => {
		const { auth, sentLinks } = makeAuth();
		await (await getMigrations(auth.options)).runMigrations();
		const owner = await signUp(auth, 'owner-deletion@example.com');
		const other = await signUp(auth, 'other-deletion@example.com');
		await requestDeletion(auth, owner.cookie);

		const confirmation = await auth.handler(confirmationRequest(sentLinks[0]!, other.cookie));
		expect(confirmation.status).toBe(404);
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(owner.user.id)).not.toBeNull();
		expect(await context.internalAdapter.findUserById(other.user.id)).not.toBeNull();
	});

	it('deletes the account only after its owner confirms the emailed link', async () => {
		const { auth, sentLinks } = makeAuth();
		await (await getMigrations(auth.options)).runMigrations();
		const owner = await signUp(auth, 'confirmed-deletion@example.com');
		const requested = await requestDeletion(auth, owner.cookie);
		expect(await requested.json()).toMatchObject({ success: true, message: 'Verification email sent' });
		expect(await (await auth.$context).internalAdapter.findUserById(owner.user.id)).not.toBeNull();

		const confirmation = await auth.handler(confirmationRequest(sentLinks[0]!, owner.cookie));
		expect(confirmation.status).toBe(302);
		expect(confirmation.headers.get('location')).toBe('/auth/goodbye');
		const context = await auth.$context;
		expect(await context.internalAdapter.findUserById(owner.user.id)).toBeNull();
		expect(await context.internalAdapter.findCredentialAccount(owner.user.id)).toBeNull();
	});
});
