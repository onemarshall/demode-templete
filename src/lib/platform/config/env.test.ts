import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/public', () => ({ PUBLIC_APP_NAME: 'Delivered by SvelteKit' }));
vi.mock('node:fs', () => ({ existsSync: () => false }));
vi.mock('../logger.js', () => ({ logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as publicConfig from './index';
import { clearEnvCache, getDebugEnvInfo, getServerEnv } from './server.server';

describe('public and private runtime configuration', () => {
	beforeEach(() => {
		vi.stubEnv('BETTER_DATABASE_URL', 'postgres://test');
		vi.stubEnv('BETTER_AUTH_SECRET', 'a-test-secret-with-at-least-32-characters');
		vi.stubEnv('PUBLIC_APP_NAME', 'Process fallback');
		vi.stubEnv('REDIS_URL', '');
		vi.stubEnv('SECURITY_STORAGE', 'memory');
		clearEnvCache();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		clearEnvCache();
	});

	it('keeps private accessors and secret values out of the public entry point', async () => {
		const env = await publicConfig.getPublicEnv();
		expect(publicConfig).not.toHaveProperty('getServerEnv');
		expect(env).not.toHaveProperty('BETTER_AUTH_SECRET');
		expect(env).not.toHaveProperty('BETTER_DATABASE_URL');
	});

	it('uses the SvelteKit-delivered public values consistently in both contexts', async () => {
		const [publicEnv, serverEnv] = await Promise.all([publicConfig.getPublicEnv(), getServerEnv()]);
		expect(publicEnv.PUBLIC_APP_NAME).toBe('Delivered by SvelteKit');
		expect(serverEnv.PUBLIC_APP_NAME).toBe(publicEnv.PUBLIC_APP_NAME);
		expect(serverEnv.BETTER_DATABASE_URL).toBe('postgres://test');
	});

	it('invalidates private caches without exposing secrets through diagnostics', async () => {
		const first = await getServerEnv();
		vi.stubEnv('BETTER_DATABASE_URL', 'postgres://changed');
		expect(await getServerEnv()).toBe(first);
		clearEnvCache();
		expect((await getServerEnv()).BETTER_DATABASE_URL).toBe('postgres://changed');
		expect(getDebugEnvInfo()).toMatchObject({ serverEnvLoaded: true });
		expect(JSON.stringify(getDebugEnvInfo())).not.toContain('postgres://changed');
	});
});
