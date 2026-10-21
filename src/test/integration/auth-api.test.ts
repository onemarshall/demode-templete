/**
 * API Integration Tests
 *
 * Tests all Better Auth endpoints with real auth.api calls against SQLite in-memory DB.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { auth, getTestHelpers } from '$test/auth';

describe('Auth API Integration Tests', () => {
	let test: Awaited<ReturnType<typeof getTestHelpers>>;
	let testUser: any;
	let loginResult: any;

	beforeEach(async () => {
		test = await getTestHelpers();
		// Sign up via real API to get a user with a hashed password in the DB
		const signUpResult = await auth.api.signUpEmail({
			body: {
				email: 'api-test@example.com',
				name: 'API Test User',
				password: 'ValidPassword123!',
			},
		});
		testUser = signUpResult.user;
		loginResult = await test.login({ userId: testUser.id });
	});

	afterEach(async () => {
		if (testUser?.id) {
			await test.deleteUser(testUser.id);
		}
	});

	describe('Session Management', () => {
		it('should get current session', async () => {
			const session = await auth.api.getSession({ headers: loginResult.headers });

			expect(session).toBeDefined();
			expect(session?.user.email).toBe(testUser.email);
			expect(session?.user.id).toBe(testUser.id);
		});

		it('should return null for invalid session', async () => {
			const invalidHeaders = new Headers({ authorization: 'Bearer invalid-token' });

			const session = await auth.api.getSession({ headers: invalidHeaders });

			expect(session).toBeNull();
		});
	});

	describe('Email & Password Authentication', () => {
		it('should sign in with valid credentials', async () => {
			const result = await auth.api.signInEmail({
				body: {
					email: 'api-test@example.com',
					password: 'ValidPassword123!',
				},
			});

			expect(result).toBeDefined();
			expect(result.user.email).toBe('api-test@example.com');
			// signInEmail returns { redirect, token, user } — not { session }
			expect(result.token).toBeDefined();
		});

		it('should reject invalid credentials', async () => {
			await expect(
				auth.api.signInEmail({
					body: {
						email: 'api-test@example.com',
						password: 'wrongPassword',
					},
				}),
			).rejects.toThrow();
		});

		it('should sign up new user', async () => {
			const result = await auth.api.signUpEmail({
				body: {
					email: 'new-signup@example.com',
					password: 'StrongPass123!',
					name: 'New User',
				},
			});

			expect(result.user.email).toBe('new-signup@example.com');
			// signUpEmail returns { token: string | null, user } — not { session }
			expect(result.token).toBeDefined();

			await test.deleteUser(result.user.id);
		});

		it('should handle password reset request', async () => {
			await expect(
				auth.api.requestPasswordReset({
					body: { email: 'api-test@example.com', redirectTo: '/reset-password' },
				}),
			).resolves.toBeDefined();
		});
	});

	describe('User Profile Management', () => {
		it('should update user profile', async () => {
			// updateUser returns { status: boolean }, not { user }
			const result = await auth.api.updateUser({
				body: { name: 'Updated Name' },
				headers: loginResult.headers,
			});

			expect(result.status).toBe(true);

			// Verify the update took effect by fetching the session
			const session = await auth.api.getSession({ headers: loginResult.headers });
			expect(session?.user.name).toBe('Updated Name');
		});

		it('should change password', async () => {
			// Create a separate user for this test to avoid polluting shared testUser state
			const changeUser = await auth.api.signUpEmail({
				body: {
					email: 'pw-change@example.com',
					name: 'PW Change User',
					password: 'OldPassword123!',
				},
			});
			const pwLogin = await test.login({ userId: changeUser.user.id });

			await expect(
				auth.api.changePassword({
					body: {
						currentPassword: 'OldPassword123!',
						newPassword: 'NewPassword456!',
					},
					headers: pwLogin.headers,
				}),
			).resolves.toBeDefined();

			await test.deleteUser(changeUser.user.id);
		});

		it('should delete user account', async () => {
			// Create a dedicated user so deletion does not affect the shared testUser
			const deleteTarget = await auth.api.signUpEmail({
				body: {
					email: 'delete-me@example.com',
					password: 'DeleteMe123!',
					name: 'Delete Me',
				},
			});
			const deleteLogin = await test.login({ userId: deleteTarget.user.id });

			await expect(
				auth.api.deleteUser({
					body: {},
					headers: deleteLogin.headers,
				}),
			).resolves.toBeDefined();
		});
	});

	describe('Session Management Endpoints', () => {
		it('should list all user sessions', async () => {
			const result = await auth.api.listSessions({
				headers: loginResult.headers,
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
		});

		it('should revoke specific session', async () => {
			const secondLogin = await test.login({ userId: testUser.id });

			await expect(
				auth.api.revokeSession({
					body: { token: secondLogin.session.token },
					headers: loginResult.headers,
				}),
			).resolves.toBeDefined();
		});

		it('should revoke all sessions', async () => {
			await expect(
				auth.api.revokeSessions({
					headers: loginResult.headers,
				}),
			).resolves.toBeDefined();
		});
	});

	describe('Request Validation', () => {
		it('should reject invalid email format on sign in', async () => {
			await expect(
				auth.api.signInEmail({
					body: { email: 'not-an-email', password: 'password' },
				}),
			).rejects.toThrow();
		});

		it('should reject missing required fields on sign up', async () => {
			await expect(
				auth.api.signUpEmail({
					body: { email: '', password: '', name: '' },
				}),
			).rejects.toThrow();
		});
	});
});
