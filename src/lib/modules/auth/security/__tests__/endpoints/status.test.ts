/**
 * Status Endpoint Tests
 *
 * Tests the status endpoint creation and configuration.
 * Note: Better Auth endpoints are tested via integration tests
 * since they don't expose a direct handler function.
 */

import { describe, it, expect } from 'vitest';
import { createStatusEndpoint } from '../../endpoints/status';
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

describe('createStatusEndpoint', () => {
	describe('endpoint creation', () => {
		it('creates endpoint with correct path', () => {
			const config = createMockConfig();
			const endpoint = createStatusEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/status');
		});

		it('creates endpoint with GET method', () => {
			const config = createMockConfig();
			const endpoint = createStatusEndpoint(config);

			expect(endpoint.options?.method).toBe('GET');
		});

		it('creates endpoint when plugin is disabled', () => {
			const config = createMockConfig({ enabled: false });
			const endpoint = createStatusEndpoint(config);

			expect(endpoint).toBeDefined();
			expect(endpoint.path).toBe('/security/status');
		});
	});
});
