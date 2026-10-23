import { describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth';
import { securityPlugin } from '../plugin';
import { buildSecurityPlugins } from '../../server/plugins/security';

describe('sign-out without CAPTCHA', () => {
	it.each(['plugin defaults', 'application config'] as const)('%s allows sign-out at a zero CAPTCHA threshold', async (source) => {
		const plugins = source === 'plugin defaults'
			? [securityPlugin({
				skipInDevelopment: false,
				captchaThreshold: 0,
				features: {
					blocking: false, rateLimit: false, geo: false,
					device: false, behavior: false, captcha: true
				}
			})]
			: buildSecurityPlugins({
				NODE_ENV: 'test', AUTH_SECURITY_PLUGIN: true,
				AUTH_ABUSE_PROTECTION_PLUGIN: false, AUTH_RATE_LIMIT_PLUGIN: false,
				AUTH_GEO_INTELLIGENCE_PLUGIN: false, AUTH_FRAUD_DETECTION_PLUGIN: false
			});
		const auth = betterAuth({
			baseURL: 'http://localhost',
			secret: 'sign-out-captcha-regression-test-secret-at-least-32-chars',
			emailAndPassword: { enabled: true },
			plugins
		});
		const post = (path: string) => auth.handler(new Request(`http://localhost/api/auth${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
			body: JSON.stringify({})
		}));

		const logout = await post('/sign-out');
		expect(logout.status).toBe(200);
		expect(await logout.json()).toMatchObject({ success: true });
		expect(logout.headers.get('set-cookie')).toMatch(/max-age=0/i);

		for (const path of ['/sign-in/email', '/sign-up/email']) {
			const response = await post(path);
			expect(response.status).toBe(428);
			expect(await response.json()).toMatchObject({ captchaRequired: true });
		}
	});
});
