// scripts/test-setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Mock console methods for script tests (less strict)
const consoleError = console.error;
const consoleWarn = console.warn;

beforeAll(() => {
	// Mock console.error to not fail tests on expected errors
	console.error = (message, ...args) => {
		// Allow certain expected errors
		const messageStr = typeof message === 'string' ? message : String(message);
		if (
			messageStr.includes('Test failed') ||
			(messageStr.includes('Value') && messageStr.includes('has to be unique'))
		) {
			return; // Suppress expected database errors
		}
		consoleError(message, ...args);
	};

	// Mock console.warn to not fail tests
	console.warn = (message, ...args) => {
		consoleWarn(message, ...args);
	};
});

afterAll(() => {
	// Restore original console methods
	console.error = consoleError;
	console.warn = consoleWarn;
});
