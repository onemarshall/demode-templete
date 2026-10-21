import { describe, it, expect } from 'vitest';

import { resolvePasskeyConfig, isRpIdValidForHost } from '../config';

describe('isRpIdValidForHost', () => {
	it('accepts a relying party ID equal to the host', () => {
		expect(isRpIdValidForHost('auth.iamstudios.cc', 'auth.iamstudios.cc')).toBe(true);
	});

	it('accepts a registrable domain suffix of the host', () => {
		expect(isRpIdValidForHost('iamstudios.cc', 'auth.iamstudios.cc')).toBe(true);
	});

	it('rejects a relying party ID that is not a suffix of the host', () => {
		expect(isRpIdValidForHost('auth.iamstudios.cc', 'other.example.com')).toBe(false);
		expect(isRpIdValidForHost('example.com', 'auth.iamstudios.cc')).toBe(false);
	});

	it('only allows "localhost" on local hosts', () => {
		expect(isRpIdValidForHost('localhost', 'localhost')).toBe(true);
		expect(isRpIdValidForHost('iamstudios.cc', 'localhost')).toBe(false);
		expect(isRpIdValidForHost('localhost', '127.0.0.1')).toBe(true);
	});
});

describe('resolvePasskeyConfig', () => {
	it('uses the configured relying party ID', () => {
		const config = resolvePasskeyConfig({
			rpID: 'auth.iamstudios.cc',
			origin: 'https://auth.iamstudios.cc',
			betterAuthUrl: 'https://auth.iamstudios.cc'
		});

		expect(config.rpID).toBe('auth.iamstudios.cc');
		expect(config.origins).toEqual(['https://auth.iamstudios.cc']);
		expect(config.warnings).toEqual([]);
	});

	it('derives the relying party ID from the canonical URL when unset', () => {
		const config = resolvePasskeyConfig({
			betterAuthUrl: 'https://auth.iamstudios.cc'
		});

		expect(config.rpID).toBe('auth.iamstudios.cc');
		expect(config.origins).toBeNull();
	});

	it('falls back to the site URL when no auth URL is set', () => {
		const config = resolvePasskeyConfig({ siteUrl: 'https://auth.example.com' });

		expect(config.rpID).toBe('auth.example.com');
	});

	it('never silently falls back to localhost for a deployed origin', () => {
		const config = resolvePasskeyConfig({
			betterAuthUrl: 'https://auth.iamstudios.cc',
			origin: 'https://auth.iamstudios.cc'
		});

		expect(config.rpID).toBe('auth.iamstudios.cc');
		expect(config.warnings).toEqual([]);
	});

	it('warns when the configured relying party ID cannot serve the origin', () => {
		const config = resolvePasskeyConfig({
			rpID: 'localhost',
			origin: 'https://auth.iamstudios.cc',
			betterAuthUrl: 'https://auth.iamstudios.cc'
		});

		expect(config.rpID).toBe('localhost');
		expect(
			config.warnings.some((w) => w.includes('ERROR_INVALID_RP_ID'))
		).toBe(true);
	});

	it('splits a comma separated list of origins', () => {
		const config = resolvePasskeyConfig({
			rpID: 'auth.iamstudios.cc',
			origin: 'https://auth.iamstudios.cc, https://localhost:7101'
		});

		expect(config.origins).toEqual(['https://auth.iamstudios.cc', 'https://localhost:7101']);
	});
});
