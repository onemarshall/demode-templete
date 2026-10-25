import { describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { securityPlugin } from '../plugin';
import { createBeforeHook } from '../hooks/before';

const passkeyPaths = [
	{ path: '/passkey/list-user-passkeys', method: 'GET' },
	{ path: '/passkey/generate-authenticate-options', method: 'GET' },
	{ path: '/passkey/generate-register-options', method: 'GET' },
	{ path: '/passkey/verify-authentication', method: 'POST' },
	{ path: '/passkey/verify-registration', method: 'POST' },
	{ path: '/passkey/delete-passkey', method: 'POST' },
	{ path: '/sign-in/magic-link', method: 'POST' },
	{ path: '/email-otp/send-verification-otp', method: 'POST' }
] as const;

describe('CAPTCHA endpoint scope', () => {
	it.each(passkeyPaths)('does not challenge $path even at threshold zero', async ({ path, method }) => {
		// Probe endpoints isolate the security gate from each login method's
		// own credential/session requirements. They must reach their handler.
		const auth = betterAuth({
			baseURL: 'http://localhost',
			secret: 'captcha-scope-regression-secret-at-least-32-characters',
			plugins: [securityPlugin({
				captchaThreshold: 0, skipInDevelopment: false,
				features: { blocking: false, rateLimit: false, geo: false, device: false, behavior: false, captcha: true }
			}), {
				id: 'captcha-scope-probe',
				endpoints: { probe: createAuthEndpoint(path, { method }, async () => ({ reachedEndpoint: true })) }
			}]
		});
		const response = await auth.handler(new Request(`http://localhost/api/auth${path}`, {
			method, headers: { origin: 'http://localhost', 'Content-Type': 'application/json' },
			...(method === 'POST' ? { body: '{}' } : {})
		}));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ reachedEndpoint: true });
	});

	it('still blocks high-risk passkey requests through the other security features', async () => {
		const hook = createBeforeHook({
			config: {
				enabled: true, skipInDevelopment: false, captchaThreshold: 0, blockThreshold: 80,
				captchaPaths: ['/sign-in/email', '/sign-up/email'], includePaths: [], excludePaths: []
			},
			features: [{
				id: 'risk-probe', name: 'Risk probe', configKey: 'geo', priority: 30,
				check: async () => ({ riskFactors: [{ source: 'geo', factor: 'high-risk', score: 85 }] })
			}]
		})[0]!;
		const response = await hook.handler({
			path: '/passkey/generate-authenticate-options', context: {},
			request: new Request('http://localhost/api/auth/passkey/generate-authenticate-options')
		} as never);
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(403);
		expect(await (response as Response).json()).toMatchObject({ code: 'BLOCKED' });
	});
});
