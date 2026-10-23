import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getRequestEvent: vi.fn(),
	signInEmail: vi.fn(),
	signUpEmail: vi.fn()
}));

vi.mock('$app/server', () => ({
	form: (...args: unknown[]) => Object.assign(args.at(-1) as object, { __: { type: 'form' } }),
	query: (handler: object) => Object.assign(handler, { __: { type: 'query' } }),
	getRequestEvent: mocks.getRequestEvent
}));

vi.mock('#lib/auth/server/config.js', () => ({
	auth: { api: { signInEmail: mocks.signInEmail, signUpEmail: mocks.signUpEmail } }
}));

import { login, signup } from '../auth.remote';

describe('auth form CAPTCHA requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getRequestEvent.mockReturnValue({
			request: new Request('http://localhost:7101/_app/remote/auth', {
				method: 'POST',
				headers: { 'user-agent': 'captcha-test', cookie: 'captcha_bypass=test-bypass' }
			}),
			cookies: {}
		});
	});

	it.each([
		{ mode: 'sign-in', action: login, api: mocks.signInEmail },
		{ mode: 'sign-up', action: signup, api: mocks.signUpEmail }
	])('forwards the $mode request and exposes the CAPTCHA challenge to the form', async ({ mode, action, api }) => {
		api.mockResolvedValue(new Response(JSON.stringify({
			error: 'Security verification required',
			code: 'CAPTCHA_REQUIRED',
			captchaRequired: true
		}), { status: 428 }));

		// The mocked form() exposes the server callback without a browser transport.
		const submit = action as unknown as (data: Record<string, string>) => Promise<unknown>;
		const result = await submit({
			name: 'Test Person', email: 'captcha@example.com',
			password: 'StrongPass123!', passwordConfirm: 'StrongPass123!'
		});

		expect(result).toEqual({ error: 'Security verification required', captchaRequired: true });
		expect(api).toHaveBeenCalledOnce();
		const { request } = api.mock.calls[0]![0];
		expect(request).toBeInstanceOf(Request);
		expect(request.url).toBe(`http://localhost:7101/api/auth/${mode}/email`);
		expect(request.method).toBe('POST');
		expect(request.headers.get('user-agent')).toBe('captcha-test');
		expect(request.headers.get('cookie')).toBe('captcha_bypass=test-bypass');
	});
});
