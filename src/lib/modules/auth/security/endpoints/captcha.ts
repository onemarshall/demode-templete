/**
 * CAPTCHA Verification Endpoint
 *
 * Handles CAPTCHA token verification and bypass token generation.
 */

import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { z } from 'zod';
import { securityLogger } from '#lib/platform/logger.js';
import { getClientIp, getIdentifier, generateToken } from '../core/helpers';
import type { SecurityConfig, CaptchaFeatureConfig } from '../core/feature';
import { createStorageAdapter, type StorageAdapter } from '../core/storage';
import { CacheManager } from '../core/cache';
import { slidingWindowCheck } from '../features/rate-limit/sliding-window';
import { isDevelopment } from '#lib/platform/config/index.js';

// ============================================
// Types
// ============================================

export interface CaptchaVerifyResponse {
	success: boolean;
	error?: string;
	bypassToken?: string;
	bypassDuration?: number;
}

// ============================================
// Validation Schemas
// ============================================

const verifyCaptchaSchema = z.object({
	token: z
		.string()
		.min(10, 'Token too short')
		.max(5000, 'Token too long')
		// Cap redeem tokens contain colon-separated identifier/secret segments.
		.regex(/^[a-zA-Z0-9_\-=.:]+$/, 'Invalid token format')
});

// ============================================
// Bypass Token Storage (Redis-backed with in-memory cache)
// ============================================

const BYPASS_KEY_PREFIX = 'captcha:endpoint:bypass:';
const bypassCache = new CacheManager<string, string>('captcha-endpoint-bypass', 500, 60000);

let storageAdapter: StorageAdapter | null = null;

async function getStorage(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

async function storeBypassToken(
	token: string,
	identifier: string,
	ttlSeconds: number
): Promise<void> {
	try {
		const storage = await getStorage();
		await storage.set(`${BYPASS_KEY_PREFIX}${token}`, identifier, ttlSeconds);
		bypassCache.set(token, identifier, ttlSeconds * 1000);
	} catch {
		// Fail silently — bypass tokens are a convenience, not critical
	}
}

/**
 * Generate and store a bypass token bound to an identifier.
 * Shared with the CAPTCHA security feature so tokens issued here are
 * honored by the feature's bypass check (and vice versa).
 */
export async function issueBypassToken(identifier: string, ttlSeconds: number): Promise<string> {
	const token = generateToken(32);
	await storeBypassToken(token, identifier, ttlSeconds);
	return token;
}

export async function validateBypassToken(token: string, identifier: string): Promise<boolean> {
	// Check cache first
	const cached = bypassCache.get(token);
	if (cached !== undefined) {
		return cached === identifier;
	}

	try {
		const storage = await getStorage();
		const storedIdentifier = await storage.get(`${BYPASS_KEY_PREFIX}${token}`);
		if (!storedIdentifier) return false;
		bypassCache.set(token, storedIdentifier);
		return storedIdentifier === identifier;
	} catch {
		return false;
	}
}

export async function clearBypassToken(token: string): Promise<void> {
	bypassCache.delete(token);
	try {
		const storage = await getStorage();
		await storage.del(`${BYPASS_KEY_PREFIX}${token}`);
	} catch {
		// Fail silently
	}
}

// ============================================
// CAPTCHA Provider Verification
// ============================================

interface CaptchaProviderConfig {
	provider: 'capjs' | 'hcaptcha' | 'recaptcha' | 'turnstile';
	secretKey: string;
	siteKey?: string;
	endpoint?: string;
}

/**
 * Verify a token against a self-hosted Cap standalone server.
 *
 * Cap exposes a reCAPTCHA-compatible siteverify endpoint with the site key
 * in the path: POST {endpoint}/{siteKey}/siteverify { secret, response }.
 * Unconfigured, it auto-passes in development only — everywhere else it
 * refuses, so an unconfigured production deployment fails closed.
 */
export async function verifyCapToken(
	token: string,
	providerConfig: { endpoint?: string; siteKey?: string; secretKey?: string }
): Promise<{ success: boolean; error?: string }> {
	const { endpoint, siteKey, secretKey } = providerConfig;
	if (!endpoint || !siteKey || !secretKey) {
		if (isDevelopment()) {
			securityLogger.warn('[CAPTCHA] capjs unconfigured — auto-passing (development only)');
			return { success: true };
		}
		securityLogger.error('[CAPTCHA] capjs provider not configured (endpoint, site key, secret)');
		return { success: false, error: 'CAPTCHA provider not configured' };
	}

	try {
		const verifyUrl = `${endpoint.replace(/\/+$/, '')}/${siteKey}/siteverify`;
		const response = await fetch(verifyUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ secret: secretKey, response: token })
		});

		const result = (await response.json().catch(() => null)) as
			| { success?: boolean; error?: string }
			| null;

		// Cap uses non-2xx statuses for invalid credentials and expired/used
		// tokens as well as outages. Preserve that distinction for the form.
		if (!response.ok || result?.success !== true) {
			if (result?.error === 'Invalid site key or secret') {
				securityLogger.error('[CAPTCHA] Cap rejected the configured site key or secret');
				return { success: false, error: 'Captcha is not configured correctly. Please contact support.' };
			}
			if (result?.error === 'Token not found' || result?.error === 'Token expired') {
				return { success: false, error: 'Captcha expired or was already used. Please complete a new challenge.' };
			}
			return {
				success: false,
				error: response.status >= 500 || !result
					? 'Verification service unavailable'
					: 'Captcha verification failed. Please complete a new challenge.'
			};
		}
		return { success: true };
	} catch (error) {
		securityLogger.error('[Security] CAPTCHA verification error', { error, provider: 'capjs' });
		return { success: false, error: 'Verification error' };
	}
}

async function verifyCaptchaToken(
	token: string,
	ip: string,
	providerConfig: CaptchaProviderConfig
): Promise<{ success: boolean; error?: string }> {
	const { provider, secretKey } = providerConfig;

	try {
		let verifyUrl: string;
		let body: URLSearchParams;

		switch (provider) {
			case 'hcaptcha':
				verifyUrl = 'https://hcaptcha.com/siteverify';
				body = new URLSearchParams({
					secret: secretKey,
					response: token,
					remoteip: ip
				});
				break;

			case 'recaptcha':
				verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
				body = new URLSearchParams({
					secret: secretKey,
					response: token,
					remoteip: ip
				});
				break;

			case 'turnstile':
				verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
				body = new URLSearchParams({
					secret: secretKey,
					response: token,
					remoteip: ip
				});
				break;

			case 'capjs': {
				return await verifyCapToken(token, providerConfig);
			}

			default:
				securityLogger.error(`[CAPTCHA] Unknown provider: ${providerConfig.provider}`);
				return { success: false, error: 'Unknown CAPTCHA provider' };
		}

		const response = await fetch(verifyUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		if (!response.ok) {
			return { success: false, error: 'Verification service unavailable' };
		}

		const result = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

		if (!result.success) {
			return {
				success: false,
				error: result['error-codes']?.join(', ') ?? 'Verification failed'
			};
		}

		return { success: true };
	} catch (error) {
		securityLogger.error('[Security] CAPTCHA verification error', { error, provider });
		return { success: false, error: 'Verification error' };
	}
}

// ============================================
// Endpoint Factory
// ============================================

export function createCaptchaEndpoint(config: SecurityConfig) {
	const captchaConfig = config.features?.captcha as CaptchaFeatureConfig | boolean | undefined;
	const isEnabled =
		config.enabled &&
		captchaConfig !== false &&
		(captchaConfig === true || captchaConfig?.enabled !== false);

	return createAuthEndpoint(
		'/security/verify-captcha',
		{
			method: 'POST'
		},
		async (ctx) => {
			if (!isEnabled) {
				return ctx.json({
					success: true,
					bypassToken: '',
					bypassDuration: 0
				} satisfies CaptchaVerifyResponse);
			}

			const request = ctx.request;
			if (!request) {
				return ctx.json(
					{ success: false, error: 'Invalid request' } satisfies CaptchaVerifyResponse,
					{ status: 400 }
				);
			}

			try {
				const parsed = verifyCaptchaSchema.safeParse(ctx.body);
				if (!parsed.success) {
					const firstIssue = parsed.error.issues[0];
					return ctx.json(
						{
							success: false,
							error: firstIssue?.message ?? 'Invalid token'
						} satisfies CaptchaVerifyResponse,
						{ status: 400 }
					);
				}

				const { token } = parsed.data;
				const ip = getClientIp(request);

				// Rate limit verification attempts — without this the endpoint
				// could be hammered to burn provider quota or brute-force.
				const rl = await slidingWindowCheck(`rl:captcha-verify:${ip}`, 10, 60);
				if (rl.limited) {
					return ctx.json(
						{ success: false, error: 'Too many attempts' } satisfies CaptchaVerifyResponse,
						{ status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
					);
				}

				const captchaSettings =
					typeof captchaConfig === 'object' ? captchaConfig : ({} as CaptchaFeatureConfig);

				const provider = captchaSettings.provider ?? 'capjs';
				const secretKey = captchaSettings.secretKey ?? '';
				const bypassTtl = captchaSettings.bypassTtlSeconds ?? 1800;

				const verifyResult = await verifyCaptchaToken(token, ip, {
					provider,
					secretKey,
					siteKey: captchaSettings.siteKey,
					endpoint: captchaSettings.endpoint
				});

				if (!verifyResult.success) {
					securityLogger.info('[Security] CAPTCHA verification failed', {
						ip,
						error: verifyResult.error
					});

					return ctx.json(
						{
							success: false,
							error: verifyResult.error
						} satisfies CaptchaVerifyResponse,
						{ status: 400 }
					);
				}

				// Session is optional here — resolve it explicitly since
				// ctx.context.session is only set when sessionMiddleware runs.
				const session = await getSessionFromCtx(ctx).catch(() => null);
				const userId = (session?.user as { id?: string } | undefined)?.id;
				const identifier = getIdentifier(request, userId);

				const bypassToken = await issueBypassToken(identifier, bypassTtl);

				securityLogger.info('[Security] CAPTCHA verified successfully', {
					ip,
					identifier: identifier.substring(0, 20) + '...'
				});

				return ctx.json({
					success: true,
					bypassToken,
					bypassDuration: bypassTtl
				} satisfies CaptchaVerifyResponse);
			} catch {
				return ctx.json(
					{ success: false, error: 'Verification error' } satisfies CaptchaVerifyResponse,
					{ status: 500 }
				);
			}
		}
	);
}
