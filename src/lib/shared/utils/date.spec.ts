import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
	it('returns null for null, undefined or empty input', () => {
		expect(formatDate(null)).toBeNull();
		expect(formatDate(undefined)).toBeNull();
		expect(formatDate('')).toBeNull();
	});

	it('formats a date with short month by default', () => {
		expect(formatDate('2024-03-15')).toBe('15 Mar 2024');
	});

	it('formats a date with a long month', () => {
		expect(formatDate('2024-03-15', { month: 'long' })).toBe('15 March 2024');
	});
});
