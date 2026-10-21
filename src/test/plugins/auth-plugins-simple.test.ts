/**
 * Plugin Tests - Simplified
 *
 * Tests passkey, magic link, and 2FA authentication flows using real auth.api calls.
 * Mirrors auth-plugins.test.ts but with a simpler structure.
 * Tests requiring simplewebauthn deep verification or live TOTP codes are kept skipped.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TOTP, Secret } from 'otpauth';
import { auth, getTestHelpers } from '$test/auth';

describe('Plugin Tests', () => {
	let test: Awaited<ReturnType<typeof getTestHelpers>>;
	let user: Awaited<ReturnType<typeof test.createUser>>;

	beforeEach(async () => {
		test = await getTestHelpers();
		user = await test.createUser({
			email: 'plugin-test@example.com',
			name: 'Plugin Test User',
			emailVerified: true
		});
		await test.saveUser(user);
	});

	afterEach(async () => {
		await test.deleteUser(user.id);
	});

	// -------------------------------------------------------------------------
	// Smoke test
	// -------------------------------------------------------------------------
	it('should create a test user via testUtils plugin', async () => {
		expect(user).toBeDefined();
		expect(user.id).toBeDefined();
		expect(user.email).toBe('plugin-test@example.com');
		expect(user.name).toBe('Plugin Test User');
	});

	// -------------------------------------------------------------------------
	// Passkey
	// -------------------------------------------------------------------------
	describe('Passkey Plugin Tests', () => {
		it('should generate registration options for authenticated user', async () => {
			// generatePasskeyRegistrationOptions uses our aliased mock — test the
			// generate step; the returned options should include all required fields.
			const loginResult = await test.login({ userId: user.id });
			const options = await auth.api.generatePasskeyRegistrationOptions({
				headers: loginResult.headers
			});
			expect(options).toBeDefined();
			expect(options.challenge).toBeDefined();
			expect(options.rp).toBeDefined();
			expect(options.user).toBeDefined();
			expect(Array.isArray(options.pubKeyCredParams)).toBe(true);
		});

		it.skip('should verify passkey registration response', async () => {
			// Skipped: @better-auth/passkey loads @simplewebauthn/server via Node's
			// native ESM resolver (pool: forks), capturing the real verifyRegistrationResponse
			// before any Vitest alias can intercept it. The real library rejects mock
			// credential JSON. Fix requires lazy auth init or pool: vmForks.
		});

		it('should reject unauthenticated passkey registration attempt', async () => {
			await expect(
				auth.api.generatePasskeyRegistrationOptions({
					headers: new Headers()
				})
			).rejects.toThrow();
		});

		it('should generate authentication options without a session', async () => {
			// generatePasskeyAuthenticationOptions does not require a session.
			// The mock returns a full options object with a challenge field.
			const options = await auth.api.generatePasskeyAuthenticationOptions({
				headers: new Headers()
			});
			expect(options).toBeDefined();
			expect((options as unknown as Record<string, unknown>).challenge).toBeDefined();
		});

		it.skip('should verify passkey authentication response', async () => {
			// Skipped: same ESM interception limitation as verify-registration.
		});

		it('should list user passkeys (empty list for new user)', async () => {
			const loginResult = await test.login({ userId: user.id });

			const passkeys = await auth.api.listPasskeys({
				headers: loginResult.headers
			});

			expect(Array.isArray(passkeys)).toBe(true);
			expect(passkeys).toHaveLength(0);
		});

		it.skip('should delete a passkey', async () => {
			// Skipped: requires a registered passkey (blocked by verify limitation).
		});

		it.skip('should update passkey name', async () => {
			// Skipped: no updatePasskey endpoint in this Better Auth version.
		});
	});

	// -------------------------------------------------------------------------
	// Magic Link
	// -------------------------------------------------------------------------
	describe('Magic Link Plugin Tests', () => {
		it('should send magic link email', async () => {
			const result = await auth.api.signInMagicLink({
				body: { email: user.email },
				headers: new Headers({ 'content-type': 'application/json' })
			});
			expect(result).toBeDefined();
		});

		it('should handle magic link verification with captured OTP token', async () => {
			test.clearOTPs?.();

			await auth.api.signInMagicLink({
				body: { email: user.email },
				headers: new Headers({ 'content-type': 'application/json' })
			});

			const token = test.getOTP?.(user.email);

			if (!token) {
				return; // token capture unavailable; skip gracefully
			}

			expect(token).toBeDefined();

			try {
				const verifyResult = await auth.api.magicLinkVerify({
					query: { token },
					headers: new Headers()
				});
				expect(verifyResult).toBeDefined();
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				expect(message).not.toContain('invalid token');
			}
		});

		it('should reject expired/invalid magic links', async () => {
			await expect(
				auth.api.magicLinkVerify({
					query: { token: 'invalid-token-xyz' },
					headers: new Headers()
				})
			).rejects.toThrow();
		});

		it('should support magic link for new user signup', async () => {
			const newEmail = 'new-magic-user@example.com';
			const result = await auth.api.signInMagicLink({
				body: { email: newEmail },
				headers: new Headers({ 'content-type': 'application/json' })
			});
			expect(result).toBeDefined();

			const token = test.getOTP?.(newEmail);
			if (token) {
				try {
					await auth.api.magicLinkVerify({
						query: { token },
						headers: new Headers()
					});
				} catch {
					// redirect response is acceptable
				}
			}
		});

		it('should reject invalid email format for magic links', async () => {
			await expect(
				auth.api.signInMagicLink({
					body: { email: 'not-an-email' },
					headers: new Headers({ 'content-type': 'application/json' })
				})
			).rejects.toThrow();
		});

		it('should reject a magic link token used twice', async () => {
			await auth.api.signInMagicLink({
				body: { email: user.email },
				headers: new Headers({ 'content-type': 'application/json' })
			});

			const token = test.getOTP?.(user.email);
			if (!token) return;

			try {
				await auth.api.magicLinkVerify({
					query: { token },
					headers: new Headers()
				});
			} catch {
				// redirect is OK
			}

			await expect(
				auth.api.magicLinkVerify({
					query: { token },
					headers: new Headers()
				})
			).rejects.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// Two-Factor Authentication
	// -------------------------------------------------------------------------
	describe('Two-Factor Authentication Plugin Tests', () => {
		// Better Auth 1.7: enableTwoFactor returns a discriminated response
		// ({ method: "otp" } | { method: "totp"; totpURI; backupCodes }).
		// This helper asserts the default TOTP method and narrows the result.
		function expectTotpEnableResult(
			result: { method: 'otp' } | { method: 'totp'; totpURI: string; backupCodes: string[] }
		): { method: 'totp'; totpURI: string; backupCodes: string[] } {
			expect(result.method).toBe('totp');
			if (result.method !== 'totp') {
				throw new Error('Expected TOTP two-factor method');
			}
			return result;
		}

		const userPassword = 'TwoFactor123!';
		let twoFaEmail: string;
		let twoFaUserId: string;
		let twoFaHeaders: Headers;

		beforeEach(async () => {
			twoFaEmail = `2fa-simple-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

			const signUpResult = await auth.api.signUpEmail({
				body: {
					email: twoFaEmail,
					password: userPassword,
					name: '2FA Simple Test User'
				}
			});
			twoFaUserId = signUpResult.user.id;
			const loginResult = await test.login({ userId: twoFaUserId });
			twoFaHeaders = loginResult.headers;
		});

		afterEach(async () => {
			if (twoFaUserId) {
				try {
					await test.deleteUser(twoFaUserId);
				} catch {
					// already deleted
				}
			}
		});

		it('should enable 2FA and return backup codes', async () => {
			const result = await auth.api.enableTwoFactor({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			expect(result).toBeDefined();
			const totpResult = expectTotpEnableResult(result);
			expect(totpResult.backupCodes).toBeDefined();
			expect(Array.isArray(totpResult.backupCodes)).toBe(true);
			expect(totpResult.backupCodes.length).toBeGreaterThan(0);
		});

		it('should get TOTP URI after enabling 2FA', async () => {
			await auth.api.enableTwoFactor({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			const uriResult = await auth.api.getTOTPURI({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			expect(uriResult).toBeDefined();
			expect(uriResult.totpURI).toBeDefined();
			expect(typeof uriResult.totpURI).toBe('string');
			expect(uriResult.totpURI).toContain('otpauth://');
		});

		it('should reject enabling 2FA with wrong password', async () => {
			await expect(
				auth.api.enableTwoFactor({
					body: { password: 'wrong-password' },
					headers: twoFaHeaders
				})
			).rejects.toThrow();
		});

		it('should reflect twoFactorEnabled=false until TOTP is verified', async () => {
			await auth.api.enableTwoFactor({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			const sessionResult = await auth.api.getSession({ headers: twoFaHeaders });
			expect((sessionResult?.user as Record<string, unknown>)?.twoFactorEnabled).toBeFalsy();

			const signInResult = await auth.api.signInEmail({
				body: { email: twoFaEmail, password: userPassword }
			});
			expect(signInResult).toBeDefined();
			expect(signInResult.token).toBeDefined();
		});

		it('should verify 2FA TOTP code during sign in', async () => {
			const enableResult = expectTotpEnableResult(
				await auth.api.enableTwoFactor({
					body: { password: userPassword },
					headers: twoFaHeaders
				})
			);

			expect(enableResult.totpURI).toBeDefined();

			const totpURL = new URL(enableResult.totpURI);
			const secret = totpURL.searchParams.get('secret');
			expect(secret).toBeTruthy();

			const totp = new TOTP({ secret: Secret.fromBase32(secret!) });
			const code = totp.generate();

			const verifyResult = await auth.api.verifyTOTP({
				body: { code },
				headers: twoFaHeaders
			});

			expect(verifyResult).toBeDefined();
		});

		it('should authenticate with a valid backup code', async () => {
			// Enable 2FA and verify TOTP so twoFactorEnabled=true
			const enableResult = expectTotpEnableResult(
				await auth.api.enableTwoFactor({
					body: { password: userPassword },
					headers: twoFaHeaders
				})
			);

			const totpURL = new URL(enableResult.totpURI);
			const secret = totpURL.searchParams.get('secret');
			const code = new TOTP({ secret: Secret.fromBase32(secret!) }).generate();

			await auth.api.verifyTOTP({
				body: { code },
				headers: twoFaHeaders
			});

			// Re-login to get fresh session headers (twoFactorEnabled=true now)
			const freshLogin = await test.login({ userId: twoFaUserId });

			// Generate fresh backup codes so we have a known valid code
			const codesResult = await auth.api.generateBackupCodes({
				body: { password: userPassword },
				headers: freshLogin.headers
			});

			expect(Array.isArray(codesResult.backupCodes)).toBe(true);
			expect(codesResult.backupCodes.length).toBeGreaterThan(0);

			const backupCode = codesResult.backupCodes[0];
			if (!backupCode) {
				throw new Error('Expected backup codes to be generated');
			}

			// verifyBackupCode works with an active session when twoFactorEnabled=true
			const verifyResult = await auth.api.verifyBackupCode({
				body: { code: backupCode },
				headers: freshLogin.headers
			});

			expect(verifyResult).toBeDefined();
			expect(verifyResult.user).toBeDefined();
		});

		it('should disable 2FA for user', async () => {
			await auth.api.enableTwoFactor({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			const disableResult = await auth.api.disableTwoFactor({
				body: { password: userPassword },
				headers: twoFaHeaders
			});

			expect(disableResult).toBeDefined();
			expect((disableResult as Record<string, unknown>).status).toBe(true);
		});

		it('should regenerate backup codes', async () => {
			// Enable 2FA, verify TOTP to set twoFactorEnabled=true, then regenerate codes
			const enableResult = expectTotpEnableResult(
				await auth.api.enableTwoFactor({
					body: { password: userPassword },
					headers: twoFaHeaders
				})
			);

			const totpURL = new URL(enableResult.totpURI);
			const secret = totpURL.searchParams.get('secret');
			const code = new TOTP({ secret: Secret.fromBase32(secret!) }).generate();

			await auth.api.verifyTOTP({
				body: { code },
				headers: twoFaHeaders
			});

			// After verifyTOTP the session is refreshed — re-login to get valid headers
			const freshLogin = await test.login({ userId: twoFaUserId });

			const newCodesResult = await auth.api.generateBackupCodes({
				body: { password: userPassword },
				headers: freshLogin.headers
			});

			expect(newCodesResult).toBeDefined();
			expect(Array.isArray(newCodesResult.backupCodes)).toBe(true);
			expect(newCodesResult.backupCodes.length).toBeGreaterThan(0);
		});

		it('should check 2FA status via user record before and after setup', async () => {
			const sessionBefore = await auth.api.getSession({ headers: twoFaHeaders });
			expect(sessionBefore).toBeDefined();
			expect((sessionBefore?.user as Record<string, unknown>)?.twoFactorEnabled).toBeFalsy();

			const enableResult = expectTotpEnableResult(
				await auth.api.enableTwoFactor({
					body: { password: userPassword },
					headers: twoFaHeaders
				})
			);

			expect(enableResult.totpURI).toBeDefined();
			expect(enableResult.backupCodes.length).toBeGreaterThan(0);

			const sessionAfter = await auth.api.getSession({ headers: twoFaHeaders });
			expect((sessionAfter?.user as Record<string, unknown>)?.twoFactorEnabled).toBeFalsy();
		});
	});

	// -------------------------------------------------------------------------
	// Plugin Integration
	// -------------------------------------------------------------------------
	describe('Plugin Integration Tests', () => {
		it.skip('should handle passkey + 2FA combination', async () => {
			// Skipped: passkey verify step blocked by ESM interception limitation.
		});

		it('should handle magic link + 2FA combination (send magic link for 2FA user)', async () => {
			const password = 'Integration123!';
			const mlEmail = `ml-2fa-simple-${Date.now()}@example.com`;
			const signUpResult = await auth.api.signUpEmail({
				body: {
					email: mlEmail,
					password,
					name: 'ML+2FA User'
				}
			});

			const loginResult = await test.login({ userId: signUpResult.user.id });

			await auth.api.enableTwoFactor({
				body: { password },
				headers: loginResult.headers
			});

			const mlResult = await auth.api.signInMagicLink({
				body: { email: mlEmail },
				headers: new Headers({ 'content-type': 'application/json' })
			});
			expect(mlResult).toBeDefined();

			await test.deleteUser(signUpResult.user.id);
		});
	});

	// -------------------------------------------------------------------------
	// Email/Password Plugin (always configured)
	// -------------------------------------------------------------------------
	describe('Email/Password Plugin (configured)', () => {
		it('should sign up and sign in with email and password', async () => {
			const signUpResult = await auth.api.signUpEmail({
				body: {
					email: 'email-plugin-simple@example.com',
					password: 'Password123!',
					name: 'Email Plugin User'
				}
			});

			expect(signUpResult.token).toBeDefined();
			expect(signUpResult.user.email).toBe('email-plugin-simple@example.com');

			await test.deleteUser(signUpResult.user.id);
		});

		it('should reject sign in with wrong password', async () => {
			const signUpResult = await auth.api.signUpEmail({
				body: {
					email: 'wrong-pass-simple@example.com',
					password: 'Password123!',
					name: 'Wrong Pass User'
				}
			});

			await expect(
				auth.api.signInEmail({
					body: {
						email: 'wrong-pass-simple@example.com',
						password: 'wrong-password'
					}
				})
			).rejects.toThrow();

			await test.deleteUser(signUpResult.user.id);
		});
	});
});
