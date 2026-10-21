/**
 * Remote Functions Directory Structure
 *
 * This directory contains all remote functions for the auth system.
 * Each module exports query and command functions for specific domains.
 *
 * Structure:
 * - security/ - Security analytics and operations (custom SDK)
 *
 * Usage:
 * ```typescript
 * import { getDashboardMetrics, signIn, getAllUsers } from '#lib/remote/index.js';
 *
 * // In a Svelte component with await
 * const metrics = await getDashboardMetrics('24h');
 *
 * // Or with the reactive pattern
 * const metricsQuery = getDashboardMetrics('24h');
 * // metricsQuery.loading, metricsQuery.error, metricsQuery.current
 * ```
 */

// Security analytics and operations (custom SDK)
export {
	// Queries
	getDashboardMetrics,
	getSecuritySessions,
	getTrustedDevices,
	getSystemHealth,
	getLiveThreats,
	getFlaggedSessions,
	getSecurityDashboard,
	// Commands
	blockIp,
	unblockIp,
	whitelistDevice,
	dismissSession,
	clearMetricsCache
} from './security/analytics.remote';

export {
	// Queries
	getBlockedIps,
	getSecurityConfig,
	// Commands
	allowlistIp,
	removeIpFromAllowlist,
	revokeDeviceTrust,
	updateDeviceTrustLevel,
	bulkBlockThreatIps,
	createSecurityIncident,
	updateSecurityThresholds
} from './security/operations.remote';
