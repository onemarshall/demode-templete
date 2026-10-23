import { afterEach, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';
import { admin } from 'better-auth/plugins/admin';

const { recordHistory } = vi.hoisted(() => ({ recordHistory: vi.fn() }));
vi.mock('../history.js', () => ({ recordHistory }));

import { historyPlugin } from '../plugins/history.js';

const databases: Database.Database[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

async function createTestAuth() {
	const db = new Database(':memory:');
	databases.push(db);
	const auth = betterAuth({
		database: db,
		baseURL: 'http://localhost:3000',
		secret: 'auth-history-integration-test-secret-at-least-32-characters',
		emailAndPassword: { enabled: true },
		plugins: [admin(), historyPlugin()]
	});
	await (await getMigrations(auth.options)).runMigrations();
	return { auth, db };
}

function cookie(response: Response) {
	return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}

async function post(auth: Awaited<ReturnType<typeof createTestAuth>>['auth'], path: string, body: unknown, sessionCookie: string) {
	return auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
		method: 'POST',
		headers: { cookie: sessionCookie, origin: 'http://localhost:3000', 'content-type': 'application/json' },
		body: JSON.stringify(body)
	}));
}

describe('history plugin against Better Auth endpoints', () => {
	it('records actual password failures, profile changes, and admin role outcomes', async () => {
		recordHistory.mockReset().mockResolvedValue(undefined);
		const { auth, db } = await createTestAuth();
		const register = async (email: string) => auth.api.signUpEmail({ body: { name: 'Member', email, password: 'correct-password-123' }, asResponse: true });
		const administrator = await register('history-admin@example.test');
		const target = await register('history-target@example.test');
		const adminId = (await administrator.clone().json()).user.id as string;
		const targetId = (await target.clone().json()).user.id as string;
		const denied = await post(auth, '/admin/set-role', { userId: targetId, role: 'moderator' }, cookie(target));
		expect(denied.status).toBe(403);
		const context = await auth.$context;
		await context.internalAdapter.updateUser(adminId, { role: 'admin' });
		const changed = await post(auth, '/admin/set-role', { userId: targetId, role: 'moderator' }, cookie(administrator));
		expect(changed.status).toBe(200);
		const targetCookie = cookie(target);
		const badPassword = await post(auth, '/change-password', { currentPassword: 'wrong-password', newPassword: 'another-password-123' }, targetCookie);
		expect(badPassword.status).toBeGreaterThanOrEqual(400);
		const updated = await post(auth, '/update-user', { name: 'Updated Member' }, targetCookie);
		expect(updated.status).toBe(200);
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({ category: 'admin', action: 'role_changed', outcome: 'success', actorId: adminId, targetId, metadata: { role: 'moderator' } }));
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({ category: 'admin', action: 'role_changed', outcome: 'failure', actorId: targetId, targetId, metadata: { role: 'moderator' } }));
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({ category: 'account', action: 'password_changed', outcome: 'failure', actorId: targetId }));
		expect(recordHistory).toHaveBeenCalledWith(expect.objectContaining({ category: 'account', action: 'profile_updated', outcome: 'success', actorId: targetId }));
		expect(db.prepare('SELECT role FROM user WHERE id = ?').get(targetId)).toEqual({ role: 'moderator' });
	});
});
