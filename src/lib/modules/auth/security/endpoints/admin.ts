/**
 * Security Admin Endpoints
 *
 * Admin-only endpoints for managing security:
 * - IP blocking/unblocking
 * - Cache clearing
 * - Configuration updates
 */

import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import { z } from 'zod';
import { securityLogger } from '#lib/platform/logger.js';
import { isAdminUser } from '../../shared/roles.js';
import { clearAllFeatureCaches } from '../core/feature';
import { getClientIp, isValidIp } from '../core/helpers';
import type { SecurityConfig } from '../core/feature';
import { slidingWindowCheck } from '../features/rate-limit/sliding-window';
import {
	blockIPAddress,
	unblockIPAddress,
	isIPBlocked as serviceIsIPBlocked,
	getBlockedIPs as serviceGetBlockedIPs
} from '../services/blocked-ips';
import { createStorageAdapter, type StorageAdapter } from '../core/storage';

// ============================================
// Persistent Audit Log
// ============================================

const AUDIT_LOG_KEY = 'security:admin:audit_log';
const MAX_AUDIT_ENTRIES = 500;

let auditStorage: StorageAdapter | null = null;

async function getAuditStorage(): Promise<StorageAdapter> {
	if (!auditStorage) {
		auditStorage = await createStorageAdapter();
	}
	return auditStorage;
}

async function logAdminAction(
	action: string,
	adminUserId: string | undefined,
	details: Record<string, unknown>
): Promise<void> {
	try {
		const storage = await getAuditStorage();
		const raw = await storage.get(AUDIT_LOG_KEY);
		const entries: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
		entries.unshift({
			action,
			adminUserId: adminUserId ?? 'unknown',
			timestamp: Date.now(),
			...details
		});
		if (entries.length > MAX_AUDIT_ENTRIES) entries.length = MAX_AUDIT_ENTRIES;
		await storage.set(AUDIT_LOG_KEY, JSON.stringify(entries));
	} catch {
		// Non-critical — don't fail the admin action
	}
}

// ============================================
// Types
// ============================================

export interface BlockIpResponse {
	success: boolean;
	ip: string;
	blockedUntil?: number;
	error?: string;
}

export interface UnblockIpResponse {
	success: boolean;
	ip: string;
	error?: string;
}

export interface ClearCacheResponse {
	success: boolean;
	clearedFeatures: string[];
}

// ============================================
// IP Blocklist Helpers (delegates to Redis-backed services/blocked-ips)
// ============================================

/**
 * Check if an IP is currently blocked (async, Redis-backed)
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
	return serviceIsIPBlocked(ip);
}

/**
 * Get block info for an IP (async, Redis-backed)
 * @deprecated Use getBlockedIPs query from services/blocked-ips for richer data
 */
export async function getIpBlockInfo(
	ip: string
): Promise<{ blockedUntil: number; reason: string } | null> {
	const blocked = await serviceIsIPBlocked(ip);
	if (!blocked) return null;
	// Basic info — for full metadata use services/blocked-ips.getBlockedIPs()
	return { blockedUntil: 0, reason: 'Blocked' };
}

// ============================================
// Validation Schemas
// ============================================

const blockIpSchema = z.object({
	ip: z.string().min(7).max(45),
	duration: z
		.number()
		.min(60)
		.max(86400 * 365)
		.optional()
		.default(86400),
	reason: z.string().max(500).optional().default('Admin blocked')
});

const unblockIpSchema = z.object({
	ip: z.string().min(7).max(45)
});

// ============================================
// CSRF Protection
// ============================================

/**
 * Validate that the request Origin matches the server host.
 * Prevents cross-site request forgery on state-changing admin endpoints.
 * Returns true if the request is safe (same-origin or safe method).
 */
function validateCsrfOrigin(request: Request | undefined): boolean {
	if (!request) return false;

	// GET/HEAD/OPTIONS are safe methods — no CSRF risk
	const method = request.method.toUpperCase();
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

	const requestUrl = new URL(request.url);
	const host = requestUrl.host; // e.g. "example.com" or "localhost:5173"

	// Check Origin header first (preferred)
	const origin = request.headers.get('origin');
	if (origin) {
		try {
			const originUrl = new URL(origin);
			return originUrl.host === host;
		} catch {
			return false;
		}
	}

	// Fallback to Referer header
	const referer = request.headers.get('referer');
	if (referer) {
		try {
			const refererUrl = new URL(referer);
			return refererUrl.host === host;
		} catch {
			return false;
		}
	}

	// No Origin or Referer — reject state-changing requests
	return false;
}

// ============================================
// Request Body Size Limit
// ============================================

const MAX_BODY_SIZE_BYTES = 10_240; // 10 KB — more than enough for admin payloads

function isBodyTooLarge(request: Request | undefined): boolean {
	if (!request) return false;
	const contentLength = request.headers.get('content-length');
	if (contentLength && Number(contentLength) > MAX_BODY_SIZE_BYTES) {
		return true;
	}
	return false;
}

// ============================================
// Admin Rate Limiting (Redis-backed via sliding window)
// ============================================

const ADMIN_RATE_LIMIT = 30; // max requests per window
const ADMIN_RATE_WINDOW_SECONDS = 60; // 1 minute

async function checkAdminRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
	try {
		const key = `rl:admin:${ip}`;
		const result = await slidingWindowCheck(key, ADMIN_RATE_LIMIT, ADMIN_RATE_WINDOW_SECONDS);
		if (result.limited) {
			return { allowed: false, retryAfter: result.retryAfter ?? 1 };
		}
		return { allowed: true };
	} catch {
		// Fail-open: allow request if Redis is unavailable
		return { allowed: true };
	}
}

// ============================================
// Admin Role Check
// ============================================

interface AuthContext {
	session?: {
		user?: {
			id: string;
			role?: string | string[];
		};
	} | null;
}

function requireAdmin(
	ctx: { context?: unknown },
	adminRoles: string[] = ['admin', 'superadmin']
): { authorized: boolean; userId?: string } {
	const authContext = ctx.context as unknown as AuthContext | undefined;
	const user = authContext?.session?.user;

	if (!user) {
		return { authorized: false };
	}

	if (!isAdminUser(user, { adminRoles })) {
		return { authorized: false };
	}

	return { authorized: true, userId: user.id };
}

// ============================================
// Endpoint Factories
// ============================================

export function createBlockIpEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/admin/block-ip',
		{
			method: 'POST',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!config.enabled) {
				return ctx.json({ success: false, error: 'Security plugin disabled' }, { status: 503 });
			}

			if (!validateCsrfOrigin(ctx.request)) {
				return ctx.json({ success: false, error: 'Invalid request origin' }, { status: 403 });
			}

			if (isBodyTooLarge(ctx.request)) {
				return ctx.json({ success: false, error: 'Request body too large' }, { status: 413 });
			}

			const { authorized, userId } = requireAdmin(ctx, config.adminRoles);
			if (!authorized) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const clientIp = ctx.request ? getClientIp(ctx.request) : 'unknown';
			const rateCheck = await checkAdminRateLimit(clientIp);
			if (!rateCheck.allowed) {
				return ctx.json(
					{ success: false, error: 'Rate limit exceeded' },
					{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
				);
			}

			try {
				const parsed = blockIpSchema.safeParse(ctx.body);
				if (!parsed.success) {
					const firstIssue = parsed.error.issues[0];
					return ctx.json(
						{ success: false, error: firstIssue?.message ?? 'Invalid request' },
						{ status: 400 }
					);
				}

				const { ip, duration, reason } = parsed.data;

				if (!isValidIp(ip)) {
					return ctx.json({ success: false, ip, error: 'Invalid IP address' }, { status: 400 });
				}

				const success = await blockIPAddress(ip, reason, duration, userId);

				if (!success) {
					return ctx.json({ success: false, ip, error: 'Failed to block IP' }, { status: 500 });
				}

				securityLogger.warn('[Security] IP blocked by admin', {
					ip,
					duration,
					reason,
					adminUserId: userId
				});

				await logAdminAction('block_ip', userId, { ip, duration, reason });

				const response: BlockIpResponse = {
					success: true,
					ip,
					blockedUntil: Date.now() + duration * 1000
				};

				return ctx.json(response);
			} catch {
				return ctx.json({ success: false, error: 'Failed to block IP' }, { status: 500 });
			}
		}
	);
}

export function createUnblockIpEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/admin/unblock-ip',
		{
			method: 'DELETE',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!config.enabled) {
				return ctx.json({ success: false, error: 'Security plugin disabled' }, { status: 503 });
			}

			if (!validateCsrfOrigin(ctx.request)) {
				return ctx.json({ success: false, error: 'Invalid request origin' }, { status: 403 });
			}

			if (isBodyTooLarge(ctx.request)) {
				return ctx.json({ success: false, error: 'Request body too large' }, { status: 413 });
			}

			const { authorized, userId } = requireAdmin(ctx, config.adminRoles);
			if (!authorized) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const clientIp = ctx.request ? getClientIp(ctx.request) : 'unknown';
			const rateCheck = await checkAdminRateLimit(clientIp);
			if (!rateCheck.allowed) {
				return ctx.json(
					{ success: false, error: 'Rate limit exceeded' },
					{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
				);
			}

			try {
				const parsed = unblockIpSchema.safeParse(ctx.body);
				if (!parsed.success) {
					const firstIssue = parsed.error.issues[0];
					return ctx.json(
						{ success: false, error: firstIssue?.message ?? 'Invalid request' },
						{ status: 400 }
					);
				}

				const { ip } = parsed.data;

				if (!isValidIp(ip)) {
					return ctx.json({ success: false, ip, error: 'Invalid IP address' }, { status: 400 });
				}

				const success = await unblockIPAddress(ip);

				if (!success) {
					return ctx.json({ success: false, ip, error: 'Failed to unblock IP' }, { status: 500 });
				}

				securityLogger.info('[Security] IP unblocked by admin', {
					ip,
					adminUserId: userId
				});

				await logAdminAction('unblock_ip', userId, { ip });

				const response: UnblockIpResponse = {
					success: true,
					ip
				};

				return ctx.json(response);
			} catch {
				return ctx.json({ success: false, error: 'Failed to unblock IP' }, { status: 500 });
			}
		}
	);
}

export function createClearCacheEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/admin/clear-cache',
		{
			method: 'POST',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!config.enabled) {
				return ctx.json({ success: false, error: 'Security plugin disabled' }, { status: 503 });
			}

			if (!validateCsrfOrigin(ctx.request)) {
				return ctx.json({ success: false, error: 'Invalid request origin' }, { status: 403 });
			}

			if (isBodyTooLarge(ctx.request)) {
				return ctx.json({ success: false, error: 'Request body too large' }, { status: 413 });
			}

			const { authorized, userId } = requireAdmin(ctx, config.adminRoles);
			if (!authorized) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const clientIp = ctx.request ? getClientIp(ctx.request) : 'unknown';
			const rateCheck = await checkAdminRateLimit(clientIp);
			if (!rateCheck.allowed) {
				return ctx.json(
					{ success: false, error: 'Rate limit exceeded' },
					{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
				);
			}

			try {
				clearAllFeatureCaches();

				securityLogger.info('[Security] Caches cleared by admin', {
					adminUserId: userId
				});

				await logAdminAction('clear_cache', userId, {});

				const response: ClearCacheResponse = {
					success: true,
					clearedFeatures: ['all']
				};

				return ctx.json(response);
			} catch {
				return ctx.json({ success: false, error: 'Failed to clear caches' }, { status: 500 });
			}
		}
	);
}

export function createListBlockedIpsEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/admin/blocked-ips',
		{
			method: 'GET',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!config.enabled) {
				return ctx.json({ success: false, error: 'Security plugin disabled' }, { status: 503 });
			}

			const { authorized } = requireAdmin(ctx, config.adminRoles);
			if (!authorized) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const clientIp = ctx.request ? getClientIp(ctx.request) : 'unknown';
			const rateCheck = await checkAdminRateLimit(clientIp);
			if (!rateCheck.allowed) {
				return ctx.json(
					{ success: false, error: 'Rate limit exceeded' },
					{ status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
				);
			}

			try {
				const result = await serviceGetBlockedIPs({});
				const blockedIps = result.ips.map((entry) => ({
					ip: entry.ip,
					blockedUntil: entry.expiresAt ?? 0,
					reason: entry.reason
				}));

				return ctx.json({ blockedIps, total: result.total });
			} catch {
				return ctx.json({ blockedIps: [], total: 0 });
			}
		}
	);
}
