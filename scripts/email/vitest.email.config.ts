/**
 * Vitest Configuration for Email Tests
 * Specific configuration for email testing environment
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		setupFiles: [],
		hookTimeout: 30000,
		testTimeout: 30000,
		include: ['scripts/email/test-email-usesend.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['**/node_modules/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts']
		},
		env: {
			EMAIL_PROVIDER: 'usesend',
			EMAIL_API_KEY: 'test-api-key-12345',
			EMAIL_PROVIDER_URL: 'https://test.usesend.com',
			EMAIL_FROM: 'noreply@testapp.com',
			EMAIL_TO: 'testuser@example.com',
			PUBLIC_APP_NAME: 'TestApp',
			NODE_ENV: 'test'
		},
		// Global setup and teardown
		globalSetup: [],
		// Test sequencing
		sequence: {
			concurrent: true,
			shuffle: false
		},
		// Reporter configuration
		reporters: ['verbose', 'json'],
		outputFile: {
			json: './test-results/email-test-results.json'
		},
		// Mock configuration
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		// Watch mode configuration
		watch: false,
		watchExclude: ['**/node_modules/**', '**/dist/**', '**/build/**']
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '../../src'),
			$lib: path.resolve(__dirname, '../../src/lib'),
			$: path.resolve(__dirname, '../../src')
		}
	},
	define: {
		// Define global constants for testing
		___: true,
		__DEV__: false
	}
});
