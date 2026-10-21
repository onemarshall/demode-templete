/**
 * Unified Security Plugin - Server Side
 *
 * Single entry point for all Better Auth security features.
 * Consolidates 5 separate plugins into one unified plugin.
 *
 * @example
 * ```ts
 * import { betterAuth } from 'better-auth';
 * import { securityPlugin } from '$lib/auth/security';
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     securityPlugin({
 *       captchaThreshold: 40,
 *       blockThreshold: 80,
 *       features: {
 *         geo: { apiKey: '...' },
 *         captcha: { provider: 'capjs', siteKey: '...' }
 *       }
 *     })
 *   ]
 * });
 * ```
 */

// ============================================
// Primary Export: Unified Security Plugin
// ============================================

export { securityPlugin, type SecurityPluginOptions } from './plugin';

// ============================================
// Core Module Exports
// ============================================

export {
	// Helpers
	getClientIp,
	isPrivateIp,
	isValidIp,
	fastHash,
	hashString,
	generateToken,
	generateShortId,
	generateRequestId,
	parseWindowToSeconds,
	formatDuration,
	shouldProcessPath,
	isDevelopment,
	setTrustProxy,
	// Cache
	CacheManager,
	createRequestCache,
	clearAllCaches,
	pruneAllCaches,
	getAllCacheStats,
	// Risk Engine
	calculateRiskScore,
	getRiskLevel,
	shouldBlock,
	shouldRequireCaptcha,
	assessRisk,
	createRiskFactor,
	geoRiskFactors,
	deviceRiskFactors,
	behaviorRiskFactors,
	blockingRiskFactors,
	positiveRiskFactors,
	getRiskLevelColor,
	DEFAULT_RISK_SCORES,
	// Circuit Breaker
	CircuitBreaker,
	getCircuitBreaker,
	getAllCircuitBreakerStats,
	// Context
	createSecurityContext,
	createTestSecurityContext,
	getSecurityContext,
	attachSecurityContext,
	hasElevatedRisk,
	getContextSummary,
	// Feature
	FEATURE_PRIORITY,
	registerFeature,
	getFeature,
	getAllFeatures,
	getEnabledFeatures,
	isFeatureEnabled,
	clearAllFeatureCaches,
	createFeature,
	// Types
	type CacheStats,
	type RiskLevel,
	type RiskFactor,
	type RiskThresholds,
	type RiskAssessment,
	type CircuitState,
	type CircuitBreakerOptions,
	type CircuitBreakerStats,
	type SecurityContext,
	type SecurityEvent,
	type SecurityEventType,
	type GeoData,
	type DeviceFingerprint as CoreDeviceFingerprint,
	type BehaviorAnalysis,
	type IPReputation as CoreIPReputation,
	type RateLimitInfo as CoreRateLimitInfo,
	type FeaturePriority,
	type SecurityConfig,
	type SecurityFeature,
	type FeatureResult,
	type BlockingFeatureConfig,
	type RateLimitFeatureConfig,
	type RateLimitRule as CoreRateLimitRule,
	type CaptchaFeatureConfig,
	type GeoFeatureConfig,
	type DeviceFeatureConfig,
	type BehaviorFeatureConfig,
	type PathMatchConfig
} from './core';

// ============================================
// Features Exports
// ============================================

export {
	blockingFeature,
	rateLimitFeature,
	captchaFeature,
	geoFeature,
	deviceFeature,
	behaviorFeature
} from './features';

// ============================================
// Hooks Exports
// ============================================

export {
	createBeforeHook,
	createAfterHook,
	createBlockedResponse,
	createCaptchaRequiredResponse,
	createRateLimitedResponse,
	isAuthSuccessPath,
	type CreateBeforeHookOptions,
	type CreateAfterHookOptions
} from './hooks';

// ============================================
// Endpoints Exports
// ============================================

export {
	createEndpoints,
	createHealthEndpoint,
	createStatusEndpoint,
	createCaptchaEndpoint,
	createMetricsEndpoint,
	createAlertsEndpoint,
	createBlockIpEndpoint,
	createUnblockIpEndpoint,
	createClearCacheEndpoint,
	isIpBlocked,
	getIpBlockInfo,
	type HealthResponse,
	type SecurityStatusResponse,
	type CaptchaVerifyResponse,
	type DashboardMetrics as EndpointDashboardMetrics,
	type DashboardAlert,
	type DashboardSession,
	type BlockIpResponse,
	type UnblockIpResponse,
	type ClearCacheResponse
} from './endpoints';

// ============================================
// Analytics Exports
// ============================================

export {
	AnalyticsCollector,
	createAnalyticsCollector,
	getDefaultCollector,
	recordSecurityEvent,
	recordBlock,
	recordCaptchaRequired,
	recordCaptchaPassed,
	recordCaptchaFailed,
	recordRateLimited,
	recordAuthSuccess,
	recordAuthFailure,
	calculateMetrics,
	getCachedMetrics,
	AlertManager,
	getDefaultAlertManager,
	processSecurityEvent,
	addAlert,
	getAlerts,
	acknowledgeAlert,
	type SecurityAnalyticsEvent,
	type CollectorConfig,
	type StorageAdapter,
	type TimeRange,
	type MetricsSummary,
	type RiskDistribution,
	type AlertSeverity,
	type SecurityAlert as AnalyticsSecurityAlert,
	type AlertThresholds,
	type AlertConfig
} from './analytics';

// ============================================
// Client Exports (re-exported for convenience)
// ============================================

export {
	securityClient,
	createSecurityClient,
	getSecurityClient,
	createSecurityStore,
	getSecurityStore,
	type SecurityClientPlugin,
	type StandaloneClientOptions,
	type SecurityState,
	type SecurityStore
} from './client';

// ============================================
// Type Exports (unified types)
// ============================================

export type {
	// Common utility types
	BaseSecurityClientState,
	BaseSecurityPluginOptions,
	ApiResponse,
	PaginationParams,
	PaginatedResponse,
	TimeFilter,
	SortOptions,
	CacheEntry,
	RedisKeyPrefix
} from './types';

// ============================================
// Legacy Constants (backward compatibility)
// ============================================

/** @deprecated Use `securityPlugin` instead */
export const SecurityPluginIds = Object.freeze({
	AUTH_ABUSE_PROTECTION_PLUGIN: 'abuse-protection',
	AUTH_FRAUD_DETECTION_PLUGIN: 'fraud-detection',
	AUTH_GEO_INTELLIGENCE_PLUGIN: 'geo-intelligence',
	AUTH_RATE_LIMITING_PLUGIN: 'rate-limiting',
	AUTH_SECURITY_ANALYTICS_PLUGIN: 'security-analytics',
	AUTH_SECURITY_PLUGIN: 'security'
} as const);

export type SecurityPluginId = (typeof SecurityPluginIds)[keyof typeof SecurityPluginIds];

// ============================================
// Legacy Type Exports (from old plugins)
// ============================================

export type {
	// Abuse protection types
	AbuseProtectionPluginOptions,
	CaptchaStatus,
	CaptchaVerifyResult,
	AbuseRateLimitStatus,
	BlockStatus,
	SecurityMetrics,
	SuspiciousActivityResult,
	ProtectionStatusResponse,
	SecurityLevel,
	AbuseProtectionClientState,
	AbuseProtectionClientActions,
	// Fraud detection types
	FraudDetectionPluginOptions,
	FraudAnalysis,
	SimpleFraudAnalysis,
	FraudCheckResult,
	DeviceFingerprint,
	BehaviorPattern,
	SecurityData,
	SecurityHeaders,
	// Geo intelligence types
	GeoIntelligencePluginOptions,
	GeoLocation,
	GeoIntelligenceClientState,
	IPReputation,
	VelocityCheck,
	// Rate limiting types
	RateLimitPluginOptions,
	RateLimitClientState,
	RateLimitRule,
	RateLimitTier,
	RateLimitStatus,
	RateLimitInfo,
	RateLimitHeaders,
	// Security analytics types
	SecurityAnalyticsPluginOptions,
	SecurityAlert,
	DashboardMetrics,
	FlaggedSession,
	BlockedIP,
	TrustedDevice,
	AlertsResponse,
	TrustLevel
} from './types';

// ============================================
// Configuration Exports
// ============================================

export {
	securityConfig,
	getTempBlockDelayMinutes,
	requiresCaptcha,
	clampRiskScore,
	getIPReputationPenalty,
	calculateIPReputationPenalty,
	REDIS_KEY_PREFIXES
} from './config';

export type {
	SecurityConfig as LegacySecurityConfig,
	AbuseConfig,
	FraudConfig,
	IPReputationConfig,
	GeoConfig,
	DeviceConfig,
	BehaviorConfig
} from './config';
