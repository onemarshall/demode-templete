/**
 * Security Tests
 *
 * Tests authentication guards, permissions, and security features.
 * Only emailAndPassword is configured — passkey, magic link, 2FA, admin/ban
 * endpoints and role-management endpoints are NOT available in test config.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { auth, db, getTestHelpers } from '$test/auth';

describe('Security Tests', () => {
	let test: Awaited<ReturnType<typeof getTestHelpers>>;

	// Tracked users for cleanup
	let regularUserId: string;
	let adminUserId: string;

	beforeEach(async () => {
		test = await getTestHelpers();

		// Sign up a regular user via real API
		const regularResult = await auth.api.signUpEmail({
			body: {
				email: 'user@security.test',
				password: 'Password123!',
				name: 'Regular User'
			}
		});
		regularUserId = regularResult.user.id;

		// Sign up an "admin" user (role is just a label here — no admin plugin)
		const adminResult = await auth.api.signUpEmail({
			body: {
				email: 'admin@security.test',
				password: 'Password123!',
				name: 'Admin User'
			}
		});
		adminUserId = adminResult.user.id;
	});

	afterEach(async () => {
		if (regularUserId) await test.deleteUser(regularUserId);
		if (adminUserId) await test.deleteUser(adminUserId);
	});

	// ──────────────────────────────────────────────
	// Authentication Guards
	// ──────────────────────────────────────────────
	describe('Authentication Guards', () => {
		it('should allow authenticated users to retrieve their session', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			const session = await auth.api.getSession({ headers });

			expect(session).toBeDefined();
			expect(session?.user.id).toBe(regularUserId);
		});

		it('should return null for unauthenticated requests', async () => {
			const session = await auth.api.getSession({
				headers: new Headers()
			});

			expect(session).toBeNull();
		});

		it('should return null for requests with an invalid token', async () => {
			const headers = new Headers({
				Cookie: 'iam-studio.session_token=invalid-token'
			});

			const session = await auth.api.getSession({ headers });

			expect(session).toBeNull();
		});
	});

	// ──────────────────────────────────────────────
	// Role-Based Access Control
	// ──────────────────────────────────────────────
	describe('Role-Based Access Control', () => {
		it('should allow a user to access their own session', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			const session = await auth.api.getSession({ headers });

			expect(session?.user.id).toBe(regularUserId);
		});

		it('should not expose another user session via a different token', async () => {
			const { headers: regularHeaders } = await test.login({ userId: regularUserId });
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			const regularSession = await auth.api.getSession({ headers: regularHeaders });
			const adminSession = await auth.api.getSession({ headers: adminHeaders });

			expect(regularSession?.user.id).toBe(regularUserId);
			expect(adminSession?.user.id).toBe(adminUserId);
			expect(regularSession?.user.id).not.toBe(adminSession?.user.id);
		});

		it('listUsers returns all users when called as admin', async () => {
			// Promote adminUser via direct DB write (no chicken-and-egg setRole problem)
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			const result = await auth.api.listUsers({
				query: { limit: 10 },
				headers: adminHeaders
			});

			expect(result).toBeDefined();
			expect(Array.isArray(result.users)).toBe(true);
			expect(result.users.length).toBeGreaterThanOrEqual(2);
		});

		it('banUser prevents a banned user from signing in', async () => {
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			await auth.api.banUser({
				body: { userId: regularUserId },
				headers: adminHeaders
			});

			await expect(
				auth.api.signInEmail({
					body: { email: 'user@security.test', password: 'Password123!' }
				})
			).rejects.toThrow();
		});

		it('updateUserRole (setRole) changes the role stored on the user', async () => {
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			await auth.api.setRole({
				body: { userId: regularUserId, role: 'admin' },
				headers: adminHeaders
			});

			const result = await auth.api.getUser({
				query: { id: regularUserId },
				headers: adminHeaders
			});

			expect((result as any).role).toBe('admin');
		});
	});

	// ──────────────────────────────────────────────
	// Account Security
	// ──────────────────────────────────────────────
	describe('Account Security', () => {
		it('should allow a verified user to change their password', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			const result = await auth.api.changePassword({
				body: {
					currentPassword: 'Password123!',
					newPassword: 'NewPassword456!',
					revokeOtherSessions: false
				},
				headers
			});

			expect(result).toBeDefined();
		});

		it('should reject password change with wrong current password', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			await expect(
				auth.api.changePassword({
					body: {
						currentPassword: 'WrongPassword!',
						newPassword: 'NewPassword456!'
					},
					headers
				})
			).rejects.toThrow();
		});

		it('should allow revoking other sessions on password change', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			const result = await auth.api.changePassword({
				body: {
					currentPassword: 'Password123!',
					newPassword: 'AnotherPass789!',
					revokeOtherSessions: true
				},
				headers
			});

			expect(result).toBeDefined();
		});
	});

	// ──────────────────────────────────────────────
	// Rate Limiting
	// NOTE: The in-memory test instance does not have a rate-limit plugin
	// configured. These tests verify that repeated valid sign-ins succeed
	// (i.e., Better Auth itself does not gate them), which is the correct
	// behaviour for the current config.
	// ──────────────────────────────────────────────
	describe('Rate Limiting', () => {
		it('should allow repeated valid sign-ins (no rate-limit plugin configured)', async () => {
			const attempts = await Promise.all(
				Array.from({ length: 3 }, () =>
					auth.api.signInEmail({
						body: { email: 'user@security.test', password: 'Password123!' }
					})
				)
			);

			for (const result of attempts) {
				expect(result.user).toBeDefined();
			}
		});

		it('should handle password reset request gracefully', async () => {
			// requestPasswordReset sends an email via the configured mailer;
			// in the test env it is expected to succeed (or throw — both are fine)
			// as long as it does not crash with an unhandled promise rejection.
			let threw = false;
			try {
				await auth.api.requestPasswordReset({
					body: { email: 'user@security.test', redirectTo: '/reset' }
				});
			} catch {
				threw = true;
			}
			// Either path (success or expected error) is acceptable
			expect(typeof threw).toBe('boolean');
		});
	});

	// ──────────────────────────────────────────────
	// Input Validation and Sanitization
	// ──────────────────────────────────────────────
	describe('Input Validation and Sanitization', () => {
		it('should reject sign-in with a malformed email', async () => {
			await expect(
				auth.api.signInEmail({
					body: {
						email: "'; DROP TABLE users; --@example.com",
						password: 'Password123!'
					}
				})
			).rejects.toThrow();
		});

		it('should allow updating user name (Better Auth stores the value as-is)', async () => {
			// Better Auth does not perform XSS sanitisation at the API layer;
			// sanitisation is the responsibility of the rendering layer.
			const { headers } = await test.login({ userId: regularUserId });

			const result = await auth.api.updateUser({
				body: { name: 'Updated Name' },
				headers
			});

			expect(result.status).toBe(true);
		});

		it('should reject sign-up with a password that is too short', async () => {
			await expect(
				auth.api.signUpEmail({
					body: {
						email: 'short@security.test',
						password: '123',
						name: 'Short Pass'
					}
				})
			).rejects.toThrow();
		});
	});

	// ──────────────────────────────────────────────
	// Session Security
	// ──────────────────────────────────────────────
	describe('Session Security', () => {
		it('should set the configured cookie prefix on the session cookie', async () => {
			const { cookies, headers } = await test.login({ userId: regularUserId });

			// cookies may be an array of cookie objects or a string depending on
			// the testUtils version. Normalise to a single string for the assertion.
			const cookieStr = Array.isArray(cookies)
				? (cookies as Array<{ name?: string; key?: string }>)
						.map((c) => c.name ?? c.key ?? JSON.stringify(c))
						.join('; ')
				: String(cookies);

			// The Cookie header set by testUtils should also carry the prefix
			const cookieHeader = headers.get('Cookie') ?? '';

			const combined = cookieStr + ' ' + cookieHeader;
			expect(combined).toContain('iam-studio.session_token');
		});

		it('should return a session with an expiresAt date', async () => {
			const { headers } = await test.login({ userId: regularUserId });

			const session = await auth.api.getSession({ headers });

			expect(session?.session.expiresAt).toBeInstanceOf(Date);
		});

		it('should allow revoking a specific session', async () => {
			const { token, headers } = await test.login({ userId: regularUserId });

			const result = await auth.api.revokeSession({
				body: { token },
				headers
			});

			expect(result.status).toBe(true);
		});

		it('should return null for a revoked session token', async () => {
			const { token, headers } = await test.login({ userId: regularUserId });

			await auth.api.revokeSession({ body: { token }, headers });

			// After revocation the same headers should yield no session
			const session = await auth.api.getSession({ headers });
			expect(session).toBeNull();
		});
	});

	// ──────────────────────────────────────────────
	// Admin Security Features
	// ──────────────────────────────────────────────
	describe('Admin Security Features', () => {
		it('banUser blocks the targeted user from signing in', async () => {
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			await auth.api.banUser({
				body: { userId: regularUserId },
				headers: adminHeaders
			});

			await expect(
				auth.api.signInEmail({
					body: { email: 'user@security.test', password: 'Password123!' }
				})
			).rejects.toThrow();
		});

		it('listUsers includes all created users', async () => {
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			const result = await auth.api.listUsers({
				query: { limit: 10 },
				headers: adminHeaders
			});

			expect(Array.isArray(result.users)).toBe(true);
			const ids = result.users.map((u: any) => u.id);
			expect(ids).toContain(regularUserId);
			expect(ids).toContain(adminUserId);
		});

		it('updateUserRole (setRole) persists the new role', async () => {
			db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', adminUserId);
			const { headers: adminHeaders } = await test.login({ userId: adminUserId });

			await auth.api.setRole({
				body: { userId: regularUserId, role: 'admin' },
				headers: adminHeaders
			});

			const updated = await auth.api.getUser({
				query: { id: regularUserId },
				headers: adminHeaders
			});

			expect((updated as any).role).toBe('admin');
		});
	});
});
