import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page.server';

type LoadReturn = Awaited<ReturnType<typeof load>>;

function assertLoadResult(value: LoadReturn): asserts value is Exclude<LoadReturn, void> {
	if (typeof value === 'undefined') {
		throw new Error('Expected load() to return a value, but it returned void');
	}
}

function createCookies(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	return {
		get: (name: string) => store.get(name),
		delete: vi.fn((name: string) => {
			store.delete(name);
		})
	};
}

function createLoadArgs(
	url: URL,
	cookies: ReturnType<typeof createCookies>
): Parameters<typeof load>[0] {
	return {
		url,
		cookies
	} as unknown as Parameters<typeof load>[0];
}

describe('2FA page server load', () => {
	it('redirects to sign-in when reason=pending but cookie missing', async () => {
		const cookies = createCookies();
		const url = new URL('http://localhost/auth/2fa?reason=pending');

		await expect(load(createLoadArgs(url, cookies))).rejects.toMatchObject({ status: 302 });
	});

	it('marks stale when no cookie and no reason', async () => {
		const cookies = createCookies();
		const url = new URL('http://localhost/auth/2fa');

		const result = await load(createLoadArgs(url, cookies));
		assertLoadResult(result);
		expect(result.reason).toBe('stale');
		expect(result.isStale).toBe(true);
		expect(result.hasTwoFactorCookie).toBe(false);
	});

	it('clears cookie when reason=stale even if cookie exists', async () => {
		const cookies = createCookies({ 'better-auth.two_factor': '1' });
		const url = new URL('http://localhost/auth/2fa?reason=stale');

		const result = await load(createLoadArgs(url, cookies));
		assertLoadResult(result);
		expect(cookies.delete).toHaveBeenCalledWith('better-auth.two_factor', { path: '/' });
		expect(result.isStale).toBe(true);
		expect(result.hasTwoFactorCookie).toBe(false);
	});

	it('defaults to pending when cookie exists and no reason provided', async () => {
		const cookies = createCookies({ 'better-auth.two_factor': '1' });
		const url = new URL('http://localhost/auth/2fa');

		const result = await load(createLoadArgs(url, cookies));
		assertLoadResult(result);
		expect(result.reason).toBe('pending');
		expect(result.isStale).toBe(false);
		expect(result.hasTwoFactorCookie).toBe(true);
	});
});
