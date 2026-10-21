/**
 * CAPTCHA Security Feature
 *
 * Implements SecurityFeature interface for CAPTCHA verification.
 * Priority: 60 (runs last, after all risk-contributing features, so the
 * risk-threshold check sees the accumulated score)
 */

import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { CaptchaFeatureConfig, CaptchaVerifyResult } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { logger } from '$lib/auth/shared/logger';
import { hashUserAgent } from '../../core/helpers';
import { positiveRiskFactors } from '../../core/risk-engine';
import { validateBypassToken, issueBypassToken } from '../../endpoints/captcha';

const BYPASS_TTL_SECONDS = 3600;

/**
 * Build the bypass-token identifier bound to this request, matching
 * getIdentifier() used by the /security/verify-captcha endpoint so tokens
 * issued there validate here (and vice versa).
 */
function getBypassIdentifier(ctx: SecurityContext): string {
	if (ctx.userId) {
		return `user:${ctx.userId}`;
	}
	return `anon:${ctx.ip}:${hashUserAgent(ctx.userAgent)}`;
}

export const captchaFeature: SecurityFeature = {
	id: 'captcha',
	name: 'CAPTCHA Verification',
	priority: FEATURE_PRIORITY.CAPTCHA,
	configKey: 'captcha',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getCaptchaConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		// Check for bypass token first
		const bypassToken = extractBypassToken(ctx);
		if (bypassToken) {
			const validBypass = await validateBypassToken(bypassToken, getBypassIdentifier(ctx));
			if (validBypass) {
				ctx.captchaPassed = true;
				return {
					riskFactors: [positiveRiskFactors.verifiedCaptcha()]
				};
			}
		}

		// Check if CAPTCHA is required based on risk score. This feature runs
		// last (priority 60) so ctx.riskScore already reflects the factors
		// accumulated by geo/device/behavior in this pass.
		const threshold = featureConfig.threshold ?? config.captchaThreshold;
		const captchaResponse = extractCaptchaResponse(ctx);

		if (ctx.riskScore < threshold && !captchaResponse) {
			return null;
		}

		// Mark CAPTCHA as required when over threshold
		if (ctx.riskScore >= threshold) {
			ctx.captchaRequired = true;
		}

		if (!captchaResponse) {
			ctx.emit('captcha_required');
			return {
				data: { captchaRequired: true }
			};
		}

		// CRITICAL FIX: Sanitize CAPTCHA token
		const sanitizedToken = sanitizeCaptchaToken(captchaResponse);
		if (!sanitizedToken) {
			logger.warn('[CAPTCHA] Invalid CAPTCHA token format', {
				requestId: ctx.requestId,
				ip: ctx.ip
			});

			ctx.emit('captcha_failed', { reason: 'invalid_token_format' });
			return {
				block: true,
				blockReason: 'Invalid CAPTCHA response',
				blockResponse: createCaptchaRequiredResponse('Invalid CAPTCHA response format')
			};
		}

		// Verify CAPTCHA
		const result = await verifyCaptcha(sanitizedToken, ctx.ip, featureConfig);

		if (result.success) {
			ctx.captchaPassed = true;
			ctx.emit('captcha_passed');

			// Issue bypass token for future requests (identifier-bound,
			// shared with the /security/verify-captcha endpoint)
			const bypass = await issueBypassToken(
				getBypassIdentifier(ctx),
				featureConfig.bypassTtlSeconds ?? BYPASS_TTL_SECONDS
			);

			return {
				riskFactors: [positiveRiskFactors.verifiedCaptcha()],
				data: {
					captchaVerified: true,
					bypassToken: bypass
				}
			};
		}

		ctx.emit('captcha_failed', { reason: result.error_codes?.join(',') });

		logger.warn('[CAPTCHA] Verification failed', {
			requestId: ctx.requestId,
			ip: ctx.ip,
			errors: result.error_codes
		});

		return {
			block: true,
			blockReason: 'CAPTCHA verification failed',
			blockResponse: createCaptchaRequiredResponse('CAPTCHA verification failed')
		};
	},

	clearCache() {}
};

/**
 * CRITICAL FIX: Sanitize CAPTCHA token to prevent injection attacks
 */
function sanitizeCaptchaToken(token: string): string | null {
	if (!token || typeof token !== 'string') {
		return null;
	}

	// Remove any whitespace
	const trimmed = token.trim();

	// Check length limits (most CAPTCHA tokens are under 2048 chars)
	if (trimmed.length === 0 || trimmed.length > 4096) {
		return null;
	}

	// Only allow alphanumeric, dashes, underscores, and dots (safe characters)
	// This covers all major CAPTCHA provider token formats
	const safePattern = /^[a-zA-Z0-9\-_.]+$/;
	if (!safePattern.test(trimmed)) {
		return null;
	}

	return trimmed;
}

/**
 * Extract CAPTCHA response from request headers.
 * Clients should send the solved CAPTCHA token via the X-Captcha-Token header.
 */
function extractCaptchaResponse(ctx: SecurityContext): string | undefined {
	const token = ctx.getHeader('x-captcha-token');
	return token || undefined;
}

/**
 * Extract bypass token from request headers.
 * After a successful CAPTCHA verification, the server issues a bypass token
 * that the client sends via the X-Captcha-Bypass header on subsequent requests.
 */
function extractBypassToken(ctx: SecurityContext): string | undefined {
	const token = ctx.getHeader('x-captcha-bypass');
	return token || undefined;
}

/**
 * Verify CAPTCHA with provider
 */
async function verifyCaptcha(
	token: string,
	ip: string,
	config: CaptchaFeatureConfig
): Promise<CaptchaVerifyResult> {
	const provider = config.provider ?? 'capjs';
	const secretKey = config.secretKey;

	// capjs has no remote siteverify — the token is already validated by the
	// widget's own server round-trip. Auto-pass in development only; refuse
	// in production so a real provider must be configured.
	if (provider === 'capjs') {
		if (process.env.NODE_ENV === 'production') {
			logger.error(
				'[CAPTCHA] capjs provider used in production — configure a real provider (hcaptcha, recaptcha, turnstile).'
			);
			return { success: false, error_codes: ['provider-not-configured'] };
		}
		return { success: true };
	}

	if (!secretKey) {
		logger.warn('[CAPTCHA] No secret key configured');
		return { success: false, error_codes: ['missing-secret-key'] };
	}

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

			default:
				return { success: false, error_codes: ['unsupported-provider'] };
		}

		const response = await fetch(verifyUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		if (!response.ok) {
			return { success: false, error_codes: ['verification-request-failed'] };
		}

		return await response.json();
	} catch (error) {
		logger.error('[CAPTCHA] Verification error:', error);
		return { success: false, error_codes: ['verification-error'] };
	}
}

/**
 * Extract CAPTCHA config from security config
 */
function getCaptchaConfig(config: SecurityConfig): CaptchaFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.captcha;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

/**
 * Create response requiring CAPTCHA
 */
function createCaptchaRequiredResponse(message: string): Response {
	return new Response(
		JSON.stringify({
			error: 'CAPTCHA Required',
			message,
			captchaRequired: true
		}),
		{
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

export * from './types';
