/**
 * Admin Endpoint Tests
 *
 * Tests the admin endpoint creation and IP blocklist management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createBlockIpEndpoint,
	createUnblockIpEndpoint,
	createClearCacheEndpoint,
	createListBlockedIpsEndpoint,
	isIpBlocked,
	getIpBlockInfo
} from '../../endpoints/admin';
import type { SecurityConfig } from '../../core/feature';

// ============================================
// Test Helpers
// ============================================

function createMockConfig(overrides: Partial<SecurityConfig> = {}): SecurityConfig {
	return {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		includePaths: ['/api/auth'],
		excludePaths: [],
		...overrides
	};
}

// ============================================
// Tests
// ============================================

describe('Admin Endpoints', () => {
	describe('createBlockIpEndpoint', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createBlockIpEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/admin/block-ip');
		});

		it('creates endpoint with POST method', () => {
			const config = createMockConfig();
			const endpoint = createBlockIpEndpoint(config);

			expect(endpoint.options?.method).toBe('POST');
		});
	});

	describe('createUnblockIpEndpoint', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createUnblockIpEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/admin/unblock-ip');
		});

		it('creates endpoint with DELETE method', () => {
			const config = createMockConfig();
			const endpoint = createUnblockIpEndpoint(config);

			expect(endpoint.options?.method).toBe('DELETE');
		});
	});

	describe('createClearCacheEndpoint', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createClearCacheEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/admin/clear-cache');
		});

		it('creates endpoint with POST method', () => {
			const config = createMockConfig();
			const endpoint = createClearCacheEndpoint(config);

			expect(endpoint.options?.method).toBe('POST');
		});
	});

	describe('createListBlockedIpsEndpoint', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createListBlockedIpsEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/admin/blocked-ips');
		});

		it('creates endpoint with GET method', () => {
			const config = createMockConfig();
			const endpoint = createListBlockedIpsEndpoint(config);

			expect(endpoint.options?.method).toBe('GET');
		});
	});
});

describe('IP Blocklist Management', () => {
	beforeEach(() => {
		// Note: In a real implementation, we'd clear the blocklist here
	});

	describe('isIpBlocked', () => {
		it('returns false for non-blocked IP', async () => {
			const result = await isIpBlocked('192.168.1.1');
			expect(result).toBe(false);
		});

		it('returns false for unknown IP', async () => {
			const result = await isIpBlocked('10.0.0.1');
			expect(result).toBe(false);
		});
	});

	describe('getIpBlockInfo', () => {
		it('returns null for non-blocked IP', async () => {
			const result = await getIpBlockInfo('192.168.1.1');
			expect(result).toBeNull();
		});
	});
});
