/**
 * Security Context for Unified Security Plugin
 *
 * Per-request object that accumulates security data as features run.
 * Provides event emission for decoupled analytics integration.
 */

import { getClientIp, generateRequestId } from './helpers';
import type { RiskFactor, RiskLevel } from './risk-engine';

// ============================================
// Types
// ============================================

export type SecurityEventType =
	| 'blocked'
	| 'captcha_required'
	| 'captcha_passed'
	| 'captcha_failed'
	| 'rate_limited'
	| 'feature_warning'
	| 'feature_error'
	| 'risk_elevated'
	| 'request_complete';

export interface SecurityEvent {
	type: SecurityEventType;
	timestamp: number;
	data?: Record<string, unknown>;
}

export interface GeoData {
	country?: string;
	countryCode?: string;
	region?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
	timezone?: string;
	isp?: string;
	organization?: string;
	asn?: number;
}

export interface DeviceFingerprint {
	id: string;
	userAgent: string;
	language: string;
	timezone: string;
	screen: {
		width: number;
		height: number;
		colorDepth: number;
	};
	platform: string;
	plugins: string[];
	fonts: string[];
	cookiesEnabled: boolean;
	doNotTrack: boolean;
	touchSupport: boolean;
	hardwareConcurrency: number;
	canvas?: string;
	webgl?: string;
}

export interface BehaviorAnalysis {
	mouseMovements: number;
	keystrokes: number;
	clickPattern: string;
	scrollBehavior: string;
	timingPattern: number[];
	interactionRate: number;
	sessionDuration: number;
	pageViews: number;
	isHuman: boolean;
	humanScore: number;
}

export interface IPReputation {
	ip: string;
	trustScore: number;
	riskScore: number;
	isVpn: boolean;
	isTor: boolean;
	isProxy: boolean;
	isMalicious: boolean;
	isDatacenter: boolean;
	isResidential: boolean;
	isMobile: boolean;
	isCrawler: boolean;
	hostingLikelihood?: number;
	threatTypes: string[];
	source: string;
}

export interface RateLimitInfo {
	limited: boolean;
	remaining: number;
	resetAt: number;
	retryAfter?: number;
}

export interface SecurityContext {
	// Request identification (readonly after creation)
	readonly requestId: string;
	readonly ip: string;
	readonly userAgent: string;
	readonly path: string;
	readonly method: string;
	readonly timestamp: number;

	/** Read-only access to original request headers (for feature extraction) */
	getHeader(name: string): string | null;

	// User info (set if authenticated)
	userId?: string;
	sessionId?: string;
	userRoles?: string[];

	// Accumulated by features
	geo?: GeoData;
	device?: DeviceFingerprint;
	behavior?: BehaviorAnalysis;
	reputation?: IPReputation;

	// Risk assessment (built incrementally)
	riskFactors: RiskFactor[];
	riskScore: number;
	riskLevel: RiskLevel;

	// Decisions
	blocked: boolean;
	blockReason?: string;
	captchaRequired: boolean;
	captchaPassed: boolean;
	rateLimited: boolean;
	rateLimitInfo?: RateLimitInfo;

	// Event emitter for analytics
	emit(event: SecurityEventType, data?: Record<string, unknown>): void;

	// Collected events
	readonly events: SecurityEvent[];
}

// ============================================
// Context Implementation
// ============================================

class SecurityContextImpl implements SecurityContext {
	readonly requestId: string;
	readonly ip: string;
	readonly userAgent: string;
	readonly path: string;
	readonly method: string;
	readonly timestamp: number;

	private readonly _headers: Headers | null;

	userId?: string;
	sessionId?: string;
	userRoles?: string[];

	geo?: GeoData;
	device?: DeviceFingerprint;
	behavior?: BehaviorAnalysis;
	reputation?: IPReputation;

	riskFactors: RiskFactor[] = [];
	riskScore = 0;
	riskLevel: RiskLevel = 'low';

	blocked = false;
	blockReason?: string;
	captchaRequired = false;
	captchaPassed = false;
	rateLimited = false;
	rateLimitInfo?: RateLimitInfo;

	private readonly _events: SecurityEvent[] = [];

	constructor(
		requestId: string,
		ip: string,
		userAgent: string,
		path: string,
		method: string,
		timestamp: number,
		headers: Headers | null = null
	) {
		this.requestId = requestId;
		this.ip = ip;
		this.userAgent = userAgent;
		this.path = path;
		this.method = method;
		this.timestamp = timestamp;
		this._headers = headers;
	}

	getHeader(name: string): string | null {
		return this._headers?.get(name) ?? null;
	}

	emit(type: SecurityEventType, data?: Record<string, unknown>): void {
		this._events.push({
			type,
			timestamp: Date.now(),
			data
		});
	}

	get events(): SecurityEvent[] {
		return this._events;
	}
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new SecurityContext from a Request object
 */
export function createSecurityContext(request: Request): SecurityContext {
	const url = new URL(request.url);

	return new SecurityContextImpl(
		generateRequestId(),
		getClientIp(request),
		request.headers.get('user-agent') ?? '',
		url.pathname,
		request.method,
		Date.now(),
		request.headers
	);
}

/**
 * Create a SecurityContext with custom values (for testing)
 */
export function createTestSecurityContext(
	overrides: Partial<Omit<SecurityContext, 'emit' | 'events'>> = {}
): SecurityContext {
	const ctx = new SecurityContextImpl(
		overrides.requestId ?? generateRequestId(),
		overrides.ip ?? '127.0.0.1',
		overrides.userAgent ?? 'test-agent',
		overrides.path ?? '/test',
		overrides.method ?? 'GET',
		overrides.timestamp ?? Date.now()
	);

	// Apply overrides
	if (overrides.userId) ctx.userId = overrides.userId;
	if (overrides.sessionId) ctx.sessionId = overrides.sessionId;
	if (overrides.userRoles) ctx.userRoles = overrides.userRoles;
	if (overrides.geo) ctx.geo = overrides.geo;
	if (overrides.device) ctx.device = overrides.device;
	if (overrides.behavior) ctx.behavior = overrides.behavior;
	if (overrides.reputation) ctx.reputation = overrides.reputation;
	if (overrides.riskFactors) ctx.riskFactors = overrides.riskFactors;
	if (overrides.riskScore !== undefined) ctx.riskScore = overrides.riskScore;
	if (overrides.riskLevel) ctx.riskLevel = overrides.riskLevel;
	if (overrides.blocked !== undefined) ctx.blocked = overrides.blocked;
	if (overrides.blockReason) ctx.blockReason = overrides.blockReason;
	if (overrides.captchaRequired !== undefined) ctx.captchaRequired = overrides.captchaRequired;
	if (overrides.captchaPassed !== undefined) ctx.captchaPassed = overrides.captchaPassed;
	if (overrides.rateLimited !== undefined) ctx.rateLimited = overrides.rateLimited;
	if (overrides.rateLimitInfo) ctx.rateLimitInfo = overrides.rateLimitInfo;

	return ctx;
}

// ============================================
// Context Utilities
// ============================================

/**
 * Extract SecurityContext from Better Auth context
 */
export function getSecurityContext(ctx: { context?: unknown }): SecurityContext | null {
	const authContext = ctx.context as { securityContext?: SecurityContext } | undefined;
	return authContext?.securityContext ?? null;
}

/**
 * Attach SecurityContext to Better Auth context
 */
export function attachSecurityContext(
	ctx: { context?: unknown },
	securityCtx: SecurityContext
): void {
	if (!ctx.context) {
		// Initialize context object if missing so the security context is not silently lost
		(ctx as { context: unknown }).context = {};
	}
	(ctx.context as Record<string, unknown>).securityContext = securityCtx;
}

/**
 * Check if context has elevated risk
 */
export function hasElevatedRisk(ctx: SecurityContext): boolean {
	return ctx.riskLevel === 'medium' || ctx.riskLevel === 'high' || ctx.riskLevel === 'critical';
}

/**
 * Get summary of context for logging
 */
export function getContextSummary(ctx: SecurityContext): Record<string, unknown> {
	return {
		requestId: ctx.requestId,
		ip: ctx.ip,
		path: ctx.path,
		method: ctx.method,
		userId: ctx.userId,
		riskScore: ctx.riskScore,
		riskLevel: ctx.riskLevel,
		blocked: ctx.blocked,
		captchaRequired: ctx.captchaRequired,
		rateLimited: ctx.rateLimited,
		factorCount: ctx.riskFactors.length,
		eventCount: ctx.events.length
	};
}
