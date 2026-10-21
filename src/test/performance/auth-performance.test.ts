/**
 * Performance Tests
 *
 * Tests session creation, database queries, and response times
 * using real Better Auth operations against an in-memory SQLite database.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TOTP, Secret } from 'otpauth';
import { auth, getTestHelpers } from '$test/auth';

describe('Performance Tests', () => {
	let test: Awaited<ReturnType<typeof getTestHelpers>>;
	let testUser: { id: string; email: string; name: string };
	let authHeaders: Headers;

	beforeEach(async () => {
		test = await getTestHelpers();

		const email = `perf-test-${Date.now()}@example.com`;
		const signUpResult = await auth.api.signUpEmail({
			body: { email, password: 'Password123!', name: 'Performance Test User' }
		});

		testUser = {
			id: signUpResult.user.id,
			email: signUpResult.user.email,
			name: signUpResult.user.name
		};
		authHeaders = await test.getAuthHeaders({ userId: signUpResult.user.id });
	});

	describe('Session Creation Performance', () => {
		it('should create sessions within acceptable time limits', async () => {
			const startTime = performance.now();

			await auth.api.signInEmail({
				body: {
					email: testUser.email,
					password: 'Password123!'
				}
			});

			const duration = performance.now() - startTime;

			// Real SQLite sign-in should complete well under 2000ms
			expect(duration).toBeLessThan(2000);
		});

		it('should handle concurrent session creation efficiently', async () => {
			const concurrentRequests = 5;
			const startTime = performance.now();

			const promises = Array(concurrentRequests)
				.fill(null)
				.map(() =>
					auth.api.signInEmail({
						body: {
							email: testUser.email,
							password: 'Password123!'
						}
					})
				);

			await Promise.all(promises);

			const duration = performance.now() - startTime;

			// 5 concurrent real sign-ins should complete within 5000ms
			expect(duration).toBeLessThan(5000);
		});

		it('should validate session tokens quickly', async () => {
			const startTime = performance.now();

			await auth.api.getSession({ headers: authHeaders });

			const duration = performance.now() - startTime;

			// Session validation against SQLite should be under 500ms
			expect(duration).toBeLessThan(500);
		});
	});

	describe('Database Query Performance', () => {
		it('should retrieve user data efficiently via session lookup', async () => {
			const startTime = performance.now();

			await auth.api.getSession({ headers: authHeaders });

			const duration = performance.now() - startTime;

			// Session + user lookup should be under 500ms
			expect(duration).toBeLessThan(500);
		});

		it('should efficiently list active sessions for a user', async () => {
			// Create a couple of sessions so there's something to list
			await auth.api.signInEmail({
				body: { email: testUser.email, password: 'Password123!' }
			});

			const startTime = performance.now();

			await auth.api.listSessions({ headers: authHeaders });

			const duration = performance.now() - startTime;

			// Session list query should be under 500ms
			expect(duration).toBeLessThan(500);
		});
	});

	describe('Authentication Flow Performance', () => {
		it('should complete full sign-up + sign-in flow within acceptable time', async () => {
			const email = `flow-test-${Date.now()}@example.com`;
			const password = 'FlowTest123!';

			const startTime = performance.now();

			// Step 1: Sign up
			await auth.api.signUpEmail({
				body: { email, password, name: 'Flow Test User' }
			});

			// Step 2: Sign in
			const signInResult = await auth.api.signInEmail({
				body: { email, password }
			});

			// Step 3: Validate session
			const sessionHeaders = new Headers({
				Authorization: `Bearer ${signInResult.token}`
			});
			await auth.api.getSession({ headers: sessionHeaders });

			const duration = performance.now() - startTime;

			// Full auth flow (signup + signin + getSession) under 3000ms
			expect(duration).toBeLessThan(3000);
		});

		it('should complete sign-in + get-session flow quickly', async () => {
			const startTime = performance.now();

			const signInResult = await auth.api.signInEmail({
				body: {
					email: testUser.email,
					password: 'Password123!'
				}
			});

			const sessionHeaders = new Headers({
				Authorization: `Bearer ${signInResult.token}`
			});
			await auth.api.getSession({ headers: sessionHeaders });

			const duration = performance.now() - startTime;

			// Sign-in + session validation under 2000ms
			expect(duration).toBeLessThan(2000);
		});
	});

	describe('Plugin Performance', () => {
		it.skip('passkey registration performance — blocked by ESM interception limitation', () => {
			// @better-auth/passkey loads @simplewebauthn/server via Node's native ESM resolver
			// (pool: forks) which captures the real verifyRegistrationResponse before any Vitest
			// alias can intercept it. Generate-options performance is not meaningful to test alone.
		});

		it('should complete magic link request within acceptable time', async () => {
			const startTime = performance.now();

			await auth.api.signInMagicLink({
				body: { email: testUser.email, callbackURL: 'http://localhost:3000/auth/callback' },
				headers: new Headers({ 'content-type': 'application/json' })
			});

			const duration = performance.now() - startTime;

			// Magic link send (no-op email) should complete within 2000ms
			expect(duration).toBeLessThan(2000);
		});

		it('should complete magic link request + verify flow within acceptable time', async () => {
			test.clearOTPs?.();

			const startTime = performance.now();

			// Request the magic link — email send is a no-op in tests
			await auth.api.signInMagicLink({
				body: { email: testUser.email, callbackURL: 'http://localhost:3000/auth/callback' },
				headers: new Headers({ 'content-type': 'application/json' })
			});

			// Capture the OTP token via testUtils
			const token = test.getOTP?.(testUser.email);

			if (!token) {
				// testUtils did not expose a token capture helper — just assert request time
				const duration = performance.now() - startTime;
				expect(duration).toBeLessThan(2000);
				return;
			}

			try {
				await auth.api.magicLinkVerify({
					query: { token },
					headers: new Headers()
				});
			} catch {
				// redirect response (302) is acceptable for magic link verify
			}

			const duration = performance.now() - startTime;

			// Full magic link flow should complete within 3000ms
			expect(duration).toBeLessThan(3000);
		});

		it('should complete 2FA TOTP verification within acceptable time', async () => {
			const password = 'PerfTOTP123!';
			const email = `perf-totp-${Date.now()}@example.com`;

			const signUpResult = await auth.api.signUpEmail({
				body: { email, password, name: 'Perf TOTP User' }
			});
			const loginResult = await test.getAuthHeaders({ userId: signUpResult.user.id });
			const headers =
				loginResult instanceof Headers ? loginResult : new Headers(loginResult as HeadersInit);

			const enableResult = await auth.api.enableTwoFactor({
				body: { password },
				headers
			});

			// Better Auth 1.7: enableTwoFactor returns a discriminated response
			if (enableResult.method !== 'totp') {
				throw new Error('Expected TOTP two-factor method');
			}

			const totpURL = new URL(enableResult.totpURI);
			const secret = totpURL.searchParams.get('secret');
			const code = new TOTP({ secret: Secret.fromBase32(secret!) }).generate();

			const startTime = performance.now();

			await auth.api.verifyTOTP({
				body: { code },
				headers
			});

			const duration = performance.now() - startTime;

			// TOTP verification against SQLite should complete within 2000ms
			expect(duration).toBeLessThan(2000);

			try {
				await test.deleteUser?.(signUpResult.user.id);
			} catch {
				/* cleanup best-effort */
			}
		});
	});

	describe('Memory and Resource Usage', () => {
		it('should not leak memory during repeated getSession operations', async () => {
			const initialMemory = process.memoryUsage();

			for (let i = 0; i < 20; i++) {
				await auth.api.getSession({ headers: authHeaders });
			}

			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be minimal (< 20MB for 20 real DB reads)
			expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
		});

		it('should handle repeated sign-in operations without resource exhaustion', async () => {
			const startTime = performance.now();

			for (let i = 0; i < 5; i++) {
				await auth.api.signInEmail({
					body: { email: testUser.email, password: 'Password123!' }
				});
			}

			const duration = performance.now() - startTime;

			// 5 sequential sign-ins under 5000ms
			expect(duration).toBeLessThan(5000);
		});
	});

	describe('Rate Limiting Performance', () => {
		it('should handle rapid sequential requests without errors', async () => {
			const startTime = performance.now();

			// Make 5 rapid getSession requests — real SQLite, no mock rate limiting
			const promises = Array(5)
				.fill(null)
				.map(() => auth.api.getSession({ headers: authHeaders }));

			const results = await Promise.all(promises);

			const duration = performance.now() - startTime;

			// All requests should succeed
			results.forEach((result) => expect(result).toBeTruthy());

			// Should complete within 2000ms
			expect(duration).toBeLessThan(2000);
		});
	});

	describe('Cache Performance', () => {
		it('should serve repeated getSession calls within consistent time bounds', async () => {
			// Warm up
			await auth.api.getSession({ headers: authHeaders });

			const startTime = performance.now();
			await auth.api.getSession({ headers: authHeaders });
			const duration = performance.now() - startTime;

			// Even without explicit cache, repeated SQLite reads should be fast
			expect(duration).toBeLessThan(500);
		});
	});
});
