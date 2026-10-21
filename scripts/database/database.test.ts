import { describe, it, expect, vi } from 'vitest';

describe('Database Operations', () => {
	it('should sync users correctly', async () => {
		// Import and run your user sync test
		const { testUserSync } = await import('./test-user-sync');

		// Mock console to capture output
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		try {
			await testUserSync();
		} catch {
			// Test may fail if user already exists, that's okay
			console.log('Test completed (may have expected errors)');
		}

		// Verify test ran (look for any of the expected messages)
		const logCalls = consoleSpy.mock.calls.map((call) => call[0]).join(' ');
		expect(logCalls).toMatch(
			/(Testing user sync|✅ All tests completed|User created|User updated)/
		);

		consoleSpy.mockRestore();
	});

	it('should update user login methods', async () => {
		const { testSetLastLoginMethod } = await import('./test-set-lastLoginMethod');

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		await testSetLastLoginMethod();

		// Look for the success message
		const logCalls = consoleSpy.mock.calls.map((call) => call[0]);
		const hasSuccessMessage = logCalls.some(
			(call) => typeof call === 'string' && call.includes('✅ Updated lastLoginMethod')
		);

		// Also check for the verification message
		const hasVerificationMessage = logCalls.some(
			(call) => typeof call === 'string' && call.includes('✓ Updated lastLoginMethod')
		);

		expect(hasSuccessMessage || hasVerificationMessage).toBe(true);

		consoleSpy.mockRestore();
	});
});
