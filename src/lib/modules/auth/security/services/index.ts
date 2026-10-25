/**
 * Security Services Exports
 *
 * Unified barrel export for all security services.
 */

// Redis service
export { getRedis, resetRedisClient } from './redis';

// Cache service
export {
	clearAnalyticsCache,
	getCacheStatistics,
	clearCachePrefix,
	getCachePrefixSize,
	pruneExpiredCache,
	type CacheStats,
	type CacheClearResult
} from './cache';

// Blocked IPs service
export {
	getBlockedIPs,
	blockIPAddress,
	unblockIPAddress,
	isIPBlocked,
	incrementBlockedIPHitCount,
	getBlockedIPCount,
	type BlockedIP,
	type BlockedIPsQuery,
	type BlockedIPsResponse
} from './blocked-ips';

// Helper functions
export {
	isValidIP,
	isValidIdentifier,
	sanitizeIdentifier,
	validatePagination,
	paginateArray,
	createSortComparator,
	getRiskLevel,
	getRiskLevelColor,
	unauthorizedResponse,
	jsonResponse,
	errorResponse,
	successResponse
} from './helpers';

// Abuse detection
export {
	detectSuspiciousActivity,
	getDefaultConfig as getAbuseProtectionConfig,
	DEFAULT_OPTIONS,
	getClientIp,
	isPrivateIp,
	determineSecurityLevel,
	clearConfigCache,
	type SecurityLevel,
	type SuspiciousActivityResult,
	type AbuseProtectionConfig
} from './abuse-detection';

// SDK
export {
	SecurityDashboardSDK,
	SecurityDashboardError,
	createSecurityDashboardConfig,
	COOKIE_PATTERNS,
	API_ENDPOINTS,
	type SecurityDashboardConfig,
	type AuthenticatedUser,
	type AuthenticatedContext,
	type DashboardData,
	type ApiStatus,
	type ActionResult,
	type CacheClearResult as SDKCacheClearResult,
	type SystemHealthStatus
} from './sdk';
