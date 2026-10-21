/**
 * Shared Helper Functions
 *
 * Common utility functions used across the auth system.
 */

import { securityLogger } from './logger';
import { publicEnv } from './env';

/**
 * Generate a secure random string
 */
export function generateSecureRandom(length = 32): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const cryptoApi = globalThis.crypto;

	if (!cryptoApi?.getRandomValues) {
		throw new Error('Secure random generation requires crypto.getRandomValues');
	}

	const bytes = new Uint8Array(length);
	cryptoApi.getRandomValues(bytes);

	let result = '';
	for (const byte of bytes) {
		result += chars[byte % chars.length] ?? 'A';
	}

	return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (password.length < 8) {
		errors.push('Password must be at least 8 characters long');
	}

	if (!/[A-Z]/.test(password)) {
		errors.push('Password must contain at least one uppercase letter');
	}

	if (!/[a-z]/.test(password)) {
		errors.push('Password must contain at least one lowercase letter');
	}

	if (!/[0-9]/.test(password)) {
		errors.push('Password must contain at least one number');
	}

	if (!/[!@#$%^&*]/.test(password)) {
		errors.push('Password must contain at least one special character');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
	return input.trim().replace(/[<>]/g, '');
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	const realIP = request.headers.get('x-real-ip');
	const cfConnectingIP = request.headers.get('cf-connecting-ip');

	if (forwardedFor) {
		const firstIP = forwardedFor.split(',')[0];
		return firstIP?.trim() || 'unknown';
	}

	if (realIP) {
		return realIP;
	}

	if (cfConnectingIP) {
		return cfConnectingIP;
	}

	return 'unknown';
}

/**
 * Check if request is from a trusted source
 */
export function isTrustedSource(request: Request): boolean {
	const trustedIpsRaw = publicEnv.PUBLIC_TRUSTED_IPS;
	const trustedIPs = typeof trustedIpsRaw === 'string' ? trustedIpsRaw.split(',') : [];
	const clientIP = getClientIP(request);

	return trustedIPs.includes(clientIP);
}

/**
 * Log security event
 */
export function logSecurityEvent(
	event: string,
	details: Record<string, unknown>,
	request?: Request
): void {
	const logData = {
		event,
		timestamp: new Date().toISOString(),
		ip: request ? getClientIP(request) : 'unknown',
		userAgent: request?.headers.get('user-agent') || 'unknown',
		...details
	};

	securityLogger.info(`[Security] ${event}`, logData);
}

/**
 * Rate limit helper
 */
export class RateLimiter {
	private attempts = new Map<string, { count: number; resetTime: number }>();

	constructor(
		private windowMs: number = 15 * 60 * 1000, // 15 minutes
		private maxAttempts: number = 5
	) {}

	isBlocked(key: string): boolean {
		const now = Date.now();
		const record = this.attempts.get(key);

		if (!record || now > record.resetTime) {
			return false;
		}

		return record.count >= this.maxAttempts;
	}

	recordAttempt(key: string): { blocked: boolean; remaining: number } {
		const now = Date.now();
		const record = this.attempts.get(key);

		if (!record || now > record.resetTime) {
			this.attempts.set(key, {
				count: 1,
				resetTime: now + this.windowMs
			});
			return { blocked: false, remaining: this.maxAttempts - 1 };
		}

		record.count++;
		const remaining = Math.max(0, this.maxAttempts - record.count);

		return {
			blocked: record.count >= this.maxAttempts,
			remaining
		};
	}

	clear(key: string): void {
		this.attempts.delete(key);
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, record] of this.attempts.entries()) {
			if (now > record.resetTime) {
				this.attempts.delete(key);
			}
		}
	}
}
