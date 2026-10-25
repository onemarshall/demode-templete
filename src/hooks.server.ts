// src/hooks.server.ts
//
// SvelteKit server hook — the single entry point for every request.
//
// Request pipeline (in order):
//   1. CORS preflight handling for /api/auth/*
//   2. Early pass-through for static assets and non-sensitive API routes
//   3. Session resolution → event.locals.auth / event.locals.user
//   4. Fast paths that skip abuse detection (safe GETs, dev localhost)
//   5. Temp-block check + abuse detection → 429 when blocked
//   6. resolve() with CSP nonce injection + security headers on the way out

import { auth } from '#lib/app/setup.server.js';
import { logger, securityLogger } from '#lib/platform/logger.js';
import {
	DEFAULT_OPTIONS as ABUSE_PROTECTION_DEFAULTS,
	detectSuspiciousActivity,
	isPrivateIp
} from '#lib/modules/auth/security/services/abuse-detection.js';
import { getClientIp } from '#lib/modules/auth/security/shared/client-ip.js';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getSecurityStorage } from '#lib/modules/auth/server/security-storage.js';
import { serializeUser, serializeSession } from '#lib/modules/auth/server/session-serializer.js';
import { createSecurityHeaders, createCSPDirectives } from '../csp.config.mjs';
import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';

declare global {
	// Flag used to ensure we only register cleanup listeners once per process
	var cleanupRegistered: boolean | undefined;
}

const env = await getServerEnv();
const abuseProtectionConfig = ABUSE_PROTECTION_DEFAULTS;

// The only origin allowed to make credentialed cross-origin calls to the auth API
const corsOrigin =
	typeof env.PUBLIC_SITE_URL === 'string' && env.PUBLIC_SITE_URL.length > 0
		? env.PUBLIC_SITE_URL
		: 'http://localhost:3000';

// Shared key/value backend (Redis, Postgres, or in-memory) used for temp blocks.
// getSecurityStorage() also registers it as the shared adapter for all security
// services, so detectSuspiciousActivity() reads the same store.
const securityStorage = await getSecurityStorage();

// ============================================
// Small helpers
// ============================================

function isAllowedCorsOrigin(origin: string | null): origin is string {
	if (!origin) return false;
	return origin === corsOrigin;
}

/**
 * Generate a per-request CSP nonce. Inline <script> tags in the rendered HTML
 * are rewritten with this nonce (see injectCspNonces), and the CSP header only
 * allows nonced inline scripts — everything else must come from an allowlisted
 * host (see csp.config.mjs).
 */
function createCspNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

/**
 * Add the CSP nonce to <script> tags in a rendered HTML chunk:
 *   - replace any existing nonce attribute,
 *   - add one to inline scripts (external src= scripts are allowed via the
 *     CSP host allowlist and don't need a nonce),
 *   - add one to application/ld+json blocks.
 * Note: transformPageChunk may split HTML across chunks; a <script tag broken
 * exactly at a chunk boundary could evade injection (rare, streaming-only).
 */
function injectCspNonces(html: string, nonce: string): string {
	if (!html.includes('<script')) return html;
	return html
		.replace(/<script([^>]*?)\snonce=("[^"]*"|'[^']*')([^>]*)>/g, `<script$1 nonce="${nonce}"$3>`)
		.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)([^>]*)>/g, `<script nonce="${nonce}"$1>`)
		.replace(
			/<script\s+type=("|')application\/ld\+json\1(?![^>]*\bnonce=)([^>]*)>/g,
			`<script type="application/ld+json" nonce="${nonce}"$2>`
		);
}

/**
 * Resolve the client IP for this request.
 *
 * Header-based resolution delegates to the shared trust-proxy-aware resolver
 * used by abuse detection and rate limiting, so the same IP feeds every
 * security key. It only trusts forwarding headers allowed by the configured
 * trustProxy mode (default 'cloudflare': CF-Connecting-IP, and only when a
 * CF-Ray header is present) — a spoofed X-Forwarded-For on a direct
 * connection is never read here.
 *
 * When no trusted header is present we fall back to the socket address
 * reported by the adapter via event.getClientAddress().
 */
function resolveClientIp(event: RequestEvent): string {
	const trusted = getClientIp(event.request, { fallback: '' });
	if (trusted) return trusted;
	try {
		return event.getClientAddress();
	} catch (err) {
		logger.warn('[Security] Could not determine client IP, defaulting to 0.0.0.0', {
			error: err instanceof Error ? err.message : String(err)
		});
		return '0.0.0.0';
	}
}

/**
 * True for IPs that should skip the abuse-detection pipeline in development.
 * Normalizes IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 → 127.0.0.1) so the
 * shared private-range check applies to them too.
 */
function isPrivateOrLocalIp(ip: string): boolean {
	const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
	return isPrivateIp(normalized);
}

/**
 * Build the 429 response for a temp-blocked identifier.
 *
 * Shared by the pre-check below and by the detector's own `blocked` verdict so
 * every block path returns the same shape (previously the pre-check returned
 * 429 while the detector path threw a 403).
 */
async function buildBlockedResponse(
	blockKey: string,
	event: RequestEvent,
	startTime: number
): Promise<Response> {
	// Best-effort TTL read so the client knows when to retry; defaults to 60s
	let retryAfter = 60;
	try {
		const ttl = await securityStorage.ttl(blockKey);
		if (typeof ttl === 'number' && ttl > 0) retryAfter = ttl;
	} catch (e) {
		logger.warn('[Security] Failed to read temp block TTL', {
			error: e instanceof Error ? e.message : String(e)
		});
	}

	const resetAtMs = Date.now() + retryAfter * 1000;
	const processingTimeMs = performance.now() - startTime;

	// Only reflect CORS headers back onto auth API routes — a 429 on a regular
	// page should never gain cross-origin credentialed access headers
	const requestOrigin = event.request.headers.get('origin');
	const corsHeaders: Record<string, string> =
		event.url.pathname.startsWith('/api/auth/') && isAllowedCorsOrigin(requestOrigin)
			? {
					'Access-Control-Allow-Origin': corsOrigin,
					'Access-Control-Allow-Credentials': 'true',
					Vary: 'Origin'
				}
			: {};

	return new Response(
		JSON.stringify({
			message: 'Too many failed attempts. Please try again later.',
			code: 'RATE_LIMITED',
			retryAfter
		}),
		{
			status: 429,
			headers: new Headers({
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
				...corsHeaders,
				'x-ratelimit-limit': String(abuseProtectionConfig.tempBlock?.maxAttempts ?? 0),
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset': String(Math.floor(resetAtMs / 1000)),
				'Retry-After': String(retryAfter),
				'Server-Timing': `app;dur=${processingTimeMs.toFixed(2)}`,
				'x-response-time': `${processingTimeMs.toFixed(2)}ms`
			})
		}
	);
}

function logSlowRequest(
	event: RequestEvent,
	startTime: number,
	ip: string,
	userId?: string,
	timings?: Record<string, number>
) {
	const processingTime = performance.now() - startTime;
	if (processingTime <= 1000) return;
	securityLogger.warn(`[Performance] Slow request: ${event.request.method} ${event.url.pathname}`, {
		processingTime: `${processingTime.toFixed(2)}ms`,
		// Cumulative phase offsets from startTime — the gaps between them show
		// which stage actually consumed the time.
		phases: timings,
		ip,
		userId,
		userAgent: event.request.headers.get('user-agent') || ''
	});
}

// ============================================
// Main request handler
// ============================================

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const startTime = performance.now();

	// Fresh nonce per request; read back in applySecurityHeaders and by
	// injectCspNonces via transformPageChunk
	const cspNonce = createCspNonce();
	event.locals.cspNonce = cspNonce;

	const isAuthApi = pathname.startsWith('/api/auth/');
	const requestOrigin = event.request.headers.get('origin');
	const allowCors = isAuthApi && isAllowedCorsOrigin(requestOrigin);

	// ---- 1. CORS preflight -------------------------------------------------
	// Answer OPTIONS for the auth API directly; reject unknown origins outright.
	if (event.request.method === 'OPTIONS' && isAuthApi) {
		if (!allowCors) return new Response(null, { status: 403 });
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Origin': corsOrigin,
				'Access-Control-Allow-Headers':
				'Content-Type, Authorization, x-captcha-response, x-captcha-token, x-security-data, x-device-fingerprint, x-behavior-data, x-session-id, x-browser-language, x-timezone, x-ratelimit-reset, x-ratelimit-remaining, x-ratelimit-limit',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Max-Age': '86400',
				// Origin-specific response — caches must key on Origin
				Vary: 'Origin'
			}
		});
	}

	// ---- 2. Early pass-through ---------------------------------------------
	// Static assets and API routes that don't need the abuse-detection
	// pipeline. The only /api/auth/* paths that continue past this point are
	// sign-in and sign-up, which carry credentials and need full scrutiny.
	const isSignInOrSignUp =
		pathname.startsWith('/api/auth/sign-in') || pathname.startsWith('/api/auth/sign-up');

	if (
		pathname.startsWith('/static/') ||
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/api/captcha/') ||
		pathname.startsWith('/api/security-check') ||
		(isAuthApi && !isSignInOrSignUp)
	) {
		return applySecurityHeaders(await resolve(event), event);
	}

	// ---- 3. Session resolution ----------------------------------------------
	// Populates event.locals for downstream load functions and feeds the userId
	// used for temp-block keys and risk scoring.
	//
	// The client IP is resolved here, ahead of the fast paths below, so every
	// slow-request log carries the real IP — the plain-GET fast path used to
	// hardcode '0.0.0.0', which made those entries impossible to attribute.
	const ip = resolveClientIp(event);

	// Coarse phase offsets from startTime, recorded via mark() as the request
	// progresses. Only read when a request turns out to be slow, so the happy
	// path pays nothing beyond a few performance.now() calls.
	const timings: Record<string, number> = {};
	const mark = (phase: string) => {
		timings[phase] = performance.now() - startTime;
	};

	const sessionData = await auth.api.getSession({ headers: event.request.headers });
	const userId = sessionData?.user?.id;
	mark('session');
	if (sessionData) {
		event.locals.auth = {
			session: serializeSession(sessionData.session),
			user: serializeUser(sessionData.user)
		};
		event.locals.user = serializeUser(sessionData.user);
	} else {
		event.locals.auth = null;
		event.locals.user = null;
	}

	// ---- 4. Fast paths -------------------------------------------------------
	const isGetRequest = event.request.method === 'GET';
	const isAuthPage = pathname.startsWith('/auth/');

	// Plain GETs outside the auth surface can't mutate anything — skip the
	// security pipeline entirely (detection still runs on GET /auth/* pages so
	// they can pre-compute requireCaptcha for the forms they render).
	if (isGetRequest && !isAuthApi && !isAuthPage) {
		event.locals.securityInfo = {
			riskScore: 0,
			requireCaptcha: false,
			securityLevel: 'low',
			deviceTrusted: true
		};
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => injectCspNonces(html, cspNonce)
		});
		mark('rendered');
		logSlowRequest(event, startTime, ip, userId, timings);
		return applySecurityHeaders(response, event);
	}

	const isDev = process.env.NODE_ENV === 'development';

	// Dev fast-path: skip storage-backed security checks for private/localhost
	// IPs so local development never trips over rate-limit state. Runs after
	// session resolution so locals.auth/user are still populated.
	if (isDev && isPrivateOrLocalIp(ip)) {
		event.locals.securityInfo = {
			riskScore: 0,
			requireCaptcha: false,
			securityLevel: 'low',
			deviceTrusted: true
		};
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => injectCspNonces(html, cspNonce)
		});
		return applySecurityHeaders(response, event);
	}

	// ---- 5. Temp-block + abuse detection -------------------------------------

	// Cheap pre-check: a blocked identifier short-circuits before we spend any
	// detection effort. detectSuspiciousActivity() re-checks the same key on the
	// same shared storage adapter, so a block that lands between the two checks
	// is still caught below — both paths return the same 429 shape.
	const blockKey = `temp_block:${userId || ip}`;
	if (await securityStorage.get(blockKey)) {
		return buildBlockedResponse(blockKey, event, startTime);
	}

	// CAPTCHA token normally arrives via the x-captcha-token header (see
	// features/captcha); for non-auth-API form posts we also look in the body.
	let captchaToken: string | undefined = event.request.headers.get('x-captcha-token') ?? undefined;
	if (!captchaToken && !isAuthApi) {
		const contentType = event.request.headers.get('content-type');
		try {
			if (contentType?.includes('application/json')) {
				const bodyText = await event.request.clone().text();
				if (bodyText) {
					const body = JSON.parse(bodyText);
					captchaToken = body['captcha-token'] || body['captchaToken'];
				}
			} else if (contentType?.includes('application/x-www-form-urlencoded')) {
				const formData = await event.request.clone().formData();
				captchaToken = formData.get('captcha-token') as string;
			}
		} catch (captchaErr) {
			logger.warn('Could not read CAPTCHA token from request body', {
				error: captchaErr instanceof Error ? captchaErr.message : String(captchaErr)
			});
		}
	}

	// Fail-open: a detection outage must not take the site down with it
	let suspiciousActivity;
	try {
		suspiciousActivity = await detectSuspiciousActivity(
			event.request,
			abuseProtectionConfig,
			userId,
			captchaToken
		);
	} catch (detectionError) {
		securityLogger.warn('[Security] Abuse detection failed, using safe defaults', {
			error: detectionError instanceof Error ? detectionError.message : String(detectionError),
			ip,
			path: pathname
		});
		suspiciousActivity = {
			blocked: false,
			riskScore: 0,
			requireCaptcha: false,
			securityLevel: 'low' as const
		};
	}

	// Pass the computed security level to Better Auth endpoints via a request
	// header so the security plugin's own hooks can read it.
	const resolvedEvent: RequestEvent =
		suspiciousActivity.securityLevel && isAuthApi
			? (() => {
					const headers = new Headers(event.request.headers);
					headers.set('x-security-level', suspiciousActivity.securityLevel);
					return { ...event, request: new Request(event.request, { headers }) } as RequestEvent;
				})()
			: event;

	// Broader auth matcher used only for the dev-mode bypass below — covers
	// endpoints like /api/auth/sign-in/social that don't match the
	// startsWith('/api/auth/sign-in') fast-path predicate.
	const isAuthRequest =
		isSignInOrSignUp || pathname.includes('/sign-in') || pathname.includes('/sign-up');

	// Only mutating requests can be blocked — GETs ran detection purely to
	// populate securityInfo for the page render.
	if (suspiciousActivity.blocked && !isGetRequest) {
		// In dev, auth requests (and /admin from localhost) are allowed through
		// with a warning instead of a hard block, so testing isn't hindered
		if (isDev && (isAuthRequest || (isPrivateOrLocalIp(ip) && pathname.startsWith('/admin/')))) {
			securityLogger.warn(`[Security] Would block in production - dev mode bypass for ${ip}`, {
				userId,
				riskScore: suspiciousActivity.riskScore,
				reason: suspiciousActivity.reason,
				requireCaptcha: suspiciousActivity.requireCaptcha
			});
		} else {
			securityLogger.warn(`[Security] Blocked suspicious activity from ${ip}`, {
				userId,
				riskScore: suspiciousActivity.riskScore,
				reason: suspiciousActivity.reason,
				requireCaptcha: suspiciousActivity.requireCaptcha
			});
			return buildBlockedResponse(`temp_block:${userId || ip}`, event, startTime);
		}
	}

	// ---- 6. Resolve + security headers ---------------------------------------
	event.locals.securityInfo = {
		riskScore: suspiciousActivity.riskScore,
		requireCaptcha: suspiciousActivity.requireCaptcha || false,
		securityLevel: suspiciousActivity.securityLevel || 'low',
		deviceTrusted: true
	};

	const response = await resolve(resolvedEvent, {
		transformPageChunk: ({ html }) => injectCspNonces(html, cspNonce)
	});

	mark('rendered');
	logSlowRequest(event, startTime, ip, userId, timings);

	const finalResponse = applySecurityHeaders(response, event);

	// Cheap per-request timing on the auth API surface for observability
	if (isAuthApi) {
		const processingTimeMs = performance.now() - startTime;
		finalResponse.headers.set('Server-Timing', `app;dur=${processingTimeMs.toFixed(2)}`);
		finalResponse.headers.set('x-response-time', `${processingTimeMs.toFixed(2)}ms`);
	}

	return finalResponse;
};

/**
 * Apply the shared security header set (csp.config.mjs) plus a fresh CSP built
 * around this request's nonce, HSTS on HTTPS, and the CORS reflection headers
 * for credentialed auth-API calls from the site origin.
 */
function applySecurityHeaders(response: Response, event: RequestEvent): Response {
	const requestOrigin = event.request.headers.get('origin');
	const resolvedCorsOrigin =
		event.url.pathname.startsWith('/api/auth/') && isAllowedCorsOrigin(requestOrigin)
			? corsOrigin
			: undefined;
	const securityHeaders: Record<string, string> = createSecurityHeaders({
		corsOrigin: resolvedCorsOrigin
	});

	const nonce = event.locals.cspNonce ?? '';
	const cspDirectives = createCSPDirectives({
		nonce,
		isDev: process.env.NODE_ENV === 'development'
	});
	const cspHeader = Object.entries(cspDirectives)
		.map(([key, values]) => {
			const directiveValues = Array.isArray(values) ? values : [values];
			return `${key} ${directiveValues.join(' ')}`;
		})
		.join('; ');

	securityHeaders['Content-Security-Policy'] = cspHeader;

	// Origin-specific headers — caches must key on Origin
	if (resolvedCorsOrigin) {
		securityHeaders['Vary'] = 'Origin';
	}

	if (event.url.protocol === 'https:') {
		securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
	}

	Object.entries(securityHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	return response;
}

// ============================================
// Graceful shutdown
// ============================================

// Registering a SIGTERM/SIGINT listener disables Node's default "exit on
// signal" behavior, so the handler must close connections and exit explicitly.
// Registered once per process (module can be evaluated more than once in dev).
if (!globalThis.cleanupRegistered) {
	const cleanup = async () => {
		logger.info('[Cleanup] Shutting down gracefully...');
		// Dynamic imports keep the DB/Redis driver code out of this module's
		// startup graph; they only load if shutdown actually happens.
		const [{ closeAllRedisClients }, { closeDB }] = await Promise.all([
			import('#lib/platform/redis/index.js'),
			import('#lib/platform/database/db.js')
		]);
		await Promise.allSettled([closeAllRedisClients(), closeDB()]);
		logger.info('[Cleanup] All connections closed successfully');
		process.exit(0);
	};
	process.on('SIGTERM', cleanup);
	process.on('SIGINT', cleanup);
	globalThis.cleanupRegistered = true;
}
