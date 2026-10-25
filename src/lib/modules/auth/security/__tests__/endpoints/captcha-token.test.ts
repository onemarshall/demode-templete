import { afterEach, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { createCaptchaEndpoint } from '../../endpoints/captcha';
import { captchaFeature } from '../../features/captcha';
import { createSecurityContext } from '../../core/context';
import type { SecurityConfig } from '../../core/feature';

vi.mock('../../features/rate-limit/sliding-window', () => ({
	slidingWindowCheck: vi.fn(async () => ({ limited: false }))
}));

vi.mock('../../core/storage', () => ({
	createStorageAdapter: vi.fn(async () => ({
		get: vi.fn(async () => null),
		set: vi.fn(async () => {}),
		del: vi.fn(async () => {})
	}))
}));

const config: SecurityConfig = {
	enabled: true, skipInDevelopment: false,
	captchaThreshold: 0, blockThreshold: 80, includePaths: [], excludePaths: [],
	features: { captcha: {
		enabled: true, provider: 'capjs', endpoint: 'https://captcha.test',
		siteKey: 'test-site', secretKey: 'test-secret'
	} }
};

function createAuth() {
	return betterAuth({
		baseURL: 'http://localhost',
		secret: 'captcha-token-regression-secret-at-least-32-characters',
		plugins: [{ id: 'captcha-token-test', endpoints: {
			verifyCaptcha: createCaptchaEndpoint(config)
		} }]
	});
}

function verifyToken(token: string) {
	return createAuth().handler(new Request('http://localhost/api/auth/security/verify-captcha', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token })
	}));
}

afterEach(() => vi.unstubAllGlobals());

describe('Cap token formats', () => {
	it.each([
		'identifier123:secret456',
		'sitekey123:identifier456:secret789',
		'legacy_token-123.abc=='
	])('verifies %s through both CAPTCHA paths', async (token) => {
		const fetchMock = vi.fn(async () => Response.json({ success: true }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await verifyToken(token);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true, bypassToken: expect.any(String) });

		const ctx = createSecurityContext(new Request('http://localhost/api/auth/sign-in/email', {
			method: 'POST', headers: { 'x-captcha-token': token }
		}));
		await captchaFeature.check!(ctx, config);
		expect(ctx.captchaPassed).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		for (const call of fetchMock.mock.calls) {
			expect(call).toEqual([
				'https://captcha.test/test-site/siteverify',
				expect.objectContaining({ body: JSON.stringify({ secret: 'test-secret', response: token }) })
			]);
		}
	});

	it('still rejects a colon-separated token when the provider rejects it', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Response.json({ success: false })));
		const response = await verifyToken('identifier123:invalid-secret');
		expect(await response.json()).toMatchObject({ success: false });
	});

	it('rejects invalid characters before contacting the provider', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const response = await verifyToken('<script>invalid-token</script>');
		expect(await response.json()).toMatchObject({ success: false, error: 'Invalid token format' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		{ status: 403, error: 'Invalid site key or secret', expected: 'Captcha is not configured correctly. Please contact support.' },
		{ status: 404, error: 'Token not found', expected: 'Captcha expired or was already used. Please complete a new challenge.' },
		{ status: 403, error: 'Token expired', expected: 'Captcha expired or was already used. Please complete a new challenge.' },
		{ status: 500, error: 'Internal server error', expected: 'Verification service unavailable' }
	])('distinguishes Cap errors: $error', async ({ status, error, expected }) => {
		vi.stubGlobal('fetch', vi.fn(async () => Response.json({ success: false, error }, { status })));
		const response = await verifyToken('sitekey123:identifier456:secret789');
		expect(await response.json()).toMatchObject({ success: false, error: expected });
	});
});
