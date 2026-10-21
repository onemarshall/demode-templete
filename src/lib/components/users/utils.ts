import type { DateLike } from './types';

/**
 * Format a date for display, returning '—' for invalid/empty dates
 */
export function formatDateTime(date: DateLike | undefined): string {
	if (!date) return '—';
	try {
		return new Date(date).toLocaleString();
	} catch {
		return '—';
	}
}

/**
 * Get initials from a name or email address
 */
export function getInitials(
	name: string | null | undefined,
	email: string | null | undefined
): string {
	const source = name || email || '?';
	return source
		.split(/[\s@]+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join('');
}
