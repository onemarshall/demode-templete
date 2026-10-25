// Integration test setup - avoid user-event dependencies
import { vi } from 'vitest';

// Mock clipboard API comprehensively
const mockClipboard = {
	writeText: vi.fn().mockResolvedValue(undefined),
	readText: vi.fn().mockResolvedValue('')
};

// Setup clipboard mocks before any imports
Object.defineProperty(globalThis, 'navigator', {
	writable: true,
	value: {
		...globalThis.navigator,
		clipboard: mockClipboard
	}
});

Object.defineProperty(globalThis, 'window', {
	writable: true,
	value: {
		...globalThis.window,
		clipboard: mockClipboard
	}
});

Object.defineProperty(globalThis, 'document', {
	writable: true,
	value: {
		...globalThis.document,
		execCommand: vi.fn().mockReturnValue(true)
	}
});

// Suppress console warnings for Redis
const consoleWarn = console.warn;
console.warn = (message, ...args) => {
	const warningText = typeof message === 'string' ? message : '';
	if (warningText.includes('Redis not available') || warningText.includes('Skipping Redis tests')) {
		consoleWarn(message, ...args);
		return;
	}
	consoleWarn(message, ...args);
};
