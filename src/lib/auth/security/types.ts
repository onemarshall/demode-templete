/**
 * Unified Security Types
 *
 * This file exports types from the unified security plugin system.
 * Legacy type names are provided as aliases for backward compatibility.
 */

// ============================================
// Core Types (from unified core module)
// ============================================

export type {
	// Risk engine types
	RiskLevel,
	RiskFactor,
	RiskThresholds,
	RiskAssessment,
	// Context types
	SecurityContext,
	SecurityEvent,
	SecurityEventType,
	GeoData,
	DeviceFingerprint,
	BehaviorAnalysis,
	IPReputation,
	RateLimitInfo,
	// Feature types
	SecurityConfig,
	SecurityFeature,
	FeatureResult,
	FeaturePriority,
	BlockingFeatureConfig,
	RateLimitFeatureConfig,
	RateLimitRule,
	RateLimitTier,
	CaptchaFeatureConfig,
	GeoFeatureConfig,
	DeviceFeatureConfig,
	BehaviorFeatureConfig,
	// Cache types
	CacheStats,
	// Circuit breaker types
	CircuitState,
	CircuitBreakerOptions,
	CircuitBreakerStats,
	// Helper types
	PathMatchConfig
} from './core';

// ============================================
// Analytics Types (from unified analytics module)
// ============================================

export type {
	SecurityAnalyticsEvent,
	CollectorConfig,
	StorageAdapter,
	TimeRange,
	MetricsSummary,
	RiskDistribution,
	HourlyActivity,
	TopFactor,
	GeographicBreakdown,
	DashboardMetrics,
	AlertSeverity,
	SecurityAlert,
	AlertThresholds,
	AlertConfig
} from './analytics';

// ============================================
// Client Types (from unified client module)
// ============================================

export type {
	SecurityClientPlugin,
	StandaloneClientOptions,
	SecurityState,
	SecurityStore,
	CreateSecurityStoreOptions,
	BasicFingerprint,
	CaptchaProvider,
	BehaviorMetrics
} from './client';

// ============================================
// Legacy Type Aliases (backward compatibility)
// ============================================

import type { RateLimitInfo as _RateLimitInfo, GeoData as _GeoData } from './core';
import type { SecurityAlert as _SecurityAlert } from './analytics';
import type { SecurityState as _SecurityState } from './client';

/** @deprecated Use SecurityPluginOptions from plugin.ts */
export interface AbuseProtectionPluginOptions {
	enabled?: boolean;
	skipInDevelopment?: boolean;
}

/** @deprecated Use SecurityPluginOptions from plugin.ts */
export interface FraudDetectionPluginOptions {
	enabled?: boolean;
	skipInDevelopment?: boolean;
}

/** @deprecated Use SecurityPluginOptions from plugin.ts */
export interface GeoIntelligencePluginOptions {
	enabled?: boolean;
	skipInDevelopment?: boolean;
}

/** @deprecated Use SecurityPluginOptions from plugin.ts */
export interface RateLimitPluginOptions {
	enabled?: boolean;
	skipInDevelopment?: boolean;
}

/** @deprecated Use SecurityPluginOptions from plugin.ts */
export interface SecurityAnalyticsPluginOptions {
	enabled?: boolean;
}

/** @deprecated Use RateLimitInfo */
export type RateLimitStatus = _RateLimitInfo;

/** @deprecated Use RateLimitInfo */
export type AbuseRateLimitStatus = _RateLimitInfo;

/** @deprecated Use SecurityState */
export type AbuseProtectionClientState = _SecurityState;

/** @deprecated Use SecurityState */
export type RateLimitClientState = _SecurityState;

/** @deprecated Use SecurityState */
export type GeoIntelligenceClientState = _SecurityState;

/** @deprecated Use GeoData */
export type GeoLocation = _GeoData;

/** @deprecated Use IPReputation */
export type VelocityCheck = { allowed: boolean; reason?: string };

/** @deprecated Use RiskLevel */
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

/** @deprecated Use RiskLevel */
export type TrustLevel = 'trusted' | 'normal' | 'suspicious' | 'blocked';

export interface CaptchaStatus {
	required: boolean;
	provider?: string;
	siteKey?: string;
}

export interface CaptchaVerifyResult {
	success: boolean;
	score?: number;
	error?: string;
}

export interface BlockStatus {
	blocked: boolean;
	reason?: string;
	expiresAt?: number;
}

export interface SecurityMetrics {
	totalRequests: number;
	blockedRequests: number;
	captchaRequired: number;
	avgRiskScore: number;
}

export interface SuspiciousActivityResult {
	suspicious: boolean;
	factors: string[];
	score: number;
}

export interface ProtectionStatusResponse {
	enabled: boolean;
	riskScore: number;
	blocked: boolean;
	captchaRequired: boolean;
}

/** @deprecated Use FraudAnalysis instead */
export interface SimpleFraudAnalysis {
	score: number;
	factors: string[];
	recommendation: 'allow' | 'captcha' | 'block';
}

export interface FraudCheckResult {
	passed: boolean;
	score: number;
	factors: string[];
}

export interface BehaviorPattern {
	mouseMovements: number;
	keystrokes: number;
	scrollEvents: number;
	timeOnPage: number;
}

export interface SecurityData {
	ip: string;
	userAgent: string;
	fingerprint?: string;
}

export interface SecurityHeaders {
	'x-risk-score'?: string;
	'x-captcha-required'?: string;
}

export interface RateLimitHeaders {
	'x-ratelimit-limit'?: string;
	'x-ratelimit-remaining'?: string;
	'x-ratelimit-reset'?: string;
	'retry-after'?: string;
}

export interface FlaggedSession {
	sessionId: string;
	userId?: string;
	ip: string;
	riskScore: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	trustLevel?: 'low' | 'medium' | 'high';
	factors: string[];
	riskFactors?: string[];
	flaggedAt: number;
	isBlocked: boolean;
	isVpn?: boolean;
	countryCode?: string;
	city?: string;
	deviceId?: string;
}

export interface BlockedIP {
	ip: string;
	reason: string;
	blockedAt: number;
	expiresAt?: number;
}

export interface TrustedDevice {
	deviceId: string;
	userId: string;
	trustLevel: number;
	trustScore?: number;
	lastSeen: number;
	trustedAt?: number;
	platform?: string;
	userAgent?: string;
}

export interface TrustedDevicesResponse {
	devices: TrustedDevice[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export type HealthStatus = 'operational' | 'degraded' | 'down' | 'critical';

// Re-export SystemHealthStatus from sdk.ts to avoid duplicate definitions
export type { SystemHealthStatus } from './services/sdk';

export interface AlertsResponse {
	alerts: _SecurityAlert[];
	total: number;
}

export interface AbuseProtectionClientActions {
	verifyCaptcha: (token: string) => Promise<CaptchaVerifyResult>;
	getStatus: () => Promise<ProtectionStatusResponse>;
}

// ============================================
// Common Utility Types
// ============================================

/**
 * Base state interface for all security client plugins
 */
export interface BaseSecurityClientState {
	readonly isReady: boolean;
	readonly error: string | null;
	readonly lastUpdate: number;
}

/**
 * Base options interface for all security plugins
 */
export interface BaseSecurityPluginOptions {
	readonly enabled: boolean;
	readonly skipInDevelopment?: boolean;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
	readonly success: boolean;
	readonly data?: T;
	readonly error?: string;
	readonly code?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
	readonly page: number;
	readonly limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
	readonly items: readonly T[];
	readonly total: number;
	readonly page: number;
	readonly limit: number;
	readonly hasMore: boolean;
}

/**
 * Time-based filter
 */
export interface TimeFilter {
	readonly startTime?: number;
	readonly endTime?: number;
	readonly timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
}

/**
 * Sort options
 */
export interface SortOptions<T extends string = string> {
	readonly sortBy: T;
	readonly sortOrder: 'asc' | 'desc';
}

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
	readonly data: T;
	readonly expiresAt: number;
	readonly createdAt: number;
}

/**
 * Redis key prefix type
 * @see REDIS_KEY_PREFIXES in config.ts for the runtime constant
 */
export type RedisKeyPrefix =
	| 'abuse_protection:'
	| 'fraud_detection:'
	| 'geo_intelligence:'
	| 'rate_limit:'
	| 'security_analytics:'
	| 'session:'
	| 'device:'
	| 'ip:'
	| 'alert:'
	| 'block:'
	| 'security:';

/**
 * Fraud analysis types
 */
export interface FraudAnalysis {
	overall: {
		riskScore: number;
		trustLevel: 'low' | 'medium' | 'high';
		securityLevel: 'low' | 'medium' | 'high';
		requireCaptcha: boolean;
	};
	confidence: 'low' | 'medium' | 'high';
	device: {
		trustScore: number;
		isKnownDevice: boolean;
	};
	behavior: {
		trustScore: number;
		anomalies: string[];
	};
	geo: {
		trustScore: number;
		ipReputation: {
			isVpn: boolean;
		};
		locationTrusted: boolean;
	};
	recommendations: string[];
}
