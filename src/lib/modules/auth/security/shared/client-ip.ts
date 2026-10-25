/**
 * Shared client-IP extraction.
 *
 * Delegates to the trust-proxy-aware implementation in core/helpers so all
 * security code paths (abuse detection, rate limiting, admin endpoints)
 * resolve the client IP identically. Do NOT add unconditional header
 * parsing here — spoofed X-Forwarded-For/CF-Connecting-IP headers were a
 * bypass vector (e.g. "X-Forwarded-For: 127.0.0.1" skipped abuse checks).
 */

import { getClientIp as getTrustedClientIp } from '../core/helpers';

export interface GetClientIpOptions {
	fallback?: string;
}

export function getClientIp(request: Request, options: GetClientIpOptions = {}): string {
	return getTrustedClientIp(request, options);
}

export function clearClientIpCache(): void {}
