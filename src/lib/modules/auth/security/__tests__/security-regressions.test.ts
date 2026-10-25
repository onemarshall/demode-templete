/**
 * Security Regression Tests
 *
 * Covers fixes from the security audit:
 * - CF-Connecting-IP is only trusted when CF-Ray is present (spoofing gate)
 * - shared/client-ip delegates to the trust-aware core implementation
 * - CAPTCHA feature verifies presented tokens below threshold (deadlock fix)
 * - CAPTCHA bypass tokens are shared between feature and endpoint
 * - capjs provider fails closed in production
 * - isAdminUser handles comma-separated and array roles
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getClientIp, setTrustProxy, hashUserAgent } from '../core/helpers';
import { getClientIp as getSharedClientIp } from '../shared/client-ip';
import { shouldProcessPath } from '../core/helpers';
import { captchaFeature } from '../features/captcha';
import { issueBypassToken } from '../endpoints/captcha';
import { publicEnv } from '#lib/platform/config/index.js';
import { createSecurityContext, createTestSecurityContext } from '../core/context';
import { isAdminUser } from '../../shared/roles.js';
import type { SecurityConfig } from '../core/feature';

// ============================================
// Helpers
// ============================================

function createMockConfig(overrides: Partial<SecurityConfig> = {}): SecurityConfig {
	return {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		includePaths: [],
		excludePaths: [],
		...overrides
	};
}

function createRequest(headers: Record<string, string>, path = '/api/auth/sign-in/email') {
	return new Request(`http://localhost${path}`, { method: 'POST', headers });
}

// ============================================
// IP Trust / Spoofing
// ============================================

describe('getClientIp trust gating', () => {
	beforeEach(() => {
		setTrustProxy('cloudflare');
	});

	it('ignores cf-connecting-ip when cf-ray is absent (spoofable)', () => {
		const request = createRequest({ 'cf-connecting-ip': '127.0.0.1' });
		expect(getClientIp(request)).toBe('0.0.0.0');
	});

	it('trusts cf-connecting-ip when cf-ray is present', () => {
		const request = createRequest({
			'cf-connecting-ip': '203.0.113.7',
			'cf-ray': '8f1234-LHR'
		});
		expect(getClientIp(request)).toBe('203.0.113.7');
	});

	it('ignores x-forwarded-for entirely in cloudflare mode', () => {
		const request = createRequest({ 'x-forwarded-for': '127.0.0.1' });
		expect(getClientIp(request)).toBe('0.0.0.0');
	});
});

describe('shared/client-ip delegation', () => {
	beforeEach(() => {
		setTrustProxy('cloudflare');
	});

	it('does not trust spoofed x-forwarded-for (abuse-detection bypass fix)', () => {
		const request = createRequest({ 'x-forwarded-for': '127.0.0.1' });
		expect(getSharedClientIp(request)).toBe('0.0.0.0');
	});

	it('honours trusted Cloudflare headers', () => {
		const request = createRequest({
			'cf-connecting-ip': '203.0.113.9',
			'cf-ray': '8fabcd-LHR'
		});
		expect(getSharedClientIp(request)).toBe('203.0.113.9');
	});
});

// ============================================
// Endpoint-relative path matching
// ============================================

describe('shouldProcessPath endpoint-relative paths', () => {
	it('processes endpoint-relative paths when includePaths is empty', () => {
		expect(shouldProcessPath('/sign-in/email', { includePaths: [], excludePaths: [] })).toBe(true);
	});

	it('excludes the security endpoints themselves', () => {
		expect(
			shouldProcessPath('/security/verify-captcha', {
				includePaths: [],
				excludePaths: ['/security/']
			})
		).toBe(false);
	});
});

// ============================================
// CAPTCHA Feature
// ============================================

describe('captchaFeature.check', () => {
	const config = createMockConfig({
		features: { captcha: { enabled: true, provider: 'capjs' } }
	});

	beforeEach(() => {
		setTrustProxy('cloudflare');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('returns null below threshold with no token', async () => {
		const ctx = createTestSecurityContext({ riskScore: 10 });
		const result = await captchaFeature.check!(ctx, config);
		expect(result).toBeNull();
	});

	it('verifies a presented token even below threshold (deadlock fix)', async () => {
		// capjs auto-passes outside production — the point is the token is
		// actually verified rather than skipped by the threshold check.
		// createTestSecurityContext has no headers, so use a real request.
		const request = createRequest({
			'cf-connecting-ip': '203.0.113.5',
			'cf-ray': 'test-ray',
			'user-agent': 'test-ua',
			'x-captcha-token': 'valid-test-token'
		});
		const ctx = createSecurityContext(request);
		ctx.riskScore = 10;

		const result = await captchaFeature.check!(ctx, config);
		expect(result).not.toBeNull();
		expect(result!.data?.captchaVerified).toBe(true);
		expect(result!.data?.bypassToken).toBeTruthy();
		expect(ctx.captchaPassed).toBe(true);
	});

	it('requires CAPTCHA above threshold with no token', async () => {
		const ctx = createTestSecurityContext({ riskScore: 50 });
		const result = await captchaFeature.check!(ctx, config);
		expect(result).not.toBeNull();
		expect(result!.data?.captchaRequired).toBe(true);
		expect(ctx.captchaRequired).toBe(true);
	});

	it('honours a valid identifier-bound bypass token', async () => {
		const ip = '203.0.113.11';
		const ua = 'bypass-ua';
		const identifier = `anon:${ip}:${hashUserAgent(ua)}`;
		const token = await issueBypassToken(identifier, 300);

		const request = createRequest({
			'cf-connecting-ip': ip,
			'cf-ray': 'test-ray',
			'user-agent': ua,
			'x-captcha-bypass': token
		});
		const ctx = createSecurityContext(request);
		ctx.riskScore = 90; // would normally require CAPTCHA

		const result = await captchaFeature.check!(ctx, config);
		expect(result).not.toBeNull();
		expect(ctx.captchaPassed).toBe(true);
		expect(result!.riskFactors?.[0]?.factor).toBe('verified');
	});

	it('rejects a bypass token bound to a different identifier', async () => {
		const token = await issueBypassToken('anon:9.9.9.9:otherua', 300);

		const request = createRequest({
			'cf-connecting-ip': '203.0.113.12',
			'cf-ray': 'test-ray',
			'user-agent': 'different-ua',
			'x-captcha-bypass': token
		});
		const ctx = createSecurityContext(request);
		ctx.riskScore = 10;

		// Invalid bypass → falls through to threshold check → below threshold → null
		const result = await captchaFeature.check!(ctx, config);
		expect(result).toBeNull();
		expect(ctx.captchaPassed).toBe(false);
	});

	it('capjs provider fails closed in production', async () => {
		// The production signal is PUBLIC_ENV_MODE (reliable on Cloudflare
		// Workers, where NODE_ENV is not set), not NODE_ENV.
		const previousMode = publicEnv.PUBLIC_ENV_MODE;
		publicEnv.PUBLIC_ENV_MODE = 'production';
		try {
			const request = createRequest({
				'cf-connecting-ip': '203.0.113.13',
				'cf-ray': 'test-ray',
				'user-agent': 'prod-ua',
				'x-captcha-token': 'any-token-12345'
			});
			const ctx = createSecurityContext(request);
			ctx.riskScore = 90;

			const result = await captchaFeature.check!(ctx, config);
			expect(result?.block).toBe(true);
		} finally {
			publicEnv.PUBLIC_ENV_MODE = previousMode;
		}
	});
});

// ============================================
// Admin Role Checks
// ============================================

describe('isAdminUser', () => {
	it('accepts a single role string', () => {
		expect(isAdminUser({ id: 'u1', role: 'admin' })).toBe(true);
	});

	it('accepts comma-separated role strings', () => {
		expect(isAdminUser({ id: 'u1', role: 'user, admin' })).toBe(true);
	});

	it('accepts role arrays', () => {
		expect(isAdminUser({ id: 'u1', role: ['user', 'admin'] })).toBe(true);
	});

	it('honours custom adminRoles', () => {
		expect(isAdminUser({ id: 'u1', role: 'superadmin' }, { adminRoles: ['superadmin'] })).toBe(
			true
		);
		expect(isAdminUser({ id: 'u1', role: 'superadmin' })).toBe(false);
	});

	it('rejects non-admin users', () => {
		expect(isAdminUser({ id: 'u1', role: 'user' })).toBe(false);
		expect(isAdminUser({ id: 'u1', role: undefined })).toBe(false);
	});
});
