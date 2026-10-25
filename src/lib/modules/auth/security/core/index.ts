/**
 * Core Module Barrel Export
 *
 * Exports all core utilities for the unified security plugin.
 */

// Helpers
export {
	getClientIp,
	isPrivateIp,
	isValidIp,
	isValidIPv4,
	isValidIPv6,
	fastHash,
	hashString,
	hashUserAgent,
	generateToken,
	generateShortId,
	generateRequestId,
	parseWindowToSeconds,
	formatDuration,
	toRad,
	clamp,
	shouldProcessPath,
	getBrowserFamily,
	getOsFamily,
	getIdentifier,
	isDevelopment,
	resetDevelopmentCache,
	setTrustProxy,
	type GetClientIpOptions,
	type PathMatchConfig
} from './helpers';

// Cache
export {
	CacheManager,
	PendingRequests,
	createRequestCache,
	registerCache,
	getAllCacheStats,
	clearAllCaches,
	pruneAllCaches,
	geoCache,
	deviceTrustCache,
	pathMatchCache,
	ipReputationCache,
	analysisCache,
	bypassTokenCache,
	type CacheStats
} from './cache';

// Risk Engine
export {
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
	getRiskLevelWeight,
	compareRiskLevels,
	DEFAULT_RISK_SCORES,
	type RiskLevel,
	type RiskFactor,
	type RiskThresholds,
	type RiskAssessment
} from './risk-engine';

// Circuit Breaker
export {
	CircuitBreaker,
	getCircuitBreaker,
	getAllCircuitBreakerStats,
	resetAllCircuitBreakers,
	bigDataCloudCircuit,
	type CircuitState,
	type CircuitBreakerOptions,
	type CircuitBreakerStats
} from './circuit-breaker';

// Context
export {
	createSecurityContext,
	createTestSecurityContext,
	getSecurityContext,
	attachSecurityContext,
	hasElevatedRisk,
	getContextSummary,
	type SecurityContext,
	type SecurityEvent,
	type SecurityEventType,
	type GeoData,
	type DeviceFingerprint,
	type BehaviorAnalysis,
	type IPReputation,
	type RateLimitInfo
} from './context';

// Feature
export {
	FEATURE_PRIORITY,
	registerFeature,
	getFeature,
	getAllFeatures,
	getEnabledFeatures,
	isFeatureEnabled,
	clearAllFeatureCaches,
	getAllFeatureCacheStats,
	createFeature,
	type FeaturePriority,
	type SecurityConfig,
	type SecurityFeature,
	type FeatureResult,
	type BlockingFeatureConfig,
	type RateLimitFeatureConfig,
	type RateLimitRule,
	type RateLimitTier,
	type CaptchaFeatureConfig,
	type GeoFeatureConfig,
	type DeviceFeatureConfig,
	type BehaviorFeatureConfig
} from './feature';
