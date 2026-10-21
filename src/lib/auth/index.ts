/**
 * Auth module — public barrel entry point.
 *
 * Re-exports server, client, security, shared utilities, and feature modules.
 * Import from `$lib/auth` for the canonical surface area.
 */

// Server exports
export { auth, type Auth, type User, type Session } from './server';
export * from './server/email';

// Client exports
export { authClient } from './client';

// Security exports (unified security plugin)
export {
	securityPlugin,
	SecurityPluginIds,
	securityConfig,
	getTempBlockDelayMinutes,
	getRiskLevel,
	requiresCaptcha,
	shouldBlock,
	clampRiskScore,
	getIPReputationPenalty,
	calculateIPReputationPenalty,
	REDIS_KEY_PREFIXES
} from './security';

// Re-export specific security types with aliases to avoid conflicts
export type {
	RiskAssessment,
	PaginationParams,
	PaginatedResponse,
	TimeFilter,
	SortOptions,
	CacheEntry,
	RedisKeyPrefix,
	BaseSecurityClientState,
	BaseSecurityPluginOptions,
	AbuseProtectionPluginOptions,
	CaptchaStatus,
	CaptchaVerifyResult,
	AbuseRateLimitStatus,
	BlockStatus,
	SuspiciousActivityResult,
	ProtectionStatusResponse,
	SecurityLevel,
	AbuseProtectionClientState,
	AbuseProtectionClientActions,
	FraudDetectionPluginOptions,
	FraudAnalysis,
	SimpleFraudAnalysis,
	FraudCheckResult,
	DeviceFingerprint,
	BehaviorPattern,
	SecurityData,
	SecurityHeaders,
	GeoIntelligencePluginOptions,
	GeoLocation,
	GeoIntelligenceClientState,
	IPReputation,
	VelocityCheck,
	RateLimitPluginOptions,
	RateLimitClientState,
	RateLimitRule,
	RateLimitTier,
	RateLimitStatus,
	RateLimitInfo,
	RateLimitHeaders,
	SecurityAnalyticsPluginOptions,
	DashboardMetrics,
	FlaggedSession,
	BlockedIP,
	AlertsResponse,
	RiskLevel,
	TrustLevel,
	TimeRange,
	SecurityConfig,
	AbuseConfig,
	FraudConfig,
	IPReputationConfig,
	GeoConfig,
	DeviceConfig,
	BehaviorConfig
} from './security';

// Re-export analytics types with aliases to avoid conflicts
export type {
	TrustedDevice as AnalyticsTrustedDevice,
	SecurityAlert as AnalyticsSecurityAlert
} from './security/types';

// Re-export security ApiResponse with alias
export type { ApiResponse as SecurityApiResponse } from './security/types';

// Shared exports
export * from './shared/env';
export * from './shared/helpers';
export * from './shared/logger';
export * from './shared/utils';
// Use shared ApiResponse as the default
export type { ApiResponse } from './shared/types/api';

// Module exports (feature-based) - exclude conflicting types
export * from './modules/twoFactor';
export * from './modules/magicLink';
// Export sessions module functionality
// Export security module types with aliases to avoid conflicts
export type { SecurityAlert as ModuleSecurityAlert } from './modules/security';
export * from './modules/security';

// Component exports - check if components directory exists
// export * from './components';

// Re-export for backward compatibility
export type {
	TwoFactorState,
	PasswordFormData,
	TwoFactorVerificationFormData,
	SignUpFormData,
	SignInFormData
} from './shared/types';
