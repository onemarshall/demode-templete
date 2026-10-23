import { describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';
import { accountUnlinkPolicyPlugin, hasUsableAlternative } from '../account-unlink-policy';

const google = { id: 'google-account', providerId: 'google' };
const credential = { id: 'password-account', providerId: 'credential', password: 'server-only-hash' };

describe('last usable login method protection', () => {
	it('ignores empty credentials, unconfigured providers and unknown accounts', () => {
		expect(hasUsableAlternative([google, { ...credential, password: null }, { id: 'github-account', providerId: 'github' }, { id: 'unknown', providerId: 'unknown' }], google.id, new Set(['google']), true)).toBe(false);
	});
	it('counts a password only when password sign-in is enabled', () => {
		expect(hasUsableAlternative([google, credential], google.id, new Set(['google']), true)).toBe(true);
		expect(hasUsableAlternative([google, credential], google.id, new Set(['google']), false)).toBe(false);
	});
	it('counts another configured provider', () => {
		expect(hasUsableAlternative([google, { id: 'github-account', providerId: 'github' }], google.id, new Set(['google', 'github']), false)).toBe(true);
	});
	it.each([false, true])('guards a real unlink request with password present=%s', async (passwordPresent) => {
		const db = new Database(':memory:');
		const auth = betterAuth({
			database: db, baseURL: 'http://localhost:3000',
			secret: 'unlink-policy-regression-at-least-32-characters',
			emailAndPassword: { enabled: true },
			socialProviders: { google: { clientId: 'test-client', clientSecret: 'test-secret' } },
			plugins: [accountUnlinkPolicyPlugin]
		});
		try {
			await (await getMigrations(auth.options)).runMigrations();
			const signup = await auth.api.signUpEmail({ body: { name: 'User', email: 'unlink-test@example.com', password: 'test-password' }, asResponse: true });
			const cookie = signup.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
			const user = db.prepare('SELECT id FROM user').get() as { id: string };
			if (!passwordPresent) db.prepare('UPDATE account SET password = NULL').run();
			db.prepare('INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(google.id, 'external-google', 'google', user.id, Date.now(), Date.now());
			db.prepare('INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run('disabled-github', 'external-github', 'github', user.id, Date.now(), Date.now());
			const response = await auth.handler(new Request('http://localhost:3000/api/auth/unlink-account', {
				method: 'POST', headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ accountId: google.id })
			}));
			expect(response.status).toBe(passwordPresent ? 200 : 400);
			if (!passwordPresent) expect(await response.json()).toMatchObject({ code: 'LAST_USABLE_LOGIN_METHOD' });
			expect(db.prepare('SELECT id FROM account WHERE id = ?').get(google.id)).toEqual(passwordPresent ? undefined : { id: google.id });
		} finally { db.close(); }
	});
});
