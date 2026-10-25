/**
 * Helper Functions for Security Services
 *
 * Utility functions for IP validation, pagination, sorting, and response helpers.
 */

export { getRiskLevel, getRiskLevelColor } from '../core/risk-engine';

// ============================================
// Pre-compiled Patterns
// ============================================

const IPV4_PATTERN =
	/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_PATTERN = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;

// ============================================
// Validation Constants
// ============================================

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_PAGINATION_LIMIT = 100;

// ============================================
// IP Validation
// ============================================

/**
 * Validate IPv4 address
 */
function isValidIPv4(ip: string): boolean {
	return IPV4_PATTERN.test(ip);
}

/**
 * Validate IPv6 address
 */
function isValidIPv6(ip: string): boolean {
	return IPV6_PATTERN.test(ip) || ip === '::1' || ip === '::';
}

/**
 * Validate IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
	if (!ip || typeof ip !== 'string') return false;
	return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Validate identifier (userId, deviceId, alertId)
 */
export function isValidIdentifier(id: string): boolean {
	if (!id || typeof id !== 'string') return false;
	if (id.length > MAX_IDENTIFIER_LENGTH) return false;
	return IDENTIFIER_PATTERN.test(id);
}

/**
 * Sanitize identifier by removing dangerous characters
 */
export function sanitizeIdentifier(id: string): string {
	if (!id || typeof id !== 'string') return '';
	return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, MAX_IDENTIFIER_LENGTH);
}

// ============================================
// Pagination
// ============================================

/**
 * Validate pagination parameters
 */
export function validatePagination(page: number, limit: number): { page: number; limit: number } {
	return {
		page: Math.max(1, Math.floor(page) || 1),
		limit: Math.min(MAX_PAGINATION_LIMIT, Math.max(1, Math.floor(limit) || 20))
	};
}

/**
 * Apply pagination to array
 */
export function paginateArray<T>(
	items: T[],
	page: number,
	limit: number
): { items: T[]; total: number; page: number; limit: number; hasMore: boolean } {
	const validated = validatePagination(page, limit);
	const startIndex = (validated.page - 1) * validated.limit;

	return {
		items: items.slice(startIndex, startIndex + validated.limit),
		total: items.length,
		page: validated.page,
		limit: validated.limit,
		hasMore: startIndex + validated.limit < items.length
	};
}

// ============================================
// Sorting
// ============================================

/**
 * Create sort comparator
 */
export function createSortComparator<T>(
	sortBy: keyof T,
	sortOrder: 'asc' | 'desc'
): (a: T, b: T) => number {
	return (a, b) => {
		const aVal = (a[sortBy] as number) || 0;
		const bVal = (b[sortBy] as number) || 0;
		return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
	};
}

// ============================================
// Risk Level
// ============================================

// ============================================
// Response Helpers
// ============================================

const UNAUTHORIZED_RESPONSE_BODY = Object.freeze({
	success: false,
	error: 'Unauthorized',
	code: 'UNAUTHORIZED'
});

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(): Response {
	return new Response(JSON.stringify(UNAUTHORIZED_RESPONSE_BODY), {
		status: 403,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Create JSON response
 */
export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Create error response
 */
export function errorResponse(error: string, status = 400): Response {
	return new Response(JSON.stringify({ success: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Create success response
 */
export function successResponse(message?: string, data?: unknown): Response {
	const payload: Record<string, unknown> = { success: true };

	if (typeof message !== 'undefined') {
		payload.message = message;
	}

	if (typeof data !== 'undefined') {
		if (data && typeof data === 'object' && !Array.isArray(data)) {
			Object.assign(payload, data as Record<string, unknown>);
		} else {
			payload.data = data;
		}
	}

	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}
