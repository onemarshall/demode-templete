/**
 * Unified Analytics Module
 *
 * Exports analytics functionality for the security plugin.
 */

// Collector
export {
	AnalyticsCollector,
	InMemoryStorageAdapter,
	createAnalyticsCollector,
	createRedisStorageAdapter,
	getDefaultCollector,
	resetDefaultCollector,
	recordSecurityEvent,
	recordBlock,
	recordCaptchaRequired,
	recordCaptchaPassed,
	recordCaptchaFailed,
	recordRateLimited,
	recordAuthSuccess,
	recordAuthFailure,
	seedSampleEvents,
	type SecurityAnalyticsEvent,
	type CollectorConfig,
	type StorageAdapter,
	type RedisStorageOptions
} from './collector';

// Metrics
export {
	calculateMetrics,
	getCachedMetrics,
	cacheMetrics,
	clearMetricsCache,
	getMetricsCacheStats,
	getTimeRangeMs,
	getTimeRangeStart,
	type TimeRange,
	type MetricsSummary,
	type RiskDistribution,
	type HourlyActivity,
	type TopFactor,
	type GeographicBreakdown,
	type DashboardMetrics
} from './metrics';

// Alerts
export {
	AlertManager,
	getDefaultAlertManager,
	resetDefaultAlertManager,
	processSecurityEvent,
	addAlert,
	getAlerts,
	acknowledgeAlert,
	type AlertSeverity,
	type SecurityAlert,
	type AlertThresholds,
	type AlertConfig
} from './alerts';
