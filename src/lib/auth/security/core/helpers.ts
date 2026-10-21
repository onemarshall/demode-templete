/**
 * Consolidated Helper Utilities for Unified Security Plugin
 *
 * Merges utilities from:
 * - shared/client-ip.ts
 * - plugins/geo-intelligence/services/helpers.ts
 * - plugins/abuse-protection/services/helpers.ts
 * - plugins/fraud-detection/services/extraction.ts
 */

import { isDevelopment as envIsDevelopment } from '#lib/auth/shared/env/index.js';

// ============================================
// Constants
// ============================================

const DEFAULT_FALLBACK_IP = '0.0.0.0';

const PRIVATE_IP_PREFIXES = [
	'10.',
	'127.',
	'192.168.',
	'172.16.',
	'172.17.',
	'172.18.',
	'172.19.',
	'172.20.',
	'172.21.',
	'172.22.',
	'172.23.',
	'172.24.',
	'172.25.',
	'172.26.',
	'172.27.',
	'172.28.',
	'172.29.',
	'172.30.',
	'172.31.'
];

const DEG_TO_RAD = Math.PI / 180;

// ============================================
// Request IP Cache (WeakMap for automatic cleanup)
// ============================================

const requestIpCache = new WeakMap<Request, string>();

// ============================================
// Trusted Proxy Configuration
// ============================================

type TrustProxyMode = 'cloudflare' | 'proxy' | 'none' | string[];

let currentTrustProxy: TrustProxyMode = 'cloudflare';

/**
 * Set the trust proxy mode for IP extraction.
 * Call once during plugin initialization.
 */
export function setTrustProxy(mode: TrustProxyMode): void {
	currentTrustProxy = mode;
}

/**
 * Get the ordered list of trusted IP headers for the current mode.
 */
function getTrustedHeaders(mode: TrustProxyMode): string[] {
	if (Array.isArray(mode)) return mode;
	switch (mode) {
		case 'cloudflare':
			return ['cf-connecting-ip'];
		case 'proxy':
			return ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'];
		case 'none':
			return [];
	}
}

// ============================================
// IP Extraction
// ============================================

export interface GetClientIpOptions {
	fallback?: string;
}

function normalizeIp(raw: string): string {
	let ip = raw.trim();

	if (ip.startsWith('"') && ip.endsWith('"')) {
		ip = ip.slice(1, -1);
	}

	if (ip.startsWith('[') && ip.endsWith(']')) {
		ip = ip.slice(1, -1);
	}

	const colonIndex = ip.lastIndexOf(':');
	if (colonIndex !== -1) {
		const hasMultipleColons = ip.indexOf(':') !== colonIndex;
		if (!hasMultipleColons) {
			ip = ip.slice(0, colonIndex);
		}
	}

	return ip.trim();
}

/**
 * Extract client IP from request headers (cached per request).
 *
 * SECURITY: Only headers allowed by the current trustProxy mode are checked.
 * Default mode is 'cloudflare' which only trusts CF-Connecting-IP — and only
 * when a CF-Ray header is present, matching hooks.server.ts resolveClientIp.
 * Without the CF-Ray gate a direct-connection client could spoof
 * CF-Connecting-IP and assume any identity. Set mode via setTrustProxy()
 * or the plugin's trustProxy option.
 */
export function getClientIp(request: Request, options: GetClientIpOptions = {}): string {
	const cached = requestIpCache.get(request);
	if (cached) return cached;

	const fallback = options.fallback ?? DEFAULT_FALLBACK_IP;
	let trustedHeaders = getTrustedHeaders(currentTrustProxy);

	// In 'cloudflare' mode only trust CF-Connecting-IP when CF-Ray proves the
	// request actually traversed Cloudflare.
	if (
		currentTrustProxy === 'cloudflare' &&
		trustedHeaders.includes('cf-connecting-ip') &&
		!request.headers.get('cf-ray')
	) {
		trustedHeaders = trustedHeaders.filter((h) => h !== 'cf-connecting-ip');
	}

	for (const headerName of trustedHeaders) {
		const value = request.headers.get(headerName);
		if (!value) continue;

		let raw = value;
		// For X-Forwarded-For, take only the first (leftmost / client) IP
		if (headerName === 'x-forwarded-for') {
			const commaIndex = value.indexOf(',');
			raw = commaIndex === -1 ? value : value.slice(0, commaIndex);
		}

		const ip = normalizeIp(raw);
		if (ip && ip !== '0.0.0.0') {
			requestIpCache.set(request, ip);
			return ip;
		}
	}

	requestIpCache.set(request, fallback);
	return fallback;
}

// ============================================
// IP Validation
// ============================================

/**
 * Check if IP is private/local (should skip external lookups)
 */
export function isPrivateIp(ip: string): boolean {
	if (ip === '0.0.0.0' || ip === '::1' || ip === 'localhost') return true;

	for (const prefix of PRIVATE_IP_PREFIXES) {
		if (ip.startsWith(prefix)) return true;
	}

	return false;
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
	const parts = ip.split('.');
	if (parts.length !== 4) return false;

	for (const part of parts) {
		const num = parseInt(part, 10);
		if (isNaN(num) || num < 0 || num > 255) return false;
		if (part !== String(num)) return false;
	}

	return true;
}

/**
 * Validate IPv6 address format (simplified)
 */
export function isValidIPv6(ip: string): boolean {
	if (ip === '::1') return true;

	const parts = ip.split(':');
	if (parts.length < 3 || parts.length > 8) return false;

	for (const part of parts) {
		if (part === '') continue;
		if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return false;
	}

	return true;
}

/**
 * Check if IP is valid (v4 or v6)
 */
export function isValidIp(ip: string): boolean {
	return isValidIPv4(ip) || isValidIPv6(ip);
}

// ============================================
// Hashing Utilities
// ============================================

/**
 * Fast non-cryptographic hash (djb2 algorithm)
 * Use for cache keys, not security-sensitive purposes
 */
export function fastHash(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return hash >>> 0;
}

/**
 * Create a string hash (hex representation of fastHash)
 */
export function hashString(str: string): string {
	return fastHash(str).toString(16);
}

/**
 * Hash user agent for fingerprinting (truncated for efficiency)
 */
export function hashUserAgent(userAgent: string): string {
	const normalized = userAgent.toLowerCase().replace(/\s+/g, '');
	return hashString(normalized);
}

// ============================================
// Token Generation
// ============================================

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
	return generateToken(4);
}

/**
 * Generate a request ID (UUID v4 format)
 */
export function generateRequestId(): string {
	return crypto.randomUUID();
}

// ============================================
// Time Utilities
// ============================================

/**
 * Parse time window string to seconds
 * Supports: "1s", "5m", "1h", "1d"
 */
export function parseWindowToSeconds(window: string | number): number {
	if (typeof window === 'number') return window;

	const match = window.match(/^(\d+)(s|m|h|d)$/);
	if (!match || !match[1] || !match[2]) return 60;

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 's':
			return value;
		case 'm':
			return value * 60;
		case 'h':
			return value * 3600;
		case 'd':
			return value * 86400;
		default:
			return 60;
	}
}

/**
 * Format seconds as human-readable duration
 */
export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return `${Math.floor(seconds / 86400)}d`;
}

// ============================================
// Math Utilities
// ============================================

/**
 * Convert degrees to radians
 */
export function toRad(deg: number): number {
	return deg * DEG_TO_RAD;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

// ============================================
// Path Matching
// ============================================

export interface PathMatchConfig {
	includePaths: string[];
	excludePaths: string[];
}

/**
 * Check if path should be processed by security features
 */
export function shouldProcessPath(path: string, config: PathMatchConfig): boolean {
	for (const excludePath of config.excludePaths) {
		if (path.startsWith(excludePath)) {
			return false;
		}
	}

	if (config.includePaths.length === 0) {
		return true;
	}

	for (const includePath of config.includePaths) {
		if (path.startsWith(includePath)) {
			return true;
		}
	}

	return false;
}

// ============================================
// Browser/OS Detection
// ============================================

const BROWSER_PATTERNS: [RegExp, string][] = [
	[/Chrome\/(\d+)/, 'Chrome'],
	[/Firefox\/(\d+)/, 'Firefox'],
	[/Safari\/(\d+)/, 'Safari'],
	[/Edge\/(\d+)/, 'Edge'],
	[/MSIE (\d+)/, 'IE'],
	[/Trident.*rv:(\d+)/, 'IE']
];

const OS_PATTERNS: [RegExp, string][] = [
	[/Windows NT/, 'Windows'],
	[/Mac OS X/, 'macOS'],
	[/Linux/, 'Linux'],
	[/Android/, 'Android'],
	[/iPhone|iPad|iPod/, 'iOS']
];

/**
 * Extract browser family from user agent
 */
export function getBrowserFamily(userAgent: string): string {
	for (const [pattern, name] of BROWSER_PATTERNS) {
		if (pattern.test(userAgent)) return name;
	}
	return 'Unknown';
}

/**
 * Extract OS family from user agent
 */
export function getOsFamily(userAgent: string): string {
	for (const [pattern, name] of OS_PATTERNS) {
		if (pattern.test(userAgent)) return name;
	}
	return 'Unknown';
}

// ============================================
// Identifier Generation
// ============================================

/**
 * Create a request identifier for rate limiting/blocking
 * Uses user ID if authenticated, otherwise IP + user agent hash
 */
export function getIdentifier(request: Request, userId?: string): string {
	if (userId) {
		return `user:${userId}`;
	}

	const ip = getClientIp(request);
	const ua = request.headers.get('user-agent') || '';
	const uaHash = hashUserAgent(ua);

	return `anon:${ip}:${uaHash}`;
}

// ============================================
// Development Mode Check
// ============================================

let isDevelopmentCached: boolean | null = null;

/**
 * Check if running in development mode (cached)
 * Uses the shared env utility for consistency across the codebase.
 */
export function isDevelopment(): boolean {
	if (isDevelopmentCached === null) {
		isDevelopmentCached = envIsDevelopment();
	}
	return isDevelopmentCached;
}

/**
 * Reset development mode cache (for testing)
 */
export function resetDevelopmentCache(): void {
	isDevelopmentCached = null;
}
