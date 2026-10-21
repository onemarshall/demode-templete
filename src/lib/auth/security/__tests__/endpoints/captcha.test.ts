/**
 * CAPTCHA Endpoint Tests
 *
 * Tests the CAPTCHA verification endpoint creation and bypass token management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createCaptchaEndpoint,
	validateBypassToken,
	clearBypassToken
} from '../../endpoints/captcha';
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
		features: {
			captcha: {
				enabled: true,
				provider: 'capjs',
				secretKey: 'test-secret',
				bypassTtlSeconds: 1800
			}
		},
		...overrides
	};
}

// ============================================
// Tests
// ============================================

describe('createCaptchaEndpoint', () => {
	describe('endpoint creation', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createCaptchaEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/verify-captcha');
		});

		it('creates endpoint with POST method', () => {
			const config = createMockConfig();
			const endpoint = createCaptchaEndpoint(config);

			expect(endpoint.options?.method).toBe('POST');
		});

		it('creates endpoint when CAPTCHA is disabled', () => {
			const config = createMockConfig({
				features: { captcha: false }
			});
			const endpoint = createCaptchaEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/verify-captcha');
		});
	});
});

describe('bypass token management', () => {
	beforeEach(() => {
		// Clear any existing tokens
	});

	describe('validateBypassToken', () => {
		it('returns false for non-existent token', async () => {
			const result = await validateBypassToken('non-existent-token', 'identifier-123');
			expect(result).toBe(false);
		});

		it('returns false for wrong identifier', async () => {
			const result = await validateBypassToken('some-token', 'wrong-identifier');
			expect(result).toBe(false);
		});
	});

	describe('clearBypassToken', () => {
		it('clears token without error', () => {
			expect(() => clearBypassToken('any-token')).not.toThrow();
		});
	});
});
